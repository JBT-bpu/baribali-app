'use client';

import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useState, type Ref } from 'react';
import styles from './BuilderStartCard.module.css';

interface Props {
    buttonRef: Ref<HTMLButtonElement>;
    onStart: () => void;
    hasDraft: boolean;
    sizeLabel: string;
    price: number;
}

/** One native button. Artwork is decoration; all current facts stay readable. */
export default function BuilderStartCard({ buttonRef, onStart, hasDraft, sizeLabel, price }: Props) {
    const [artFailed, setArtFailed] = useState(false);
    const action = hasDraft ? 'המשיכו לבנות' : 'לחצו להתחיל לבנות';
    return (
        <button ref={buttonRef} type="button" onClick={onStart}
            className={`${styles.card} ${artFailed ? styles.fallback : ''}`}
            aria-label={`${action} סלט ${sizeLabel}`}>
            {!artFailed && <Image src="/builder-assets/start-hero-seal-v2.webp" alt="" aria-hidden fill
                priority sizes="(max-width: 430px) calc(100vw - 32px), 398px"
                className={styles.art} onError={() => setArtFailed(true)} />}
            <span className={styles.copy}>
                <span className={styles.title}>{hasDraft ? 'המשיכו לבנות את הסלט' : 'בנו את הסלט שלכם'}</span>
                <span className={styles.description}>{hasDraft ? 'הבחירות שלכם נשמרו · אפשר להמשיך לערוך' : '5 שלבים פשוטים · בחירה חופשית'}</span>
                <span className={styles.offer}>
                    <span>{sizeLabel}</span><span aria-hidden className={styles.divider} />
                    <bdi className={styles.price}>₪{price}</bdi>
                </span>
            </span>
            <span className={styles.action}>{action}<ArrowLeft size={20} strokeWidth={2.2} aria-hidden /></span>
        </button>
    );
}
