import { NextRequest, NextResponse } from 'next/server';
import {
    checkKitchenPassword,
    createSessionToken,
    kitchenAuthConfigurationState,
    KITCHEN_COOKIE,
    KITCHEN_SESSION_TTL_MS,
} from '@/lib/kitchenAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
    // Strict cap — this is the brute-force surface for the staff password.
    const limited = enforceRateLimit(req, 'kitchen-login', 8, 60_000);
    if (limited) return limited;

    const authState = kitchenAuthConfigurationState();
    // No password is an intentional convenience only outside production.
    if (authState === 'open-local') {
        return NextResponse.json({ ok: true, open: true });
    }
    if (authState === 'misconfigured') {
        return NextResponse.json({
            error: 'לוח המטבח אינו מוגדר כרגע',
            code: 'KITCHEN_AUTH_CONFIGURATION_ERROR',
        }, { status: 503 });
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
