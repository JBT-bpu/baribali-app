import { NextRequest, NextResponse } from 'next/server';
import {
    checkAdminPassword,
    createAdminToken,
    adminAuthEnabled,
    ADMIN_COOKIE,
    ADMIN_SESSION_TTL_MS,
} from '@/lib/adminAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    const limited = enforceRateLimit(req, 'admin-login', 8, 60_000);
    if (limited) return limited;

    // No password configured — the admin is disabled on this deployment.
    if (!adminAuthEnabled()) {
        return NextResponse.json({ error: 'admin disabled' }, { status: 403 });
    }

    let password: unknown;
    try {
        password = (await req.json())?.password;
    } catch {
        password = undefined;
    }

    await new Promise(r => setTimeout(r, 400)); // brute-force friction

    if (!checkAdminPassword(password)) {
        return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createAdminToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    });
    return res;
}
