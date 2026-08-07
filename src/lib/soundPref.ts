/**
 * The `bb-sound` preference — shared, because more than one screen makes noise.
 *
 * This used to live inside BariBaliBuilder.jsx, which meant the toggle in the
 * builder header governed the builder's micro-sounds and nothing else. The
 * mixing screen called its chime and success arpeggio unconditionally, so
 * someone who had explicitly muted the app got the two LOUDEST sounds in it, at
 * the end, with no way to stop them. That also matters in the shop: the kitchen
 * tablet is wall-mounted next to an extractor, and staff reach for a mute.
 *
 * The module-level cache has to live HERE rather than in either consumer. Two
 * copies of it would drift the moment one file wrote and the other had already
 * read — the toggle would appear to work and then silently not apply.
 *
 * Plain .ts (no 'use client'): it is a leaf module with no React in it, imported
 * by client components, and every entry point is guarded for SSR.
 */

const SOUND_KEY = 'bb-sound';

/** null = preference not read yet. */
let soundEnabled: boolean | null = null;

/** Default ON: a first-time visitor should hear the thing that was designed. */
export function readSoundPref(): boolean {
    try {
        return localStorage.getItem(SOUND_KEY) !== '0';
    } catch {
        return true; // private mode / storage disabled — sound is not worth failing over
    }
}

export function setSoundPref(on: boolean): void {
    soundEnabled = on;
    try {
        localStorage.setItem(SOUND_KEY, on ? '1' : '0');
    } catch { /* the choice still holds for this session via the cache above */ }
}

/** The one function callers should reach for before making any noise. */
export function isSoundOn(): boolean {
    if (soundEnabled === null) soundEnabled = readSoundPref();
    return soundEnabled;
}
