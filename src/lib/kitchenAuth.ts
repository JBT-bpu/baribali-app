import { NextRequest } from 'next/server';

/**
 * Lightweight shared-secret gate for kitchen-only endpoints. This is NOT real
 * access control — the secret must be NEXT_PUBLIC_ (readable in the browser
 * bundle) since the kitchen board is a plain client page with no login system.
 * It only stops opportunistic bots hitting the API directly without ever
 * loading /kitchen. If NEXT_PUBLIC_KITCHEN_API_SECRET isn't configured, the
 * gate is a no-op (keeps local/demo dev working without extra setup).
 */
export function isKitchenAuthorized(req: NextRequest): boolean {
    const expected = process.env.NEXT_PUBLIC_KITCHEN_API_SECRET;
    if (!expected) return true;
    return req.headers.get('x-kitchen-secret') === expected;
}
