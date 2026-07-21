import { NextRequest, NextResponse } from 'next/server';
import {
    checkKitchenPassword,
    createSessionToken,
    kitchenAuthEnabled,
    KITCHEN_COOKIE,
    KITCHEN_SESSION_TTL_MS,
} from '@/lib/kitchenAuth';

export async function POST(req: NextRequest) {
    // No password configured — the board runs open, so there's nothing to log
    // into. Report that so the client can just proceed.
    if (!kitchenAuthEnabled()) {
        return NextResponse.json({ ok: true, open: true });
    }

    let password: unknown;
    try {
        password = (await req.json())?.password;
    } catch {
        password = undefined;
    }

    // Small fixed delay to blunt online brute-forcing (there's no rate-limit
    // infrastructure; a strong password is the primary defense).
    await new Promise(r => setTimeout(r, 400));

    if (!checkKitchenPassword(password)) {
        return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(KITCHEN_COOKIE, createSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(KITCHEN_SESSION_TTL_MS / 1000),
    });
    return res;
}
