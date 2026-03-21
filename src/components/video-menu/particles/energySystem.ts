/**
 * Energy System
 *
 * Manages energy-based impulse system for particle behavior.
 * Energy drives particle speed, size, and opacity modulation.
 * Actions add impulses that decay smoothly back to idle baseline.
 */

/**
 * Energy system state
 */
export interface EnergyState {
    energy: number;        // Current energy level [0..1]
    energyVel: number;     // Energy velocity (impulse accumulation)
    lastUpdate: number;     // Last update timestamp
    activeUntil: number;    // Timestamp until activity window ends (ms)
}

/**
 * Energy multipliers for particle properties
 */
export interface EnergyMultipliers {
    speedMul: number;      // Speed multiplier
    alphaMul: number;      // Opacity multiplier
    sizeMul: number;       // Size multiplier
}

/**
 * Initialize energy system
 */
export function initEnergyState(): EnergyState {
    return {
        energy: 0.08,      // Idle baseline
        energyVel: 0,
        lastUpdate: performance.now(),
        activeUntil: 0,     // No active window initially
    };
}

/**
 * Add energy impulse
 *
 * @param state - Energy state to modify
 * @param amount - Impulse amount (typically 0.12 to 0.7)
 */
export function impulse(state: EnergyState, amount: number): void {
    state.energyVel += amount;
}

/**
 * Update energy state with decay
 *
 * @param state - Energy state to update
 * @param currentTime - Current timestamp in ms
 * @param dt - Delta time in seconds (optional, calculated if not provided)
 */
export function updateEnergy(
    state: EnergyState,
    currentTime: number,
    dt?: number
): void {
    // Calculate dt if not provided
    if (dt === undefined) {
        dt = (currentTime - state.lastUpdate) / 1000;
    }

    state.lastUpdate = currentTime;

    // Critically damped decay for impulses
    state.energyVel *= Math.pow(0.25, dt);

    // Smooth return to idle baseline
    const target = 0.08; // Idle baseline
    state.energy += (target - state.energy) * (1 - Math.pow(0.6, dt));

    // Apply velocity
    state.energy += state.energyVel;

    // Clamp to valid range
    state.energy = Math.max(0, Math.min(1, state.energy));
}

/**
 * Get energy multipliers for particle properties
 *
 * @param energy - Current energy level [0..1]
 * @returns Multipliers for speed, alpha, and size
 */
export function getEnergyMultipliers(energy: number): EnergyMultipliers {
    return {
        // Speed multiplier: idle 1.17x, burst up to 3.2x
        speedMul: 1 + 2.2 * energy,
        // Alpha multiplier: brighter during action
        alphaMul: 1 + 1.5 * energy,
        // Size multiplier: gentle size swell
        sizeMul: 1 + 0.35 * energy,
    };
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
