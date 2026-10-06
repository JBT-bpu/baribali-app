'use client';

import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useState, type Ref } from 'react';
import BuilderArtFrame from './BuilderArtFrame';
import layers from './BuilderArtFrame.module.css';
import styles from './BuilderStartCard.module.css';

interface Props {
    buttonRef: Ref<HTMLButtonElement>;
    onStart: () => void;
    hasDraft: boolean;
    sizeLabel: string;
    price: number;
}

/** One native button: frame, bowl and plaque are independent decorative layers. */
export default function BuilderStartCard({ buttonRef, onStart, hasDraft, sizeLabel, price }: Props) {
    const [artFailed, setArtFailed] = useState(false);
    const action = hasDraft ? 'המשיכו לבנות' : 'לחצו להתחיל לבנות';

    return (
        <button ref={buttonRef} type="button" onClick={onStart}
            className={`${styles.card} ${artFailed ? styles.fallback : ''}`}
            data-layered-start-card
            aria-label={`${action} סלט ${sizeLabel}`}>
            <BuilderArtFrame />
            <span className={styles.body}>
                {!artFailed && <span className={styles.food}>
                    <Image src="/builder-assets/entry-bowl-layer-v1.webp" alt="" aria-hidden width={448} height={448}
                        priority sizes="(max-width: 349px) 124px, 160px"
                        className={styles.bowl} onError={() => setArtFailed(true)} />
                </span>}
                <span className={styles.copy}>
                    <span className={styles.title}>{hasDraft ? 'המשיכו לבנות את הסלט' : 'בנו את הסלט שלכם'}</span>
                    <span className={styles.description}>{hasDraft ? 'הבחירות שלכם נשמרו · אפשר להמשיך לערוך' : '5 שלבים פשוטים · בחירה חופשית'}</span>
                    <span className={styles.offer}>
                        <span>{sizeLabel}</span><span aria-hidden className={styles.divider} />
                        <bdi className={styles.price}>₪{price}</bdi>
                    </span>
                </span>
            </span>
            <span className={`${layers.action} ${styles.action}`}>{action}<ArrowLeft size={20} strokeWidth={2.2} aria-hidden /></span>
        </button>
    );
}
