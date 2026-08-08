/**
 * The post-order moment: choreography for the seal.
 *
 * A plain .ts, like plaqueGeometry.ts and heroBowlGeometry.ts, so the assertion
 * harness can import it — Node's type stripper has no JSX transform.
 *
 * WHY THIS REPLACED THE OLD MIXING ANIMATION
 *
 * The old screen poured the customer's ingredient icons into a tossing bowl and
 * then bloomed. Two things were wrong with it, and only one was fixable.
 *
 * The fixable one: the app celebrated TWICE in half a second. This overlay
 * bloomed at 2.9s, cut hard to the confirmation plaque, and fired gold confetti
 * 450ms after that. Two payoffs that close blur into one muddy one, and the cut
 * between them was the most abrupt transition in the app.
 *
 * The unfixable one: `cat-salad-bowl.json` is a TOSS LOOP, not a fill. Frame 0
 * is a full settled bowl, frames ~40-140 are the salad airborne mid-toss, and
 * frame 165 returns to the same settled bowl. Scrubbing it does not show a bowl
 * filling up, and no amount of syncing makes it. (Worth knowing before touching
 * HeroBowlCard, whose comments describe it as a fill: what its scrub actually
 * produces is a little toss burst per ingredient, which reads well but is not a
 * fill level.)
 *
 * So the moment is now one continuous thing: gold dust gathers, strikes into a
 * struck medallion, and the plaque forms around it — the confirmation screen
 * arriving rather than being cut to. The ingredients are not in it. They have
 * already been shown on every add, in the bowl panel, and on the summary; this
 * screen's job is the payoff, not another inventory.
 */

// ─── Stage clock ─────────────────────────────────────────────
// Boundaries in seconds from mount. Every one is the END of its stage.

/**
 * Gold dust converges on the pedestal centre.
 *
 * Lengthened from 1.0s. The gather is the charge before the hit, and at one
 * second flat there was no time to feel anything building — the motes barely
 * cleared the rim before the flare took over. Everything after it shifted by the
 * same 0.2s rather than being compressed.
 */
export const GATHER_AT = 1.2;
/** Flare, shockwave, and the medallion strikes in. */
export const STRIKE_AT = 1.4;
/**
 * The face resolves inside the ring — and the clock stops here.
 *
 * Everything past this point used to be on a timer too: a sheen at 2.5s, a
 * settle at 3.2s, then a handoff to a second screen that grew for another
 * 0.7s. Roughly two seconds of dressing on a decision that had already been
 * made, paid on every order including a regular's twentieth.
 *
 * None of it was load-bearing. The order request has a 20s timeout and the
 * confirmation may only appear once the server has accepted, so the sequence
 * could never have been "long enough" to guarantee anything — a slow request
 * always had to be waited out separately. The length was inherited from the
 * animation this replaced, and never justified.
 *
 * So the tail is driven by the ORDER now, not the clock: the moment reads to
 * here, and the content appears as soon as the server has answered. Fast
 * network, that is right here at 1.9s. Slow network, the seal holds and
 * shimmers for exactly as long as it has to.
 */
export const FACE_AT = 1.9;

/** How long the frame takes to form around the seal once the order lands. */
export const REVEAL_DUR = 0.6;

/**
 * How hard the ambient GoldField is streaking when the screen opens.
 *
 * Signed and negative: GoldField's sweep drives the motes vertically and
 * stretches them into trails as its magnitude rises, so the field arrives
 * already rushing and decays (0.955/frame) to rest at almost exactly the strike.
 * Reusing that field is why there is no second particle system here.
 */
export const FIELD_RUSH = -2.2;

/**
 * The ground both screens sit on.
 *
 * The house background — the same BG_8K plate over the same gradient that
 * /home2, /login, /orders, /profile and the order-status board all use. The
 * plaque's own `PLAQUE.backdrop` is deliberately flat and photo-free so the
 * frame's gold rails are the only detail on screen, and that reasoning still
 * holds for a plaque sitting alone; but the order-status board already carries
 * this same frame over this same plate and the two screens are siblings, so a
 * flat ground here made the confirmation the odd one out in its own flow.
 *
 * MUST be identical on both, like PLAQUE_TOP and PLAQUE_MARGIN — a background
 * that changes at the swap is exactly the seam this sequence exists to remove.
 */
export const SEAL_BACKDROP =
    'url(/homepage-assets/BG_8K.webp) center top / cover no-repeat, linear-gradient(155deg, #030a03 0%, #071a07 30%, #0a200a 60%, #071a07 100%)';

/**
 * `waiting` and `revealed` are not on the clock — they depend on the order.
 * The screen reaches the end of `face` and then either reveals (the server has
 * answered) or waits (it has not), which is the whole point: the sequence is
 * exactly as long as the thing it is covering.
 */
export type SealStage = 'gather' | 'strike' | 'face' | 'waiting' | 'revealed';

/**
 * The medallion's footprint, as a fraction of the plaque's width.
 *
 * Smaller than BariPlaque's 0.66 default, which suits the cat Lottie's wide
 * transparent margin; a full-bleed disc at that footprint pokes out through the
 * arch. Shared rather than duplicated because the confirmation screen has to
 * render the seal at exactly this size — if the two disagree, the handoff that
 * is supposed to be invisible becomes a jump in scale.
 */
export const SEAL_FOOTPRINT = 0.5;

/** The boundaries that are actually on a clock. Nothing after `face` is. */
export const TIMED_STAGES: { name: SealStage; end: number }[] = [
    { name: 'gather', end: GATHER_AT },
    { name: 'strike', end: STRIKE_AT },
    { name: 'face', end: FACE_AT },
];

/**
 * The stage at time `t`, for the timed portion only.
 *
 * Returns `waiting` past the end — the honest default, because at that point
 * the screen genuinely is waiting on the order. Whether it stays there for one
 * frame or four seconds is the network's business, not this function's.
 */
export function stageAt(t: number): SealStage {
    for (const s of TIMED_STAGES) if (t < s.end) return s.name;
    return 'waiting';
}

/**
 * The floor: the earliest the content may appear, however fast the server is.
 *
 * Not a delay for its own sake — it is how long the seal takes to mean
 * anything. The dust has to gather, the medallion has to land, and the cat has
 * to read before it is covered by a price. Below this the moment is a flicker
 * behind text.
 */
export const CONTENT_FLOOR = FACE_AT;

// ─── Converging dust ─────────────────────────────────────────

export interface DustMote {
    /** Degrees around the centre — where it starts. */
    angle: number;
    /**
     * How far out it starts, in `em`, against a medallion that is 12em wide.
     *
     * NOT a percentage. A percentage in `translateX` resolves against the moving
     * element's OWN width, so `2.6` — meant as "2.6 radii out" — put a 10px mote
     * 13px from the centre and the whole convergence collapsed into a blob.
     */
    distEm: number;
    /** Diameter in `em`, same 12em basis. */
    sizeEm: number;
    delay: number;
    dur: number;
}

/** The medallion's width in `em`, which is what sizes everything in the seal. */
export const SEAL_EM = 12;

/**
 * How far below the top of the screen both plaques start.
 *
 * MUST be identical on the sealing overlay and the confirmation, and both must
 * be TOP-anchored rather than centred. They both used to centre, and because the
 * confirmation's plaque is taller — price, pickup time, payment pill, badges,
 * buttons — its pedestal landed 80px higher, so the seal jumped at the exact
 * moment the two screens swap. Anchoring to a shared offset makes the seal's
 * position independent of the content below it.
 *
 * Small enough that a tall confirmation still fits an 844px screen without
 * scrolling, generous enough that the sealing overlay does not look pinned to
 * the top edge.
 */
export const PLAQUE_TOP = '6vh';

/**
 * Overrides BariPlaque's own `margin: auto`, which centres it on BOTH axes.
 *
 * An auto margin WINS over the flex container's `align-items`, so setting
 * `alignItems: flex-start` alone does nothing — the plaque keeps centring
 * vertically and the seal keeps jumping. Horizontal auto is still wanted; only
 * the vertical has to go.
 *
 * A single shorthand rather than `marginTop: 0` beside the shorthand: React
 * warns when a style object mixes shorthand and longhand for the same property.
 */
export const PLAQUE_MARGIN = '0 auto auto';

/** Small margin so the last mote is absorbed before the flare, not during it. */
const ABSORBED_BY = GATHER_AT - 0.05;

/**
 * Motes spiral inward from a ring around the pedestal.
 *
 * The angle uses the golden ratio rather than `i / n * 360`, so no count
 * produces visible spokes — an even division looks like a bicycle wheel the
 * moment the motes are large enough to read individually.
 */
export function dustPlan(count: number): DustMote[] {
    const GOLDEN = 137.508;
    return Array.from({ length: count }, (_, i) => {
        const dur = 0.55 + (i % 5) * 0.06;
        // Every mote lands by ABSORBED_BY, whatever its flight time, so the
        // convergence resolves INTO the strike instead of straggling past it.
        const delay = Number((((ABSORBED_BY - dur) * i) / Math.max(1, count - 1)).toFixed(3));
        return {
            angle: Number(((i * GOLDEN) % 360).toFixed(2)),
            // Well outside the medallion's 6em radius — far enough that the
            // motes cross real distance and read as being PULLED in, rather
            // than appearing just off the rim and winking out.
            distEm: Number((9 + (i % 5) * 1.9).toFixed(2)),
            sizeEm: i % 3 === 0 ? 0.46 : i % 3 === 1 ? 0.32 : 0.22,
            delay,
            dur: Number(dur.toFixed(3)),
        };
    });
}

/** When a mote reaches the centre. Must not exceed GATHER_AT. */
export const moteArrivesAt = (m: DustMote): number => Number((m.delay + m.dur).toFixed(3));
