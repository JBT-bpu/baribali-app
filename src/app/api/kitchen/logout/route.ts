import { NextResponse } from 'next/server';
import { KITCHEN_COOKIE } from '@/lib/kitchenAuth';

export async function POST() {
    const res = NextResponse.json({ ok: true });
    // Expire the session cookie immediately.
    res.cookies.set(KITCHEN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
}
