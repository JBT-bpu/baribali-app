import { notFound } from 'next/navigation';
import MixingLab from './MixingLab';

export const metadata = { title: 'Mixing lab — BariBali' };

/**
 * Local-only preview for the post-order animation at every ingredient count.
 *
 * Gated on NODE_ENV so the route simply does not exist in a production build —
 * same posture as /dev/screens and /admin.
 */
export default function DevMixingPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <MixingLab />;
}
