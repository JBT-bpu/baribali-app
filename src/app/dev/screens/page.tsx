import { notFound } from 'next/navigation';
import DeviceLab from './DeviceLab';

export const metadata = { title: 'Device lab — BariBali' };

/**
 * Local-only screen simulator: every route rendered side by side at real
 * device sizes, for eyeballing layout/spacing/overflow in one pass.
 *
 * Gated on NODE_ENV so the route simply does not exist in a production build —
 * same posture as /admin, and it keeps a dev tool off the public site.
 */
export default function DevScreensPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <DeviceLab />;
}
