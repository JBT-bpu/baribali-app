import { cookies } from 'next/headers';
import { kitchenAuthEnabled, verifySessionToken, KITCHEN_COOKIE } from '@/lib/kitchenAuth';
import KitchenBoard from './KitchenBoard';
import KitchenLogin from './KitchenLogin';

// Always run the auth guard at request time — never let this page be served as
// a static asset, which would bypass the session check entirely.
export const dynamic = 'force-dynamic';

// Server-side gate: the session cookie is httpOnly (unreadable from client JS),
// so authorization is decided here before any board markup or data-fetching
// code reaches the browser. When no KITCHEN_PASSWORD is configured the board
// runs open (local/demo dev).
export default async function KitchenPage() {
    const authEnabled = kitchenAuthEnabled();

    if (authEnabled) {
        const token = (await cookies()).get(KITCHEN_COOKIE)?.value;
        if (!verifySessionToken(token)) {
            return <KitchenLogin />;
        }
    }

    return <KitchenBoard authEnabled={authEnabled} />;
}
