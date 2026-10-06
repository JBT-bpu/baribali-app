import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './BuilderBrandHeader.module.css';

/** The selected botanical cartouche. Artwork and interactive UI never overlap. */
export default function BuilderBrandHeader({ children }: { children: ReactNode }) {
    return (
        <header className={styles.header} data-builder-brand-header>
            <div className={styles.masthead}>
                <Image
                    src="/builder-assets/builder-brand-cartouche-v3.webp"
                    alt="BariBali"
                    fill
                    sizes="(max-width: 430px) 100vw, 430px"
                    priority
                    unoptimized
                    className={styles.art}
                />
            </div>
            <div className={styles.toolbar}>{children}</div>
        </header>
    );
}
