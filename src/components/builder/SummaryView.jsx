'use client';
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { requestHostedPayment } from '@/lib/hostedPaymentRequest';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronDown, Clock3, Leaf, LockKeyhole, Pencil, ShoppingBag } from 'lucide-react';
import BuilderBrandHeader from './ui/BuilderBrandHeader';
import BariMeterFrame from './ui/BariMeterFrame';
import meterStyles from './ui/BariMeterFrame.module.css';
import SummarySelectionTray from './ui/SummarySelectionTray';
import trayStyles from './ui/SummaryTray.module.css';
import { fireGoldConfetti } from "../../lib/confetti";
import { isPreparationChoice, preparationLabel } from "../../lib/summaryPresentation";

function Icon({ src, size = "1.2em", style = {} }) {
    if (src && src.startsWith("/")) {
        return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", verticalAlign: "middle", ...style }} />;
    }
    return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{src}</span>;
}

/*
  The bowl is read, not admired: its job is to let someone confirm at a glance
  that their order is right. A realistic scattered pile looked better in
  isolation but made that harder, so ingredients sit in tidy rows — one row per
  layer of the build, in the order the salad is assembled.

    rows 0–1  ירקות     the actual base ingredients, back then front
    row 2     תוספות    protein, sauces and extras

  Base ingredients occupy two staggered rows; sauces and extras sit at the
  front. Splitting a crowded base keeps each actual ingredient large enough
  to recognize, without inventing additional food for the illustration.

  The rows also fit the bowl's geometry: the interior runs nearly full width
  through the middle and narrows toward the front, where the smaller sauces
  and extras belong.

  `y` and `width` are fractions of the art box, and were chosen so that each
  row sits inside the opening rather than over the decorated bowl body.
*/
// Coordinates are local to the independent 960x543 bowl layer. Nutrition is
// native flow content above it, so longer labels never displace the ingredients.
const BOWL_ROWS = [
    { y: 0.10, width: 0.70, maxSize: 26.0 },
    { y: 0.25, width: 0.78, maxSize: 22.0 },
    { y: 0.38, width: 0.43, maxSize: 14.0 },
];
const BOWL_GAP = 1.5;         // % of bowl width, between icons when they fit
// Each icon advances at least this fraction of its own width, so no ingredient
// is ever more than ~40% covered by the next one.
const BOWL_MIN_STEP = 0.62;

const BOWL_TIERS = {
    veggies: 0, t_fillings: 0,
    protein: 1, t_protein: 1,
    sauces: 1, finish: 1, upgrade: 1, t_sauces: 1, t_upgrade: 1, wrap: 1,
};

/** Falls back to tags for items rebuilt from a past order without step meta. */
function tierOf(item) {
    const s = item._meta?.stepId;
    if (s && s in BOWL_TIERS) return BOWL_TIERS[s];
    const t = item.tags || [];
    if (t.some(x => ["base", "green", "fresh", "red", "orange", "purple", "yellow", "white", "brown"].includes(x))) return 0;
    return 1;
}

/**
 * Lays out one row: icon size and the distance between centres, both as a % of
 * the bowl's width.
 *
 * Icons stay at a readable size and OVERLAP when the row is crowded, rather
 * than all shrinking — eleven vegetables shrunk to fit came out at ~23px,
 * which is unreadable, where overlapping keeps them at ~42px. Overlap is
 * capped at ~40% of an icon, and only past that does the size come down.
 *
 * With room to spare the icons simply spread out and never touch.
 */
function bowlRowLayout(row, count) {
    if (!count) return { size: 0, step: 0 };
    const W = row.width * 100;

    // Largest size at which `count` icons still fit at the tightest allowed
    // overlap; capped by the row's own maximum.
    const size = Math.max(3, Math.min(row.maxSize, W / (1 + BOWL_MIN_STEP * (count - 1))));
    if (count === 1) return { size, step: 0 };

    // Spread to fill the row if there is room, but never further apart than
    // one icon plus a gap.
    const step = Math.min(size + BOWL_GAP, (W - size) / (count - 1));
    return { size, step };
}

// ─── Pickup slot generator ─────────────────────────────────────
/**
 * Now a thin wrapper over lib/shopHours, which is also what the SERVER checks
 * against. It used to carry the opening hours itself, as four hard-coded
 * comparisons — `day === 6`, `h >= 16`, `sh >= 21`, `day === 5 && sh >= 16` —
 * that no other part of the app could see. Three separate constants had to
 * agree, one of them (21:00) had nothing to do with the shop's real hours, and
 * the server validated none of it: a pickup time went from the request body
 * straight into the database.
 *
 * Returns null rather than an empty array when there is nothing available,
 * because the callers already treat null as "closed".
 */
function generatePickupSlots(now = new Date()) {
    const slots = pickupSlots(now);
    return slots.length ? slots : null;
}
import { STEPS, BASE } from "../../data/salad-data.js";
import { effectiveItemPrice } from "../../lib/menuConfig";
import { findDiscount, discountAmount } from "../../lib/discounts";
import OrderSealScreen from "./ui/OrderSealScreen.jsx";
import BariButton from "../ui/bari/BariButton";
import BariBadge from "../ui/bari/BariBadge";
import BariModal from "../ui/bari/BariModal";
import BariPlaque, { BariPlaqueKeyframes } from "../ui/bari/BariPlaque";
import { PLAQUE } from "../ui/bari/plaqueGeometry";
import { isSupabaseDemoMode } from "../../lib/supabase";
import { getAccessToken } from "../../lib/auth";
import { requiresHostedPayment } from "../../lib/customerPayment";
import {
    claimOrderSubmission,
    clearOrderSubmission,
    markOrderSubmissionPaymentPending,
    orderSubmissionCartIntent,
    orderSubmissionIntent,
    restoreOrderSubmission,
} from "../../lib/orderSubmission";
import {
    mergePickupCapacity,
    noPickupMessage,
    pickupSlots,
    reconcilePickupChoice,
    resolvePickupSelection,
    shopDateKey,
} from "../../lib/shopHours";
import { useHistoryBackedOverlay } from "../../hooks/useHistoryBackedOverlay";
import { useShopStatus } from "../../lib/useShopStatus";
import { estimateNutritionRange } from "../../lib/nutritionSimulator";

const DEMO_MODE = isSupabaseDemoMode();
const SHOW_FAILURE_TEST = DEMO_MODE && process.env.NODE_ENV !== "production";

function freshPaymentKey() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function SummaryView({ sels, total, all, comboBadges, notes, setNotes, onBack, onEdit, onNewOrder, checkoutDraft, setCheckoutDraft, base = BASE, productType = 'salad', sizeLabel = null, sizeMl = 1000 }) {
    const router = useRouter();
    // Schedule + the live staff override. The server checks this again at POST
    // /api/orders and is the authority; this is so the screen stops pretending.
    const shop = useShopStatus();
    const pickupAvailability = usePickupAvailability(shop);
    const [showMixing, setShowMixing] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [notesOpen, setNotesOpen] = useState(false);
    const notesTriggerRef = useRef(null);
    const { openOverlay: openNotes, closeOverlay: closeNotes } = useHistoryBackedOverlay({
        id: "summary-notes",
        open: notesOpen,
        onOpenChange: setNotesOpen,
    });
    const [notesFocused, setNotesFocused] = useState(false);
    const [highlightedStep, setHighlightedStep] = useState(null);
    const pickupTime = checkoutDraft.pickupTime;
    const setPickupTime = useCallback((value) => {
        setCheckoutDraft(current => ({ ...current, pickupTime: value }));
    }, [setCheckoutDraft]);
    const [pickupSelectionNotice, setPickupSelectionNotice] = useState("");
    const pickupSectionRef = useRef(null);
    const summarySelectionsRef = useRef(null);
    const effectivePickupTime = resolvePickupSelection(pickupTime, pickupAvailability.slots, shop.open);
    const paymentChoice = checkoutDraft.paymentChoice; // 'now' | 'pickup' — demo mode only
    const setPaymentChoice = useCallback((value) => {
        setCheckoutDraft(current => ({ ...current, paymentChoice: value }));
    }, [setCheckoutDraft]);
    /**
     * The accepted order — null until the server says it recorded one.
     *
     * THIS IS THE GATE. The seal screen renders nothing about the order unless
     * this is non-null, and it is set on exactly one line below: after the
     * response came back ok, was not a payment failure, and carried an id or an
     * order number. A failed or unrecorded order cannot produce a confirmation
     * because there is no data to build one from.
     *
     * It replaces an `ordered` boolean coordinated with two refs against the
     * animation's completion. Same guarantee, but carried by the data instead of
     * by three pieces of state agreeing with each other — and the contents are
     * whatever the SERVER recorded, never what was chosen on this screen.
     */
    const [acceptedOrder, setAcceptedOrder] = useState(null);
    const [paymentFailed, setPaymentFailed] = useState(false);
    const [failedOrderNum, setFailedOrderNum] = useState(null);
    const promoInput = checkoutDraft.promoInput;
    const setPromoInput = useCallback((value) => {
        setCheckoutDraft(current => ({ ...current, promoInput: value }));
    }, [setCheckoutDraft]);
    const appliedDiscount = checkoutDraft.appliedDiscount;
    const setAppliedDiscount = useCallback((value) => {
        setCheckoutDraft(current => ({ ...current, appliedDiscount: value }));
    }, [setCheckoutDraft]);
    const [promoError, setPromoError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [autoDiscount, setAutoDiscount] = useState(null); // standing "tag" discount for signed-in customers
    const [priceReconfirmation, setPriceReconfirmation] = useState(null);
    const [hasPendingPayment, setHasPendingPayment] = useState(false);
    const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
    // Once the order exists, retries must reopen payment for that same order.
    // Re-running POST /api/orders would create a second kitchen order.
    const pendingPaymentRef = useRef(null);
    // Before the order exists, ambiguous network failures must retry the same
    // server submission rather than create another kitchen ticket. The matching
    // record is also kept in sessionStorage by lib/orderSubmission so a reload
    // within the short retry window can recover the same key.
    const orderSubmissionRef = useRef(null);
    // React state is not a synchronous mutex: two taps in one event-loop turn
    // can both observe `submitting === false`. This ref closes before any state
    // update or await, so only one request can enter the order-creation path.
    const submitLockRef = useRef(false);
    const recoveryCartIntent = useMemo(() => orderSubmissionCartIntent({
        items: all,
        size: base,
        productType,
        notes,
    }), [all, base, notes, productType]);

    // A hard reload reconstructs the ingredient draft but loses SummaryView's
    // pickup/payment React state. Recover the exact in-flight request for this
    // cart, or the already-created order's payment identity, from this tab's
    // short-lived session record. No request is sent automatically.
    useEffect(() => {
        const recovered = restoreOrderSubmission(recoveryCartIntent);
        orderSubmissionRef.current = recovered;
        pendingPaymentRef.current = recovered?.pendingPayment ?? null;

        const timer = window.setTimeout(() => {
            if (!recovered) {
                setHasPendingPayment(false);
                setHasPendingSubmission(false);
                return;
            }
            if (recovered.pendingPayment) {
                setHasPendingPayment(true);
                setHasPendingSubmission(false);
                setSubmitError("ההזמנה כבר נקלטה. לחצו כדי להמשיך לאותו תשלום.");
            } else {
                setHasPendingPayment(false);
                setHasPendingSubmission(true);
                setSubmitError("מצאנו ניסיון הזמנה קודם. לחצו כדי לבדוק אם ההזמנה נקלטה.");
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [recoveryCartIntent]);

    // Capacity and the five-minute window are external state. If they invalidate
    // an explicit choice, clear the stored value as well as the rendered one so
    // a later refresh cannot silently snap back to the old time. This effect is
    // intentionally the synchronization point for that external state.
    /* eslint-disable react-hooks/set-state-in-effect -- live slot capacity invalidates controlled checkout state */
    useEffect(() => {
        const reconciled = reconcilePickupChoice(
            pickupTime,
            pickupSelectionNotice,
            pickupAvailability.slots,
            shop.open,
        );
        if (reconciled.value === pickupTime && reconciled.notice === pickupSelectionNotice) return;
        setPickupTime(reconciled.value);
        setPickupSelectionNotice(reconciled.notice);
    }, [pickupAvailability.slots, pickupSelectionNotice, pickupTime, setPickupTime, shop.open]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const selectPickupTime = (nextTime) => {
        setPickupTime(nextTime);
        setPickupSelectionNotice("");
    };

    // A hosted payment page may be left with the browser Back button. When the
    // build page is restored from bfcache, React state otherwise preserves the
    // full-screen "sending" seal forever. The order already exists at this
    // point, so recover the existing payment retry — never POST /api/orders
    // again. A hard reload follows the same rule using the short-lived,
    // order-scoped session record restored above.
    useEffect(() => {
        const recoverFromPaymentPage = (event) => {
            if (!event.persisted || !pendingPaymentRef.current) return;
            submitLockRef.current = false;
            setSubmitting(false);
            setShowMixing(false);
            setHasPendingPayment(true);
            setSubmitError("חזרתם מעמוד התשלום. ההזמנה כבר נקלטה — לחצו כדי לפתוח שוב את עמוד התשלום.");
        };
        window.addEventListener('pageshow', recoverFromPaymentPage);
        return () => window.removeEventListener('pageshow', recoverFromPaymentPage);
    }, []);

    // Signed-in customers may have a standing discount assigned to their account
    // ("tag", e.g. an approved municipal worker's 10%). Fetch it so the shown
    // total matches what the server will charge; the server re-applies it anyway.
    useEffect(() => {
        let cancelled = false;
        getAccessToken().then(token => {
            if (!token) return;
            fetch('/api/my/discount', { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (!cancelled && d?.discount) setAutoDiscount(d.discount); })
                .catch(() => {});
        }).catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const highlightStep = (item) => {
        const step = STEPS.find(s => (sels[s.id] || []).some(i => i.id === item.id));
        if (!step) return;
        setHighlightedStep(step.id);
        setTimeout(() => setHighlightedStep(null), 900);
    };
    const MAX_NOTES_LENGTH = 200;
    const extras = all.filter(i => effectiveItemPrice(i.id, i.price) > 0);
    // Apply whichever discount is larger — the customer's standing tag or a
    // typed promo code — never both stacked (mirrors the server's rule).
    const autoAmount = discountAmount(total, autoDiscount);
    const typedAmount = discountAmount(total, appliedDiscount);
    const effectiveDiscount = typedAmount > autoAmount ? appliedDiscount : autoDiscount;
    const discAmount = Math.max(autoAmount, typedAmount);
    const finalTotal = total - discAmount;
    // If the server reports a changed authoritative quote, show that amount
    // and require one more explicit tap before creating the order.
    const checkoutTotal = priceReconfirmation?.total ?? finalTotal;
    // Confirmed-closed: we heard back from the server and it said no.
    const shopBlocked = !shop.open && (shop.live || shop.override === 'closed');
    // During ordinary opening hours an order needs one of the offered slots.
    // A manual open override is the exception: staff may coordinate pickup at
    // the register when the normal schedule has no slots at all.
    const pickupHasAvailableSlot = pickupAvailability.slots?.some(slot => !slot.full) ?? false;
    const pickupCheckingMoreSlots = pickupAvailability.slots !== null
        && !pickupHasAvailableSlot
        && pickupAvailability.slots.some(slot => slot.capacityPending);
    const canCoordinatePickupAtCounter =
        shop.reason === 'override_open' && pickupAvailability.localSlots === null;
    const pickupBlocked = shop.open && !canCoordinatePickupAtCounter && !effectivePickupTime;
    const recoveryPending = hasPendingPayment || hasPendingSubmission;
    const requestLocked = submitting || recoveryPending;
    const checkoutLocked = requestLocked || Boolean(priceReconfirmation);
    const paymentConfigurationBlocked = !DEMO_MODE
        && shop.paymentMode === 'unavailable'
        && checkoutTotal > 0;
    const hostedPaymentExpected = !DEMO_MODE && shop.paymentMode === 'hosted' && checkoutTotal > 0;
    const pickupPaymentExpected = !DEMO_MODE && shop.paymentMode === 'pickup' && checkoutTotal > 0;
    const hostedProviderName = shop.paymentProvider === 'hyp' ? 'Hyp' : 'ספק הסליקה';
    const defaultSubmitLabel = hostedPaymentExpected
        ? "המשך לתשלום מאובטח"
        : pickupPaymentExpected
            ? "שלחו הזמנה · תשלום באיסוף"
            : checkoutTotal === 0
                ? "אישור הזמנה"
                : "שלח הזמנה";
    const pickupBlockLabel = pickupAvailability.slots === null || pickupCheckingMoreSlots
        ? "בודקים שעות איסוף"
        : pickupHasAvailableSlot
            ? "בחרו שעת איסוף"
            : "אין שעה פנויה";
    const pickupFooterLabel = effectivePickupTime
        ?? (shopBlocked
            ? "סגור כרגע"
            : canCoordinatePickupAtCounter
                ? "בתיאום בדלפק"
                : pickupBlockLabel);
    const pickupShortcutLabel = effectivePickupTime
        ?? (shopBlocked ? "סגור כרגע"
            : canCoordinatePickupAtCounter ? "בתיאום"
                : pickupAvailability.slots === null || pickupCheckingMoreSlots ? "בודקים…"
                    : pickupHasAvailableSlot ? "בחרו שעה" : "אין זמינות");
    const focusSummarySelections = () => {
        const selections = summarySelectionsRef.current;
        if (!selections) return;
        selections.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        window.requestAnimationFrame(() => selections.focus({ preventScroll: true }));
    };
    const focusPickupPicker = () => {
        const picker = pickupSectionRef.current;
        if (!picker) return;
        picker.scrollIntoView({ block: 'center' });
        window.requestAnimationFrame(() => picker.focus({ preventScroll: true }));
    };
    const leaveSummary = () => {
        // ORDER_TOTAL_CHANGED is a conclusive rejection: no order exists yet.
        // If the customer prefers to edit instead of confirming the new quote,
        // the corrected retry record can be safely discarded.
        if (priceReconfirmation && orderSubmissionRef.current) {
            clearOrderSubmission(orderSubmissionRef.current);
            orderSubmissionRef.current = null;
            setPriceReconfirmation(null);
        }
        onBack();
    };
    const applyPromo = () => {
        const d = findDiscount(promoInput);
        setAppliedDiscount(d);
        setPromoError(d ? "" : "קוד לא תקף");
    };
    const grouped = STEPS.map(s => ({ s, items: sels[s.id] || [] })).filter(g => g.items.length > 0);
    const nutritionEstimate = useMemo(
        () => productType === 'salad' ? estimateNutritionRange(all, sizeMl) : null,
        [all, productType, sizeMl],
    );

    const preparationChoices = all.filter(isPreparationChoice);
    // Instructions remain in the order, but are not pictured as edible food.
    const bowlRows = useMemo(() => {
        const food = all.filter(it => !isPreparationChoice(it));
        const base = food.filter(it => tierOf(it) === 0);
        const split = Math.ceil(base.length / 2);
        return [base.slice(0, split), base.slice(split), food.filter(it => tierOf(it) === 1)];
    }, [all]);

    const handleNotesChange = (e) => {
        const value = e.target.value;
        if (value.length <= MAX_NOTES_LENGTH) {
            setNotes(value);
            setNotesError("");
        } else {
            setNotesError(`מקסימום ${MAX_NOTES_LENGTH} תווים`);
        }
    };


    const failSubmit = useCallback((message) => {
        submitLockRef.current = false;
        setShowMixing(false);          // stop the sequence rather than let it "complete"
        setSubmitting(false);
        setSubmitError(message);
        navigator.vibrate?.([30, 40, 30]);
    }, []);

    const launchPendingPayment = async (pendingPayment) => {
        const { response, payload, networkError } = await requestHostedPayment(pendingPayment);

        if (payload?.paymentUrl) {
            window.location.href = payload.paymentUrl;
            return;
        }
        if (payload?.code === 'PAYMENT_ALREADY_SETTLED') {
            router.replace(`/order/${encodeURIComponent(pendingPayment.orderId)}?payment=success`);
            return;
        }
        if (payload?.code === 'PAYMENT_NOT_REQUIRED') {
            router.replace(`/order/${encodeURIComponent(pendingPayment.orderId)}`);
            return;
        }
        if (payload?.code === 'PAYMENT_VERIFICATION_PENDING') {
            router.replace(`/order/${encodeURIComponent(pendingPayment.orderId)}?payment=verifying`);
            return;
        }
        if (payload?.retryWithNewKey) {
            // The server only permits a new key after the old initialization
            // was closed before a checkout page could be returned.
            pendingPayment.idempotencyKey = freshPaymentKey();
            if (orderSubmissionRef.current) {
                orderSubmissionRef.current = markOrderSubmissionPaymentPending(
                    orderSubmissionRef.current,
                    pendingPayment,
                );
            }
        }

        const message = networkError?.name === 'AbortError'
            ? "ההזמנה נקלטה, אבל פתיחת התשלום נמשכה זמן רב מדי. לחצו שוב כדי לנסות את אותו תשלום."
            : response?.status === 202
                ? "ההזמנה נקלטה והתשלום עדיין נפתח. המתינו רגע ולחצו שוב."
                : "ההזמנה נקלטה אך התשלום לא נפתח. לחצו שוב כדי לנסות, או פנו לקופה עם מספר ההזמנה "
                    + (pendingPayment.orderNum ?? "");
        failSubmit(message);
    };

    const submitOrder = async (choiceOverride) => {
        if (submitLockRef.current) return;
        submitLockRef.current = true;  // close synchronously before state/await
        const choice = choiceOverride ?? paymentChoice;
        const recoveredSubmission = orderSubmissionRef.current?.requestBody
            ? orderSubmissionRef.current
            : null;
        const isFailureTest = !recoveredSubmission && checkoutTotal > 0 && choice === "fail";
        setSubmitting(true);
        setSubmitError("");
        setAcceptedOrder(null);
        if (navigator.vibrate) navigator.vibrate(isFailureTest ? [30, 40, 30] : [15, 40, 30]);
        if (!isFailureTest) setShowMixing(true);

        // Once the order exists, skip order creation entirely and retry the
        // idempotent payment-page request restored from memory/sessionStorage.
        if (pendingPaymentRef.current) {
            await launchPendingPayment(pendingPaymentRef.current);
            return;
        }

        let submission = recoveredSubmission;
        let orderBody = recoveredSubmission?.requestBody ?? null;
        let pickupForSubmit = typeof orderBody?.pickupTime === 'string'
            ? orderBody.pickupTime
            : null;

        if (!orderBody) {
            // Re-resolve at click time as well as at render time. Capacity can
            // change between two React commits; never send a hidden expired/full
            // value just because the reconciliation UI has not painted yet.
            pickupForSubmit = resolvePickupSelection(
                pickupTime,
                pickupAvailability.slots,
                shop.open,
            );
            if (shop.open && !canCoordinatePickupAtCounter && !pickupForSubmit) {
                failSubmit(
                    pickupTime
                        ? "זמן האיסוף השתנה. בחרו שעה פנויה ונסו שוב."
                        : pickupAvailability.slots === null || pickupCheckingMoreSlots
                            ? "זמני האיסוף עדיין מתעדכנים. המתינו רגע ונסו שוב."
                            : pickupHasAvailableSlot
                                ? "בחרו שעת איסוף ונסו שוב."
                                : "אין כרגע שעת איסוף פנויה.",
                );
                return;
            }

            orderBody = {
                items: all.map(i => ({ id: i.id, he: i.he, icon: i.icon, price: effectiveItemPrice(i.id, i.price || 0) })),
                total: checkoutTotal,
                pickupTime: pickupForSubmit,
                notes,
                size: base,
                productType,
                // Only the customer's explicitly applied code belongs to the
                // request intent. A standing account discount is server-owned.
                ...(appliedDiscount?.code ? { discountCode: appliedDiscount.code } : {}),
                ...(DEMO_MODE ? { paymentChoice: choice } : {}),
            };
        }

        // A hung request never rejects. Persist the exact request before fetch;
        // a hard reload can then retry the same key/body before applying today's
        // mutable opening, pickup and pricing state.
        const ctl = new AbortController();
        const timeoutId = setTimeout(() => ctl.abort(), 20000);

        try {
            if (!submission) {
                const orderIntent = orderSubmissionIntent(orderBody);
                submission = claimOrderSubmission(
                    orderIntent,
                    null,
                    {
                        randomUUID: freshPaymentKey,
                        requestBody: orderBody,
                        cartIntent: recoveryCartIntent,
                    },
                );
                orderSubmissionRef.current = submission;
            }
            setHasPendingSubmission(true);

            // Signed-in customers get the order linked to their account (order
            // history on /orders); guests order exactly the same without it.
            const token = await getAccessToken().catch(() => null);
            const res = await fetch('/api/orders', {
                method: 'POST',
                signal: ctl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ ...orderBody, submissionKey: submission.submissionKey }),
            });
            clearTimeout(timeoutId);
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const priceChanged = res.status === 409
                    && data?.code === 'ORDER_TOTAL_CHANGED'
                    && Number.isSafeInteger(data.expectedTotal)
                    && data.expectedTotal >= 0;
                if (priceChanged) {
                    // The server has not created an order. Keep the same
                    // idempotency key, persist only its corrected quote, update
                    // the visible total, and wait for a second customer tap.
                    const correctedBody = { ...orderBody, total: data.expectedTotal };
                    submission = claimOrderSubmission(
                        orderSubmissionIntent(correctedBody),
                        submission,
                        {
                            requestBody: correctedBody,
                            cartIntent: recoveryCartIntent,
                        },
                    );
                    orderSubmissionRef.current = submission;
                    setHasPendingSubmission(false);

                    const serverDiscount = data.discount;
                    if (
                        serverDiscount
                        && typeof serverDiscount.code === 'string'
                        && (serverDiscount.type === 'percent' || serverDiscount.type === 'amount')
                        && typeof serverDiscount.value === 'number'
                    ) {
                        setAutoDiscount(
                            serverDiscount.code === appliedDiscount?.code
                                ? null
                                : serverDiscount,
                        );
                    } else {
                        setAutoDiscount(null);
                    }
                    setPriceReconfirmation({ total: data.expectedTotal });
                    failSubmit(typeof data.error === 'string'
                        ? data.error
                        : `המחיר עודכן ל־₪${data.expectedTotal}. עברו על הסכום ולחצו שוב לאישור.`);
                    return;
                }

                if (res.status === 409 && data?.code === 'PICKUP_SLOT_FULL') {
                    // The database rejected this order before creating either
                    // the order or its idempotency claim. Drop the stale choice
                    // and fetch the authoritative allocation ledger now rather
                    // than waiting for the next minute-long refresh.
                    clearOrderSubmission(submission);
                    orderSubmissionRef.current = null;
                    setHasPendingSubmission(false);
                    setPriceReconfirmation(null);
                    pickupAvailability.markFull(pickupForSubmit);
                    setPickupTime(null);
                    setPickupSelectionNotice(
                        typeof data.error === 'string'
                            ? data.error
                            : 'שעת האיסוף התמלאה ממש עכשיו. בחרו שעה אחרת.',
                    );
                    pickupAvailability.refresh();
                    failSubmit(
                        typeof data.error === 'string'
                            ? data.error
                            : 'שעת האיסוף התמלאה ממש עכשיו. בחרו שעה אחרת.',
                    );
                    window.requestAnimationFrame(focusPickupPicker);
                    return;
                }

                // A definite client rejection means this key did not create this
                // intent (the server checks its ledger first). 429/5xx remain
                // ambiguous because a previous request may already have won.
                const definitiveRejection = res.status >= 400 && res.status < 500 && res.status !== 429;
                if (definitiveRejection) {
                    clearOrderSubmission(submission);
                    orderSubmissionRef.current = null;
                    setHasPendingSubmission(false);
                    setPriceReconfirmation(null);
                }
                failSubmit(
                    res.status === 409 && typeof data?.error === 'string'
                        ? data.error
                        : res.status === 429
                            ? "נשלחו יותר מדי הזמנות. נסו שוב בעוד רגע."
                            : "לא הצלחנו לשלוח את ההזמנה. נסו שוב."
                );
                return;
            }
            if (data?.paymentFailed) {
                submitLockRef.current = false;
                setShowMixing(false);
                setSubmitting(false);
                setFailedOrderNum(data.orderNum ?? null);
                setPaymentFailed(true);
                clearOrderSubmission(submission);
                orderSubmissionRef.current = null;
                setHasPendingSubmission(false);
                setPriceReconfirmation(null);
                return;
            }
            // No id/order number means nothing was conclusively recorded. Keep
            // the recovery record because this malformed success is ambiguous.
            if (!data?.id && !data?.orderNum) {
                setHasPendingSubmission(true);
                failSubmit("לא הצלחנו לאמת שההזמנה נקלטה. נסו שוב.");
                return;
            }

            // Online payment: persist both identities before the first payment
            // request. Only the server's explicit pending state may launch a
            // hosted checkout; a zero-total order goes straight to confirmation.
            if (data.id && !data.demo && requiresHostedPayment(data.paymentStatus)) {
                const pendingPayment = {
                    orderId: data.id,
                    orderNum: data.orderNum ?? null,
                    idempotencyKey: freshPaymentKey(),
                };
                orderSubmissionRef.current = markOrderSubmissionPaymentPending(
                    submission,
                    pendingPayment,
                );
                pendingPaymentRef.current = pendingPayment;
                setHasPendingSubmission(false);
                setHasPendingPayment(true);
                setPriceReconfirmation(null);
                await launchPendingPayment(pendingPayment);
                return;
            }

            // Pay-at-pickup/demo reached a definitive on-page confirmation, so
            // this short-lived submission recovery record has finished its job.
            clearOrderSubmission(submission);
            orderSubmissionRef.current = null;
            setHasPendingSubmission(false);
            setPriceReconfirmation(null);
            submitLockRef.current = false;
            setSubmitting(false);
            setAcceptedOrder({
                total: typeof data.total === 'number'
                    ? data.total
                    : typeof orderBody.total === 'number'
                        ? orderBody.total
                        : checkoutTotal,
                items: Array.isArray(orderBody.items) ? orderBody.items.length : all.length,
                pickupTime: pickupForSubmit,
                orderNum: data.orderNum ?? null,
                orderId: data.id ?? null,
                paymentStatus: data.paymentStatus ?? null,
                badges: comboBadges,
            });
        } catch (err) {
            clearTimeout(timeoutId);
            if (submission) setHasPendingSubmission(true);
            failSubmit(err?.name === 'AbortError'
                ? "השליחה נמשכה זמן רב מדי. בדקו את החיבור ונסו שוב."
                : "אין חיבור לרשת. בדקו את החיבור ונסו שוב.");
        }
    };

    if (paymentFailed) return <PaymentFailedScreen orderNum={failedOrderNum} onRetry={() => setPaymentFailed(false)} />;

    return (
        <div style={S.root}>
            <div style={S.bg} /><div style={S.bgRay} />

            {/* Seals the order and then becomes the confirmation in place — one
                component, so there is no handoff to get wrong. It renders
                nothing about the order until `order` is non-null. */}
            {showMixing && (
                <OrderSealScreen order={acceptedOrder} onNewOrder={onNewOrder || onBack} />
            )}

            <div style={S.main}>
                <BuilderBrandHeader variant="summary">
                        <button
                            type="button"
                            aria-label="חזרה לעריכת ההזמנה"
                            disabled={requestLocked}
                            onClick={leaveSummary}
                        ><ArrowRight size={18} aria-hidden="true" /><span>עריכה</span></button>
                        <h1>ההזמנה שלכם</h1>
                        <div style={S.pricePill} aria-label={`סך ההזמנה ${checkoutTotal} שקלים`}>
                            <span style={S.priceV}>{checkoutTotal}</span>
                            <span style={S.priceS}>₪</span>
                        </div>
                </BuilderBrandHeader>

                <div style={S.content}>
                    {/* Layered bowl — hero */}
                    <div style={S.sumBowlWrap}>
                        <button type="button" className={trayStyles.meterJump}
                            aria-controls="summary-selections" onClick={focusSummarySelections}>
                            <span>{all.length} בחירות</span>
                            <span>לבדיקת הבחירות <ChevronDown size={16} aria-hidden="true" /></span>
                        </button>
                        <BariMeterFrame bowl={bowlRows.map((items, t) => {
                                if (!items.length) return null;
                                const row = BOWL_ROWS[t];
                                const { size, step } = bowlRowLayout(row, items.length);
                                const total = size + step * (items.length - 1);
                                const startX = 50 - total / 2;   // centred, in % of the bowl
                                return (
                                    <div key={t} style={{ position: "absolute", inset: 0, zIndex: t + 1, pointerEvents: "none" }}>
                                        {items.map((it, i) => (
                                            <button
                                                key={it.id}
                                                type="button"
                                                className={meterStyles.ingredient}
                                                onClick={() => highlightStep(it)}
                                                aria-label={`הדגש את ${it.he} ברשימת הבחירות`}
                                                style={{
                                                    position: "absolute",
                                                    // RTL: the first ingredient sits on the RIGHT and
                                                    // each next one tucks in behind it to the left,
                                                    // so the row fans the way the text reads.
                                                    left: `${(startX + (items.length - 1 - i) * step).toFixed(2)}%`,
                                                    top: `${(row.y * 100).toFixed(2)}%`,
                                                    width: `${size.toFixed(2)}%`,
                                                    aspectRatio: "1",
                                                    transform: "translateY(-50%)",
                                                    zIndex: items.length - i,
                                                    cursor: "pointer",
                                                    padding: 0,
                                                    border: 0,
                                                    background: "transparent",
                                                    pointerEvents: "auto",
                                                    animation: `popBounce 0.3s ease ${(t * 120 + i * 35)}ms both`,
                                                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
                                                }}
                                            >
                                                <Icon src={it.icon} size="100%" style={{ display: "block" }} />
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}>
                            <CompositionStats all={all} estimate={nutritionEstimate} />
                        </BariMeterFrame>
                        {preparationChoices.length > 0 && (
                            <div style={S.preparationNote}>
                                <span style={{ color: "#f0d060", fontWeight: 800 }}>הנחיות הכנה</span>
                                <span>{preparationChoices.map(preparationLabel).join(" · ")}</span>
                            </div>
                        )}
                        {nutritionEstimate && (
                            <p style={S.nutritionDisclaimer}>
                                הערכה לפי מנות טיפוסיות · הכמויות וההכנה בפועל משתנות
                            </p>
                        )}
                        {nutritionEstimate && (
                            <details style={S.nutritionDetails}>
                                <summary style={S.nutritionSummary}>איך BariMeter מחשב את הטווח?</summary>
                                <div style={S.nutritionExplanation}>
                                    הסימולציה משלבת את גודל הקערה עם מנות טיפוסיות של המרכיבים שבחרתם.
                                    {nutritionEstimate.drivers.length > 0 && (
                                        <> הגורמים המשפיעים ביותר כאן: <strong style={{ color: "#edd87e" }}>{nutritionEstimate.drivers.join(" · ")}</strong>.</>
                                    )}
                                    {nutritionEstimate.coverage < 100 && <> חלק מהבחירות עדיין אינן כלולות במודל.</>}
                                </div>
                            </details>
                        )}
                    </div>

                    {comboBadges.length > 0 && (
                        <div style={S.comboBanner}>
                            <div style={S.comboBannerTitle}>🏆 שילובים שנבחרו</div>
                            {/* Emblems, not pills. Each emblem already contains its
                                Hebrew title in the artwork, so `he` goes to alt
                                rather than being drawn a second time. */}
                            <div style={S.comboBannerRow}>
                                {comboBadges.map(b => (
                                    b.emblem
                                        ? <img key={b.id} src={b.emblem} alt={b.he} style={S.comboEmblem} />
                                        : <BariBadge key={b.id} icon={<span style={{ fontSize: "14px" }}>{b.icon}</span>}>{b.he}</BariBadge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected option 2: shared shelves, not individual framed slots. */}
                    <SummarySelectionTray
                        groups={grouped} disabled={checkoutLocked} sectionRef={summarySelectionsRef}
                        highlightedStep={highlightedStep}
                        onEdit={onEdit ? stepId => onEdit(STEPS.findIndex(st => st.id === stepId)) : undefined}
                    />

                    {/* Notes — opens in a sheet instead of an inline collapse */}
                    <button type="button" ref={notesTriggerRef} className={trayStyles.notes} disabled={checkoutLocked} onClick={openNotes} aria-haspopup="dialog">
                        <Pencil size={18} aria-hidden="true" /><span>הערה לבשלן</span>
                        {notes.length > 0 && (
                            <span className={trayStyles.notesStatus}><Check size={15} aria-hidden="true" />נוספה</span>
                        )}
                        {notes.length === 0 && <ChevronDown size={16} style={{ marginInlineStart: "auto" }} aria-hidden="true" />}
                    </button>
                    <BariModal open={notesOpen} onClose={closeNotes} variant="sheet" title="הערה לבשלן" returnFocusRef={notesTriggerRef}>
                        <div style={{ padding: "0 16px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "6px" }}>
                                <span style={{ fontSize: "10px", color: notes.length > MAX_NOTES_LENGTH * 0.8 ? "#e57373" : "rgba(255,255,255,0.35)" }}>
                                    {MAX_NOTES_LENGTH - notes.length} תווים נותרו
                                </span>
                            </div>
                            <textarea
                                value={notes}
                                disabled={checkoutLocked}
                                onChange={handleNotesChange}
                                onFocus={() => setNotesFocused(true)}
                                onBlur={() => setNotesFocused(false)}
                                placeholder="לדוגמה: בלי גרעינים, לחתוך קטן..."
                                rows={4}
                                maxLength={MAX_NOTES_LENGTH}
                                aria-label="הערות מיוחדות להזמנה"
                                style={{
                                    ...S.notesInput,
                                    border: notesFocused ? "1px solid var(--color-gold-deep)" : "1px solid rgba(255,255,255,0.08)",
                                    boxShadow: notesFocused ? "0 0 0 3px rgba(200,168,78,0.15), 0 0 16px rgba(200,168,78,0.25)" : "none",
                                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                                }}
                                autoFocus
                            />
                            {notesError && <div role="alert" style={{ fontSize: "10px", color: "#ef5350", marginTop: "4px" }}>⚠️ {notesError}</div>}
                            <BariButton variant="primary" fullWidth style={{ marginTop: "14px" }} onClick={closeNotes}>סיימתי</BariButton>
                        </div>
                    </BariModal>

                    {/* Pickup time picker */}
                    <PickupTimePicker
                        value={effectivePickupTime}
                        onChange={selectPickupTime}
                        disabled={checkoutLocked}
                        shop={shop}
                        localSlots={pickupAvailability.localSlots}
                        slots={pickupAvailability.slots}
                        capacityStatus={pickupAvailability.status}
                        selectionNotice={pickupSelectionNotice}
                        checkingMoreSlots={pickupCheckingMoreSlots}
                        sectionRef={pickupSectionRef}
                    />

                    {/* Price breakdown */}
                    <section className={trayStyles.pricePanel} aria-label="פירוט המחיר">
                        <div style={S.sumPriceLine}>
                            <span>מחיר בסיס{sizeLabel ? <span style={{ fontSize: "13px", color: "#c9d7c5", fontWeight: 500 }}> · {sizeLabel}</span> : null}</span>
                            <span style={{ fontWeight: 700 }}>₪{base}</span>
                        </div>
                        {extras.map(it => (
                            <div key={it.id} style={S.sumPriceLine}>
                                <span style={{ fontSize: "13px" }}>+ {it.he}</span>
                                <span style={{ color: "#edd87e", fontWeight: 600 }}>₪{effectiveItemPrice(it.id, it.price)}</span>
                            </div>
                        ))}

                        {/* Promo code */}
                        <form
                            onSubmit={event => { event.preventDefault(); if (!checkoutLocked) applyPromo(); }}
                            style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" }}
                        >
                            <input
                                value={promoInput}
                                disabled={checkoutLocked}
                                onChange={e => { setPromoInput(e.target.value); setPromoError(""); }}
                                placeholder="קוד הנחה"
                                aria-label="קוד הנחה"
                                style={{ flex: 1, minHeight: "44px", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "16px", fontWeight: 600, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: "none" }}
                            />
                            <button type="submit" disabled={checkoutLocked} style={{ minHeight: "44px", padding: "8px 14px", borderRadius: "8px", background: "rgba(200,168,78,0.2)", border: "1px solid rgba(200,168,78,0.4)", color: "#f0d060", fontSize: "13px", fontWeight: 800, cursor: checkoutLocked ? "not-allowed" : "pointer", opacity: checkoutLocked ? 0.55 : 1, fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>החל</button>
                        </form>
                        {promoError && <div role="alert" style={{ fontSize: "11px", color: "#ff7575", fontWeight: 600, marginTop: "4px" }}>{promoError}</div>}
                        {effectiveDiscount && discAmount > 0 && (
                            <div role="status" aria-live="polite" style={{ ...S.sumPriceLine, marginTop: "6px" }}>
                                <span style={{ fontSize: "12px", color: "#7dd37d", fontWeight: 700 }}>
                                    הנחה · {effectiveDiscount.note || effectiveDiscount.code}
                                    {effectiveDiscount === autoDiscount && <span style={{ fontSize: "10px", color: "rgba(125,211,125,0.7)", fontWeight: 600 }}> · אוטומטי</span>}
                                </span>
                                <span style={{ color: "#7dd37d", fontWeight: 700 }}>−₪{discAmount}</span>
                            </div>
                        )}

                        <div style={S.sumTotal}>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>סה"כ</span>
                            <span style={{ fontFamily: "var(--font-display), 'Secular One', sans-serif" }}>₪{checkoutTotal}</span>
                        </div>
                    </section>

                    {/* Payment choice — demo mode only (no real gateway configured yet) */}
                    {DEMO_MODE && checkoutTotal > 0 && (
                        <div style={PAY.box}>
                            <div id="demo-payment-title" style={PAY.title}>
                                💳 בדיקת מסלול תשלום
                                <BariBadge className="mr-2">מצב הדגמה</BariBadge>
                            </div>
                            <p id="demo-payment-note" style={PAY.demoNote}>לא מתבצע חיוב אמיתי. בחרו איזה מסלול לבדוק.</p>
                            <div role="group" aria-labelledby="demo-payment-title" aria-describedby="demo-payment-note" style={PAY.row}>
                                <button
                                    type="button"
                                    aria-pressed={paymentChoice === "now"}
                                    disabled={checkoutLocked}
                                    onClick={() => setPaymentChoice("now")}
                                    style={{ ...PAY.opt, ...(paymentChoice === "now" ? PAY.optActive : {}), ...(checkoutLocked ? PAY.optDisabled : {}) }}
                                >
                                    {paymentChoice === "now" && <span style={PAY.selectedCheck} aria-hidden="true">✓</span>}
                                    <span style={{ fontSize: "20px" }} aria-hidden="true">💳</span>
                                    <span>תשלום עכשיו</span>
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={paymentChoice === "pickup"}
                                    disabled={checkoutLocked}
                                    onClick={() => setPaymentChoice("pickup")}
                                    style={{ ...PAY.opt, ...(paymentChoice === "pickup" ? PAY.optActive : {}), ...(checkoutLocked ? PAY.optDisabled : {}) }}
                                >
                                    {paymentChoice === "pickup" && <span style={PAY.selectedCheck} aria-hidden="true">✓</span>}
                                    <span style={{ fontSize: "20px" }} aria-hidden="true">🏪</span>
                                    <span>תשלום באיסוף</span>
                                </button>
                            </div>
                            {/* Testing-only affordance, not a real customer choice — simulates
                                a declined card so the failure path can actually be exercised. */}
                            {SHOW_FAILURE_TEST && (
                                <button
                                    type="button"
                                    disabled={checkoutLocked || shopBlocked || pickupBlocked}
                                    onClick={() => submitOrder("fail")}
                                    style={{ ...PAY.failTest, ...((checkoutLocked || shopBlocked || pickupBlocked) ? PAY.optDisabled : {}) }}
                                >
                                    🧪 דמה כשל תשלום (לבדיקה)
                                </button>
                            )}
                        </div>
                    )}

                    {hostedPaymentExpected && (
                        <details className={trayStyles.paymentDetails}>
                            <summary>
                                <LockKeyhole size={17} aria-hidden="true" />
                                <span>התשלום יתבצע בעמוד של {hostedProviderName}</span>
                                <span className={trayStyles.paymentDetailsToggle}>פרטים <ChevronDown size={15} aria-hidden="true" /></span>
                            </summary>
                            <p>לאחר שליחת ההזמנה תועברו לעמוד התשלום המאובטח של {hostedProviderName}. סטטוס התשלום יוצג כשתחזרו לאפליקציה; אם האישור עדיין בבדיקה, נמשיך לאמת אותו.</p>
                        </details>
                    )}
                    {pickupPaymentExpected && (
                        <div style={S.paymentHandoffNote}>
                            <span aria-hidden="true">🏪</span>
                            <span>התשלום יתבצע בדלפק בעת האיסוף.</span>
                        </div>
                    )}
                    {paymentConfigurationBlocked && (
                        <div role="alert" style={{ ...S.paymentHandoffNote, borderColor: "rgba(255,117,117,0.38)", color: "#ffb0ad" }}>
                            <span aria-hidden="true">⚠️</span>
                            <span>התשלום אינו זמין כרגע, ולכן לא ניתן לשלוח את ההזמנה. נסו שוב בעוד כמה דקות.</span>
                        </div>
                    )}

                    <div style={S.trustCopy}>
                        <Leaf size={16} aria-hidden="true" />
                        <span>מרכיבים כל הזמנה לפי הבחירות שלכם</span>
                    </div>
                </div>

                <div className="summary-action-zone" style={S.bar}>
                    <div className={trayStyles.footer}>
                        <button
                            type="button"
                            onClick={focusPickupPicker}
                            aria-controls="pickup-time-picker"
                            aria-label={`זמן איסוף: ${pickupFooterLabel}. מעבר לבחירת זמן`}
                            className={trayStyles.pickupShortcut}
                        >
                            <span className={trayStyles.pickupShortcutTitle}><ShoppingBag size={15} aria-hidden="true" /><small>איסוף</small></span>
                            <span>{pickupShortcutLabel}</span>
                        </button>
                    {/* Submission failure — shown instead of a false confirmation */}
                    {submitError && (
                        <div role="alert" className={trayStyles.footerError} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "10px 12px", borderRadius: "12px",
                            background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.4)",
                            fontSize: "12.5px", fontWeight: 700, color: "#ff9a97", lineHeight: 1.5,
                        }}>
                            <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
                            <span>{submitError}</span>
                        </div>
                    )}
                    {/* CTA
                        Blocked only on a LIVE answer that says closed. A failed
                        /api/shop leaves `live` false and the button enabled: a
                        dropped request must never be able to turn a customer
                        away from an open shop, and the server refuses for real
                        anyway — now with a message they can read. */}
                    <button
                        type="button"
                        className={trayStyles.submit}
                        aria-busy={submitting}
                        disabled={submitting || paymentConfigurationBlocked || (!recoveryPending && (shopBlocked || pickupBlocked))}
                        style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif", opacity: (submitting || paymentConfigurationBlocked || (!recoveryPending && (shopBlocked || pickupBlocked))) ? 0.6 : 1 }}
                        onClick={() => submitOrder()}
                    >
                        {!submitting && <ArrowRight size={18} aria-hidden="true" />}
                        <span>{submitting ? "שולח…" : hasPendingPayment ? "פתחו שוב את התשלום" : hasPendingSubmission ? "בדקו הזמנה קודמת" : paymentConfigurationBlocked ? "התשלום אינו זמין כרגע" : shopBlocked ? "סגור כרגע" : pickupBlocked ? pickupBlockLabel : priceReconfirmation ? "אישור המחיר המעודכן" : submitError ? "נסו שוב" : defaultSubmitLabel}</span>
                        {!recoveryPending && <bdi dir="ltr">₪{checkoutTotal}</bdi>}
                    </button>
                    </div>
                    {hostedPaymentExpected && <div className={trayStyles.footerTrust}>
                        <LockKeyhole size={15} aria-hidden="true" /><span>תשלום מאובטח ב־{hostedProviderName}</span>
                    </div>}
                    {/* Consent disclosure — links open the legal docs before ordering */}
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.68)", textAlign: "center", lineHeight: 1.6, fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }}>
                        בלחיצה על הכפתור אני מאשר/ת את{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" aria-label="תנאי השימוש (נפתח בלשונית חדשה)" style={{ color: "rgba(240,208,96,0.8)" }}>תנאי השימוש</a>,{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" aria-label="מדיניות הפרטיות (נפתחת בלשונית חדשה)" style={{ color: "rgba(240,208,96,0.8)" }}>מדיניות הפרטיות</a>{" "}
                        ו<a href="/cancellations" target="_blank" rel="noopener noreferrer" aria-label="מדיניות הביטולים (נפתחת בלשונית חדשה)" style={{ color: "rgba(240,208,96,0.8)" }}>מדיניות הביטולים</a>.
                    </div>
                </div>
            </div>
            <style>{KF}</style>
        </div>
    );
}

// ─── BariMeter: deliberately broad order-level simulation ───────────────
function CompositionStats({ all, estimate }) {
    if (!estimate) {
        return (
            <div
                role="group"
                aria-label={`${all.length} בחירות בהזמנה`}
                className={meterStyles.readout}
            >
                <div className={meterStyles.range}>
                    <span className={meterStyles.calories}>{all.length}</span>
                    <span className={meterStyles.unit}>בחירות שביצעתם</span>
                </div>
                <p className={meterStyles.unavailable}>אין הערכה תזונתית לבחירות האלה</p>
            </div>
        );
    }

    const stats = [
        { key: 'protein', label: 'חלבון' },
        { key: 'carbs', label: 'פחמימות' },
        { key: 'fat', label: 'שומן' },
        { key: 'fiber', label: 'סיבים' },
    ];

    return (
        <div
            role="group"
            aria-label={`סימולציה תזונתית: ${estimate.calories.low} עד ${estimate.calories.high} קילוקלוריות`}
            className={meterStyles.readout}
        >
            <span className={meterStyles.simulation}>סימולציה</span>
            <div className={meterStyles.range}>
                <span dir="ltr" className={meterStyles.calories}>
                    {estimate.calories.low}–{estimate.calories.high}
                </span>
                <span className={meterStyles.unit}>קק״ל</span>
            </div>
            <div className={meterStyles.macros}>
                {stats.map(stat => {
                    const value = estimate.macros[stat.key];
                    return (
                        <div key={stat.key} role="group" aria-label={`${stat.label}: ${value.low} עד ${value.high} גרם`} className={meterStyles.stat}>
                            <div dir="ltr" className={meterStyles.macroValue}>{value.low}–{value.high}</div>
                            <div className={meterStyles.macroLabel}>{stat.label}</div>
                            <div className={meterStyles.macroUnit}>גרם</div>
                        </div>
                    );
                })}
            </div>
            <p className={meterStyles.estimateNote}>הערכה לפי מנות טיפוסיות</p>
            {estimate.coverage < 100 && <p className={meterStyles.unavailable}>חלק מהבחירות אינן כלולות בהערכה</p>}
        </div>
    );
}

// ─── Simulated payment-failure screen (demo mode only) ──────────
function PaymentFailedScreen({ orderNum, onRetry }) {
    return (
        <div style={OS.root}>
            <div style={OS.bg} />
            <div style={OS.failContent}>
                <div style={{ fontSize: "64px", animation: "plaqueRingPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>❌</div>
                <div style={{ ...OS.title, color: "#ef5350" }}>התשלום נכשל</div>
                <div style={OS.subtitle}>לא הצלחנו לחייב את הכרטיס (מצב הדגמה)</div>
                {orderNum && (
                    <div style={{ marginTop: "14px", animation: "plaqueFadeUp 0.5s ease 0.35s both" }}>
                        <BariBadge>הזמנה {orderNum}</BariBadge>
                    </div>
                )}
                <div style={OS.divider} />
                <BariButton variant="primary" fullWidth style={{ fontFamily: "var(--font-heebo), 'Heebo', sans-serif" }} onClick={onRetry}>
                    נסה שוב ←
                </BariButton>
            </div>
            {/* Uses the plaque's animation names without the frame itself. */}
            <BariPlaqueKeyframes />
        </div>
    );
}

/*
  Confirmation screen, built inside the ornate plaque (design-assets/SumOrder/
  SentDoneBG.png, keyed and cut into public/builder-assets/sent-frame-*.webp).

  Every vertical position here is a FRACTION OF THE PLAQUE'S WIDTH, because that
  is the only dimension both the art and the layout agree on: the frame's bands
  are aspect-ratio boxes, so their heights follow the width, and CSS percentage
  padding resolves against the inline size too. Heights are therefore expressed
  as `aspectRatio: 1 / <fraction>` rather than percentages, which would resolve
  against the parent's height and mean nothing here.

  Measured off the source art (plaque bbox 914x1323, cut at row 1020):
     top band      1.0689 * W        pedestal surface  0.5711 * W
     bottom band   0.3786 * W        pedestal rim      0.6313 * W
     side inset    0.0372 * W        divider ornament  0.9267 * W
     the green interior stops 0.1368 * W above the plaque's bottom edge
*/
const OS = {
    // Everything the CONFIRMATION used to need moved to OrderSealScreen with it.
    // What is left is the demo-mode payment-failure screen: a dead end with
    // three elements, deliberately NOT dressed in the plaque — it borrows the
    // plaque's animation names and nothing else.
    root: { position: 'fixed', inset: 0, zIndex: 500, background: PLAQUE.backdrop, display: 'flex', overflowY: 'auto', overflowX: 'hidden', fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: 'rtl', animation: 'plaqueScreenIn 0.55s ease both' },
    bg: { position: 'fixed', inset: 0, background: PLAQUE.glow, pointerEvents: 'none' },
    failContent: { position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px', margin: 'auto', maxWidth: '360px', width: '100%' },
    // Scales with the viewport: at a fixed 26px this overflowed its box on a
    // 320px phone.
    title: { fontSize: 'clamp(20px, 6.4vw, 26px)', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.5)', animation: 'plaqueFadeUp 0.5s ease 0.3s both', lineHeight: 1.1 },
    subtitle: { fontSize: 'clamp(11px, 3.4vw, 13px)', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginTop: '4px', animation: 'plaqueFadeUp 0.5s ease 0.4s both' },
    divider: { width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)', margin: '24px auto' },
};

const S = {
    // dvh — see the note in BariBaliBuilder: `100vh` would push the total +
    // "לתשלום" bar below the browser chrome on a phone.
    root: { position: "relative", width: "100%", maxWidth: "430px", minHeight: "100dvh", margin: "0 auto", overflow: "hidden", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", direction: "rtl" },
    bg: { position: "fixed", inset: 0, zIndex: 0, background: "url(/homepage-assets/BG_8K.webp) center center / cover no-repeat, #020a02", filter: "brightness(0.45)" },
    bgRay: { position: "fixed", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "110%", height: "70%", zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 20%, rgba(255,224,100,0.05) 0%, rgba(200,168,78,0.02) 50%, transparent 70%)" },
    main: { position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100dvh" },
    pricePill: { display: "flex", alignItems: "baseline", justifyContent: "center", direction: "ltr", flexShrink: 0, gap: "3px", minWidth: "44px", minHeight: "50px", boxSizing: "border-box", background: "transparent", border: 0, padding: "9px 15px", borderRadius: "8px" },
    priceS: { fontSize: "12px", color: "#e8cf74", fontWeight: 700 },
    priceV: { fontSize: "24px", color: "#ffffff", fontWeight: 900, fontVariantNumeric: "tabular-nums" },
    content: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "12px 16px max(24px, env(safe-area-inset-bottom))", scrollbarWidth: "none" },
    sumBowlWrap: { position: "relative", margin: "0 auto 18px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", alignItems: "center" },
    preparationNote: { width: "100%", display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px", padding: "10px 12px", borderRadius: "12px", background: "rgba(200,168,78,0.08)", border: "1px solid rgba(200,168,78,0.2)", fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" },
    nutritionDisclaimer: { margin: "10px 4px 0", fontSize: "12px", lineHeight: 1.55, color: "rgba(255,255,255,0.75)", textAlign: "center" },
    nutritionDetails: { width: "100%", marginTop: "8px", padding: "0 12px", borderRadius: "11px", background: "rgba(9,31,14,0.66)", border: "1px solid rgba(200,168,78,0.24)", color: "rgba(255,255,255,0.8)", fontSize: "12px", lineHeight: 1.55 },
    nutritionSummary: { minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f0d060", fontWeight: 800, listStylePosition: "inside" },
    nutritionExplanation: { padding: "0 4px 10px", textAlign: "right" },
    // 16px inner gutter + a smaller badge glyph (below): four bordered pills in
    // a bordered box used to fill the row edge-to-edge with nothing to spare,
    // which is what made it read as crowded.
    // Back to a 16px gutter, matching every other row on this screen. The 20px
    // was compensating for bordered pills landing on the panel edge; the
    // emblems are free-standing art with their own visual margin, so the
    // crowding it was fighting is gone.
    comboBanner: { marginBottom: "14px", padding: "12px 16px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(200,168,78,0.14) 0%, rgba(180,140,40,0.08) 100%)", border: "1.5px solid rgba(200,168,78,0.4)", boxShadow: "0 0 24px rgba(200,168,78,0.12), inset 0 1px 0 rgba(255,255,255,0.06)", animation: "pFadeIn 0.5s ease both" },
    comboBannerTitle: { fontSize: "12px", fontWeight: 800, color: "#e6d18b", letterSpacing: "0.04em", marginBottom: "8px" },
    // A fixed 6-across trophy wall. At this size (~38px on a 320px screen,
    // ~56px on a large phone) the Hebrew baked into each emblem is NOT
    // readable — that is the intent: the wall is scanned for shape and colour,
    // the way a collection is. The title still reaches screen readers via alt.
    comboBannerRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px", justifyItems: "center" },
    comboEmblem: { width: "100%", height: "auto", display: "block" },
    notesInput: { width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#e8f5e9", fontSize: "16px", fontFamily: "var(--font-heebo), 'Heebo', sans-serif", outline: "none", direction: "rtl", resize: "vertical", minHeight: "60px" },
    sumPriceLine: { display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#c9d7c5", padding: "3px 0" },
    sumTotal: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "36px", fontWeight: 900, color: "#f0d060", textShadow: "0 0 24px rgba(200,168,78,0.55), 0 2px 8px rgba(200,168,78,0.3)", padding: "12px 0 2px", marginTop: "10px", borderTop: "1px solid rgba(200,168,78,0.2)" },
    bar: {
        display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0,
        padding: "8px 16px max(10px, env(safe-area-inset-bottom))",
        background: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.68)), url(/builder-assets/footer-brand.png) center top / cover no-repeat`,
        borderTop: "2px solid rgba(200,168,78,0.4)",
        boxShadow: "0 -6px 28px rgba(0,0,0,0.55)",
    },
    paymentHandoffNote: {
        display: "flex", alignItems: "flex-start", gap: "8px",
        marginTop: "12px", padding: "10px 12px", borderRadius: "12px",
        background: "rgba(200,168,78,0.09)", border: "1px solid rgba(200,168,78,0.24)",
        color: "#c9d7c5", fontSize: "12px", fontWeight: 600,
        lineHeight: 1.55,
    },
    trustCopy: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "16px", fontSize: "12px", fontWeight: 500, color: "#c9d7c5", letterSpacing: "0.03em", animation: "pFadeIn 0.5s ease 0.8s both" },
};

// ─── Pickup time picker ────────────────────────────────────────
function usePickupAvailability(shop) {
    const localSlots = useMemo(
        () => generatePickupSlots(shop.refreshedAt ? new Date(shop.refreshedAt) : undefined),
        [shop.refreshedAt],
    );
    const serviceDate = useMemo(
        () => shopDateKey(shop.refreshedAt ? new Date(shop.refreshedAt) : undefined),
        [shop.refreshedAt],
    );
    const [capacity, setCapacity] = useState({ slots: null, serviceDate: null, status: 'loading' });
    const [refreshKey, setRefreshKey] = useState(0);
    const refresh = useCallback(() => setRefreshKey(key => key + 1), []);
    const markFull = useCallback((pickupTime) => {
        if (!pickupTime) return;
        setCapacity(current => ({
            ...current,
            slots: current.slots?.map(slot => (
                slot.time === pickupTime
                    ? { ...slot, full: true, available: 0 }
                    : slot
            )) ?? null,
        }));
    }, []);

    // Refresh capacity on the same clock as opening status. A failed periodic
    // refresh keeps the last successful snapshot: forgetting it would turn a
    // known-full slot back into an available one. POST /api/orders is the final
    // atomic authority; this snapshot keeps the picker useful before submit.
    useEffect(() => {
        if (shop.loading) return;

        const controller = new AbortController();
        const requestTimeout = setTimeout(() => controller.abort(), 10_000);
        let cancelled = false;

        fetch('/api/slots', { cache: 'no-store', signal: controller.signal })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (cancelled) return;
                if (Array.isArray(data?.slots) && typeof data?.serviceDate === 'string') {
                    setCapacity({ slots: data.slots, serviceDate: data.serviceDate, status: 'ready' });
                } else {
                    setCapacity(current => ({
                        ...current,
                        status: current.slots === null ? 'error' : 'stale',
                    }));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCapacity(current => ({
                        ...current,
                        status: current.slots === null ? 'error' : 'stale',
                    }));
                }
            })
            .finally(() => clearTimeout(requestTimeout));

        return () => {
            cancelled = true;
            clearTimeout(requestTimeout);
            controller.abort();
        };
    }, [refreshKey, shop.loading, shop.refreshedAt]);

    // Never invent capacity for a slot absent from the retained server
    // snapshot. This happens briefly when the local five-minute window moves
    // before the next response arrives; the new slot becomes usable only once
    // /api/slots confirms it.
    const slots = useMemo(
        () => mergePickupCapacity(localSlots, capacity.slots, capacity.serviceDate, serviceDate),
        [capacity.serviceDate, capacity.slots, localSlots, serviceDate],
    );

    return { localSlots, slots, status: capacity.status, refresh, markFull };
}

function PickupTimePicker({ value, onChange, disabled = false, shop, localSlots, slots, capacityStatus, selectionNotice, checkingMoreSlots, sectionRef }) {

    // Two different ways to have nothing to offer, and only one of them is the
    // schedule. `generatePickupSlots` reads WEEK, which is in the bundle and
    // knows nothing about staff having closed the shop twenty minutes ago — so
    // the override has to be consulted separately or the picker cheerfully
    // offers times for a shop with its shutters down.
    if (localSlots === null || !shop.open) {
        return (
                <div ref={sectionRef} id="pickup-time-picker" role="region" tabIndex={-1} aria-labelledby="pickup-time-picker-title" className={trayStyles.pickup}>
                <div id="pickup-time-picker-title" style={PT.title}><Clock3 size={18} aria-hidden="true" />זמן איסוף</div>
                <div style={PT.closedMsg}>{noPickupMessage(shop, new Date())}</div>
            </div>
        );
    }

    if (slots === null) {
        return (
            <div ref={sectionRef} id="pickup-time-picker" role="region" tabIndex={-1} aria-labelledby="pickup-time-picker-title" className={trayStyles.pickup} aria-live="polite">
                <div id="pickup-time-picker-title" style={PT.title}><Clock3 size={18} aria-hidden="true" />זמן איסוף</div>
                <div style={PT.closedMsg}>
                    {capacityStatus === 'error'
                        ? 'לא הצלחנו לעדכן זמני איסוף · ננסה שוב אוטומטית'
                        : 'בודקים זמני איסוף…'}
                </div>
            </div>
        );
    }

    const hasAvailableSlot = slots.some(slot => !slot.full);
    const statusMessage = !hasAvailableSlot
        ? checkingMoreSlots
            ? 'בודקים זמינות לשעות הקרובות…'
            : 'אין שעות פנויות כרגע.'
        : selectionNotice || null;
    const needsChoice = !value && hasAvailableSlot && !disabled;

    return (
        <div ref={sectionRef} id="pickup-time-picker" role="region" tabIndex={-1} aria-labelledby="pickup-time-picker-title" className={trayStyles.pickup} data-needs-choice={needsChoice}>
            <div style={PT.header}>
                <span id="pickup-time-picker-title" style={PT.title}><Clock3 size={18} aria-hidden="true" />זמן איסוף</span>
                <span className={trayStyles.pickupSelection} style={value ? PT.selectedLabel : PT.chooseLabel}>
                    {value && <Check size={15} aria-hidden="true" />}{value ? `נבחרה ${value}` : 'בחרו שעה'}
                </span>
            </div>
            {needsChoice && !statusMessage && <p id="pickup-time-guidance" className={trayStyles.pickupGuidance}>בחרו שעה כדי להמשיך להזמנה</p>}
            {statusMessage && (
                <div id="pickup-time-status" role="status" aria-live="polite" aria-atomic="true" style={PT.statusMessage}>
                    {statusMessage}
                </div>
            )}
            <div
                style={PT.row}
                role="group"
                aria-label="בחירת זמן איסוף"
                aria-describedby={statusMessage ? "pickup-time-status" : needsChoice ? "pickup-time-guidance" : undefined}
            >
                {slots.map(slot => (
                    <button
                        type="button"
                        key={slot.id}
                        disabled={disabled || slot.full}
                        aria-pressed={value === slot.id}
                        className={trayStyles.slot}
                        onClick={() => !disabled && !slot.full && onChange(slot.id)}
                        style={{
                            ...PT.chip,
                            ...(value === slot.id ? PT.chipActive : {}),
                            ...(slot.full ? PT.chipFull : {}),
                            ...(disabled && !slot.full ? { cursor: 'not-allowed', opacity: 0.55 } : {}),
                        }}
                    >
                        {value === slot.id && <span style={PT.selectedCheck} aria-hidden="true">✓</span>}
                        <span>{slot.label}</span>
                        {slot.isPeak && !slot.full && <span style={PT.peakTag}>עמוס</span>}
                        {slot.full && (
                            <span style={slot.capacityPending ? PT.pendingTag : PT.fullTag}>
                                {slot.capacityPending ? 'בודקים' : 'מלא'}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

const PAY = {
    box: { margin: "12px 0", padding: "12px 14px", borderRadius: "12px", background: "rgba(15,45,15,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,168,78,0.15)" },
    title: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.72)", marginBottom: "4px" },
    demoNote: { margin: "0 0 10px", fontSize: "11px", lineHeight: 1.45, fontWeight: 600, color: "rgba(255,255,255,0.5)" },
    row: { display: "flex", gap: "8px" },
    opt: { position: "relative", flex: 1, minHeight: "64px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", padding: "10px 8px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer", transition: "all 0.15s" },
    optActive: { background: "linear-gradient(135deg, rgba(200,168,78,0.28), rgba(200,168,78,0.12))", border: "1px solid var(--color-gold-deep)", color: "var(--color-gold-light)", boxShadow: "var(--shadow-gold-glow)" },
    optDisabled: { cursor: "not-allowed", opacity: 0.55 },
    selectedCheck: { position: "absolute", insetInlineEnd: "8px", top: "7px", color: "#f0d060", fontSize: "13px", fontWeight: 900, lineHeight: 1 },
    failTest: { width: "100%", minHeight: "44px", marginTop: "8px", padding: "8px", background: "none", border: "none", borderTop: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,154,151,0.78)", fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer" },
};

const PT = {
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "10px" },
    title: { display: "flex", alignItems: "center", gap: "6px", fontSize: "1rem", fontWeight: 800, color: "#f3ecc8" },
    selectedLabel: { fontSize: "14px", fontWeight: 900, color: "#f0d060", letterSpacing: "0.04em" },
    chooseLabel: { fontSize: "12px", fontWeight: 800, color: "rgba(255,255,255,0.68)" },
    statusMessage: { marginBottom: "9px", padding: "8px 10px", borderRadius: "9px", background: "rgba(242,196,106,0.1)", border: "1px solid rgba(242,196,106,0.24)", color: "#f2c46a", fontSize: "11.5px", fontWeight: 700, lineHeight: 1.45 },
    row: { display: "flex", gap: "8px", overflowX: "auto", overscrollBehaviorX: "contain", paddingBottom: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" },
    chip: { flexShrink: 0, minHeight: "44px", padding: "8px 16px", borderRadius: "10px", border: "1px solid #a7b57380", background: "#042b18d9", color: "#e1e5ce", fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-heebo), 'Heebo', sans-serif", cursor: "pointer", transition: "all 0.15s", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" },
    chipActive: { background: "linear-gradient(135deg, rgba(200,168,78,0.28), rgba(200,168,78,0.12))", border: "1px solid var(--color-gold-deep)", color: "var(--color-gold-light)", boxShadow: "var(--shadow-gold-glow)" },
    selectedCheck: { color: "#f0d060", fontSize: "13px", fontWeight: 900, lineHeight: 1 },
    // Was rgba(255,255,255,0.35) — a footnote weight, from when this was a
    // passing remark under a heading. It is now the reason the order button is
    // dead, so it is the one thing on the screen the customer most needs to
    // read. Amber, matching the landing page's notice, so the two closed states
    // are recognisably the same message.
    closedMsg: { fontSize: "12.5px", color: "#f2c46a", fontWeight: 700, lineHeight: 1.5 },
    peakTag: { fontSize: "9px", fontWeight: 800, color: "#f2c46a", lineHeight: 1 },
    chipFull: { cursor: "not-allowed", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.48)" },
    fullTag: { fontSize: "10px", fontWeight: 800, color: "#ff9a97", letterSpacing: "0.04em" },
    pendingTag: { fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.72)" },
};

const KF = `
@keyframes popBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes pFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@media (max-height: 700px) {
  .summary-action-zone { gap:6px !important; padding:8px 16px max(8px, env(safe-area-inset-bottom)) !important; }
  .summary-pick-count { display:none !important; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="popBounce"], [style*="pFadeIn"] { animation: none !important; }
}
::-webkit-scrollbar{display:none}
`;
