import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { findDiscount } from '@/lib/discounts';
import { setCustomerTag, removeCustomerTag } from '@/lib/customerTags';

/**
 * Assign or clear a customer's standing discount "tag" (manager admin only).
 * Body: { userId: string, discountCode: string | null }.
 *   - a valid, existing discount code → assigned to that customer
 *   - null / empty → the tag is removed
 * Unlike prices/discounts this writes to Supabase (live), so an approval takes
 * effect at the customer's very next order without a deploy.
 */
export async function POST(req: NextRequest) {
    if (!isAdminAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { userId?: unknown; discountCode?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 });
    }

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 });

    const rawCode = typeof body.discountCode === 'string' ? body.discountCode.trim() : '';

    // Empty code → clear the tag.
    if (!rawCode) {
        const ok = await removeCustomerTag(userId);
        return ok
            ? NextResponse.json({ ok: true, discountCode: null })
            : NextResponse.json({ error: 'הסרת התגית נכשלה — ודא/י שהטבלה customer_tags קיימת ב-Supabase.' }, { status: 500 });
    }

    // Assign — only a code that actually exists in the catalog (active or not).
    const discount = findDiscount(rawCode) ?? null;
    if (!discount) return NextResponse.json({ error: 'קוד הנחה לא קיים או לא פעיל' }, { status: 400 });

    const ok = await setCustomerTag(userId, discount.code);
    return ok
        ? NextResponse.json({ ok: true, discountCode: discount.code })
        : NextResponse.json({ error: 'שמירת התגית נכשלה — ודא/י שהטבלה customer_tags קיימת ב-Supabase.' }, { status: 500 });
}
