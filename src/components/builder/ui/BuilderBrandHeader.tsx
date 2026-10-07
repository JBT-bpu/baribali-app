import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './BuilderBrandHeader.module.css';

/** Only decorative edges may crop; the complete emblem and controls never do. */
export default function BuilderBrandHeader({ children, variant = 'entry' }: {
    children: ReactNode;
    variant?: 'entry' | 'summary';
}) {
    return (
        <header className={styles.header} data-builder-brand-header>
            <div className={styles.stage}>
                <div className={styles.wings} aria-hidden="true" data-brand-wings />
                <div className={styles.masthead}>
                    <Image
                        src="/builder-assets/builder-brand-emblem-v7.webp"
                        alt="BariBali"
                        fill
                        sizes="(max-width: 360px) 108px, (max-width: 440px) 30vw, 132px"
                        priority
                        unoptimized
                        className={styles.art}
                    />
                </div>
                <div className={styles.toolbar} data-variant={variant}>{children}</div>
            </div>
        </header>
    );
}
