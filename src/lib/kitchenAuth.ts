import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Real access control for the staff kitchen board — a single shared password
 * exchanged for a signed, httpOnly session cookie.
 *
 * Why this replaces the old NEXT_PUBLIC_KITCHEN_API_SECRET header: that value
 * shipped inside the browser bundle (any NEXT_PUBLIC_ var does), so anyone who
 * loaded /kitchen could read it and drive every order endpoint. Here the
 * password lives only in a server-side env var, and the browser only ever
 * holds an opaque httpOnly cookie it can't read from JS.
 *
 * The session token is self-verifying (stateless): `<expiry>.<HMAC(expiry)>`,
 * signed with a key derived from the password itself — so rotating the
 * password instantly invalidates every outstanding session, no store needed.
 *
 * If KITCHEN_PASSWORD is unset the board runs open only in local/test
 * development. Production fails closed so a missing deployment variable can
 * never expose staff actions.
 */

export const KITCHEN_COOKIE = 'bb_kitchen_session';
// The board lives on a wall tablet inside the shop, so a per-shift login was
// pure friction for staff. Rotating KITCHEN_PASSWORD still invalidates every
// outstanding session immediately (the signing key is derived from it), which
// is the lever to pull if a device ever goes missing.
export const KITCHEN_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function kitchenPassword(): string | undefined {
    return process.env.KITCHEN_PASSWORD?.trim() || undefined;
}

export type KitchenAuthConfigurationState = 'configured' | 'open-local' | 'misconfigured';

export function resolveKitchenAuthConfiguration(input: {
    nodeEnv?: string;
    password?: string;
}): KitchenAuthConfigurationState {
    if (input.password?.trim()) return 'configured';
    return input.nodeEnv === 'production' ? 'misconfigured' : 'open-local';
}

export function kitchenAuthConfigurationState(): KitchenAuthConfigurationState {
    return resolveKitchenAuthConfiguration({
        nodeEnv: process.env.NODE_ENV,
        password: process.env.KITCHEN_PASSWORD,
    });
}

export function kitchenAuthEnabled(): boolean {
    return kitchenAuthConfigurationState() === 'configured';
}

// HMAC key = SHA-256 of the password. Tying it to the password means a changed
// password can never validate an old cookie.
function signingKey(): Buffer {
    return crypto.createHash('sha256').update(kitchenPassword() ?? '').digest();
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function createSessionToken(): string {
    if (!kitchenAuthEnabled()) throw new Error('KITCHEN_AUTH_NOT_CONFIGURED');
    const expiry = String(Date.now() + KITCHEN_SESSION_TTL_MS);
    return `${expiry}.${sign(expiry)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
    if (!kitchenAuthEnabled()) return false;
    if (!token) return false;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return false;
    const expiry = token.slice(0, dot);
    const mac = token.slice(dot + 1);
    const expected = sign(expiry);
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const exp = Number(expiry);
    return Number.isFinite(exp) && Date.now() <= exp;
}

// Constant-time password check that also hides length (both sides hashed to a
// fixed 32 bytes before comparison).
export function checkKitchenPassword(candidate: unknown): boolean {
    const expected = kitchenPassword();
    if (!expected || typeof candidate !== 'string') return false;
    const h = (s: string) => crypto.createHash('sha256').update(s).digest();
    return crypto.timingSafeEqual(h(candidate), h(expected));
}

/**
 * Authorizes a kitchen API request from its session cookie. Open (returns
 * true) when no password is configured; otherwise requires a valid session.
 */
export function isKitchenAuthorized(req: NextRequest): boolean {
    const state = kitchenAuthConfigurationState();
    if (state === 'open-local') return true;
    if (state !== 'configured') return false;
    return verifySessionToken(req.cookies.get(KITCHEN_COOKIE)?.value);
}
