import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Access control for the local manager admin (/admin). A single ADMIN_PASSWORD
 * is exchanged for a signed, httpOnly session cookie — same self-verifying,
 * stateless token as the kitchen board (see src/lib/kitchenAuth.ts).
 *
 * CRITICAL DIFFERENCE from the kitchen: when ADMIN_PASSWORD is unset the admin
 * is fully LOCKED (not open). The admin is intended to run only on the owner's
 * machine, where ADMIN_PASSWORD lives in .env.local. It is deliberately NOT set
 * on Vercel, so /admin is inert in production. (The price/discount write routes
 * also can't work in production anyway — the serverless filesystem is
 * read-only — but the lock is the real guard.)
 */

export const ADMIN_COOKIE = 'bb_admin_session';
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // a workday

function adminPassword(): string | undefined {
    return process.env.ADMIN_PASSWORD || undefined;
}

export function adminAuthEnabled(): boolean {
    return !!adminPassword();
}

function signingKey(): Buffer {
    return crypto.createHash('sha256').update(adminPassword() ?? '').digest();
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

export function createAdminToken(): string {
    const expiry = String(Date.now() + ADMIN_SESSION_TTL_MS);
    return `${expiry}.${sign(expiry)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
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

export function checkAdminPassword(candidate: unknown): boolean {
    const expected = adminPassword();
    if (!expected || typeof candidate !== 'string') return false;
    const h = (s: string) => crypto.createHash('sha256').update(s).digest();
    return crypto.timingSafeEqual(h(candidate), h(expected));
}

/**
 * Authorizes an admin API request. Unlike the kitchen, an unconfigured admin
 * is LOCKED (returns false) — never open.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
    if (!adminAuthEnabled()) return false;
    return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}
