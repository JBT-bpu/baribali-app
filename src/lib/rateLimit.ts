import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight in-memory rate limiter — fixed window, keyed by client IP +
 * bucket name. Its job is to blunt scripted abuse (order spam, payment-init
 * hammering, kitchen-password brute-forcing) on an app that otherwise has no
 * throttling anywhere.
 *
 * Caveat: the store is per-process. On Vercel's serverless functions each
 * instance has its own map and cold starts reset it, so limits are
 * approximate, not global. That's an acceptable deterrent for a single small
 * shop; a hard, distributed limit would need a shared store (Vercel KV /
 * Upstash Redis) — deferred until there's a reason to add that dependency.
 */

interface Bucket { count: number; resetAt: number }

const store = new Map<string, Bucket>();
let lastSweep = 0;

// Occasionally drop expired buckets so the map can't grow without bound.
function sweep(now: number) {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [k, b] of store) {
        if (now >= b.resetAt) store.delete(k);
    }
}

export function clientIp(req: NextRequest): string {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return req.headers.get('x-real-ip') || 'unknown';
}

interface RateResult { ok: boolean; retryAfter: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
    const now = Date.now();
    sweep(now);
    const b = store.get(key);
    if (!b || now >= b.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfter: 0 };
    }
    if (b.count >= limit) {
        return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
    }
    b.count++;
    return { ok: true, retryAfter: 0 };
}

/**
 * Enforces a limit for `bucket` on this request's client IP. Returns a ready
 * 429 response when exceeded, or null to proceed. Usage:
 *
 *   const limited = enforceRateLimit(req, 'orders', 10, 60_000);
 *   if (limited) return limited;
 */
export function enforceRateLimit(req: NextRequest, bucket: string, limit: number, windowMs: number): NextResponse | null {
    const { ok, retryAfter } = rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs);
    if (ok) return null;
    return NextResponse.json(
        { error: 'יותר מדי בקשות. נסו שוב עוד רגע.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
}
