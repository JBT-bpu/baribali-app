import { cookies } from 'next/headers';
import {
    kitchenAuthConfigurationState,
    verifySessionToken,
    KITCHEN_COOKIE,
} from '@/lib/kitchenAuth';
import KitchenBoard from './KitchenBoard';
import KitchenLogin from './KitchenLogin';

// Always run the auth guard at request time — never let this page be served as
// a static asset, which would bypass the session check entirely.
export const dynamic = 'force-dynamic';

// Server-side gate: the session cookie is httpOnly (unreadable from client JS),
// so authorization is decided here before any board markup or data-fetching
// code reaches the browser. A missing password is open only outside production;
// a production deployment with no password stays on the locked screen.
export default async function KitchenPage() {
    const authState = kitchenAuthConfigurationState();
    const authEnabled = authState !== 'open-local';

    if (authState === 'misconfigured') return <KitchenLogin />;

    if (authState === 'configured') {
        const token = (await cookies()).get(KITCHEN_COOKIE)?.value;
        if (!verifySessionToken(token)) {
            return <KitchenLogin />;
        }
    }

    return <KitchenBoard authEnabled={authEnabled} />;
}
