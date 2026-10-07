'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import styles from './BariMeterFrame.module.css';

/** Decorative artwork stretches at its quiet rails; the real data drives height. */
export default function BariMeterFrame({ children, bowl }: { children: ReactNode; bowl: ReactNode }) {
    return (
        <section className={styles.frame} aria-label="BariMeter — הרכב ההזמנה">
            <div className={styles.frameArt} aria-hidden="true" />
            <h2 className={styles.srOnly}>BariMeter</h2>
            <div className={styles.content}>
                {children}
                <div className={styles.bowl}>
                    <Image
                        src="/builder-assets/barimeter-atelier-bowl-v1.webp"
                        alt=""
                        width={960}
                        height={543}
                        className={styles.bowlArt}
                        sizes="(max-width: 430px) 85vw, 314px"
                    />
                    {bowl}
                </div>
            </div>
        </section>
    );
}
