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

/** Gold dust converges on the pedestal centre. */
export const GATHER_AT = 1.0;
/** Flare, shockwave, and the medallion strikes in. */
export const STRIKE_AT = 1.2;
/** The face resolves inside the ring. */
export const FACE_AT = 1.7;
/** Sheen sweeps the gold; the plaque frame fades in around it. */
export const SHEEN_AT = 2.3;
/** Content settles; hand off to the confirmation screen. */
export const DONE_AT = 3.0;

export type SealStage = 'gather' | 'strike' | 'face' | 'sheen' | 'settle' | 'done';

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

/** The ordered boundaries, for iteration and assertions. */
export const STAGES: { name: SealStage; end: number }[] = [
    { name: 'gather', end: GATHER_AT },
    { name: 'strike', end: STRIKE_AT },
    { name: 'face', end: FACE_AT },
    { name: 'sheen', end: SHEEN_AT },
    { name: 'settle', end: DONE_AT },
];

export function stageAt(t: number): SealStage {
    for (const s of STAGES) if (t < s.end) return s.name;
    return 'done';
}

/**
 * The earliest the plaque may be considered "arrived".
 *
 * The overlay is also cover for the POST that creates the order. If the server
 * has not answered by here the sequence holds at the sheen and shimmers rather
 * than showing a finished confirmation for an order that does not exist yet —
 * the same guarantee the old `stillSending` gave, at a nicer place to wait.
 */
export const HOLD_AT = SHEEN_AT;

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
            // Starts outside the medallion's 6em radius, so the motes fly in
            // from off the disc rather than appearing on top of it.
            distEm: Number((7.4 + (i % 4) * 1.05).toFixed(2)),
            sizeEm: i % 3 === 0 ? 0.42 : i % 3 === 1 ? 0.3 : 0.2,
            delay,
            dur: Number(dur.toFixed(3)),
        };
    });
}

/** When a mote reaches the centre. Must not exceed GATHER_AT. */
export const moteArrivesAt = (m: DustMote): number => Number((m.delay + m.dur).toFixed(3));
