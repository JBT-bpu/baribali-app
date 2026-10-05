'use client';

import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../lib/motionHooks';
import { isPreparationChoice } from '../../../lib/summaryPresentation';
import { PANEL } from './heroBowlGeometry';
import styles from './HeroBowlCard.module.css';
import botanical from '../../ui/bari/BotanicalSurface.module.css';

/** All choices remain removable in one horizontal 44px rail.
 * Decorative artwork is not a quantity or nutrition representation. */
export default function HeroBowlCard({ all, ingredientCount = all.length, onRemove, lastAdd, max = 14 }) {
    const reducedMotion = usePrefersReducedMotion();
    const progress = Math.min(Math.max(ingredientCount / max, 0), 1);
    const foodPreview = all.filter(item => !isPreparationChoice(item) && item.icon?.startsWith('/')).slice(-3);
    const circumference = 2 * Math.PI * 44;

    return (
        <section className={`${styles.panel} ${botanical.surface}`} aria-label="הקערה והבחירות שלכם" data-bowl-panel>
            <div className={styles.art} aria-hidden="true">
                <svg viewBox="0 0 100 100" className={styles.ring}>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(229,210,145,0.14)" strokeWidth="2" />
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#d7bd62" strokeWidth="2" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
                </svg>
                <Image src="/builder-assets/builder-bowl-empty-v2.webp" alt="" width={96} height={96} sizes="96px" className={styles.base} />
                {foodPreview.map((item, index) => (
                    <img key={item.id} src={item.icon} alt="" className={styles.food}
                        style={{ left: (24 + index * 15) + '%', top: (foodPreview.length === 1 ? 26 : 22 + (index % 2) * 7) + '%', animationName: !reducedMotion && lastAdd === item.id ? styles.arrive : 'none' }} />
                ))}
            </div>
            <div className={styles.choices}>
                <div className={styles.counter} role="progressbar" aria-label="מרכיבי בסיס בקערה" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(ingredientCount, max)}>
                    {ingredientCount === 0 ? 'הקערה שלכם · מתחילים כאן' : <><bdi>{ingredientCount} / {max}</bdi> מרכיבי בסיס</>}
                </div>
                {all.length > 0 ? (
                    <>
                        <div className={styles.rail} data-horizontal-scroll role="group" aria-label="כל הבחירות בקערה — לחצו להסרה">
                            {all.map(item => (
                                <button key={item.id} type="button" aria-label={`הסר את ${item.he} מהקערה`} title={`הסר ${item.he}`}
                                    onClick={() => onRemove(item.id)} className={styles.choice}
                                    onFocus={event => event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })}
                                    style={{ animationName: !reducedMotion && lastAdd === item.id ? styles.choiceIn : 'none' }}>
                                    {item.icon?.startsWith('/') ? <img src={item.icon} alt="" width={PANEL.chipIcon} height={PANEL.chipIcon} /> : <UtensilsCrossed size={22} aria-hidden />}
                                </button>
                            ))}
                        </div>
                        <div className={styles.hint}>גללו · לחצו על רכיב להסרה</div>
                    </>
                ) : <div className={styles.empty}>בחרו את המרכיבים האהובים עליכם.<br />כל בחירה תופיע כאן.</div>}
            </div>
        </section>
    );
}
