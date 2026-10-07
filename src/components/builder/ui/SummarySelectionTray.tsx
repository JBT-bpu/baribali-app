import type { Ref } from 'react';
import { ClipboardCheck, Pencil } from 'lucide-react';
import { effectiveItemPrice } from '@/lib/menuConfig';
import { isPreparationChoice, preparationLabel, summaryGroupCountLabel } from '@/lib/summaryPresentation';
import styles from './SummaryTray.module.css';

type Choice = { id: string; he: string; icon?: string; price: number };
type ChoiceGroup = { s: { id: string; title: string }; items: Choice[] };

export default function SummarySelectionTray({
    groups, disabled, highlightedStep, onEdit, sectionRef,
}: {
    groups: ChoiceGroup[];
    disabled: boolean;
    highlightedStep: string | null;
    onEdit?: (stepId: string) => void;
    sectionRef?: Ref<HTMLDivElement>;
}) {
    return (
        <div ref={sectionRef} id="summary-selections" role="region" aria-label="בחירות ההזמנה"
            tabIndex={-1} className={styles.groups} data-summary-trays>
            {groups.length === 0 && <p className={styles.empty}>עדיין לא נוספו בחירות להזמנה.</p>}
            {groups.map(({ s, items }) => (
                <section
                    key={s.id}
                    aria-label={`${s.title} — ${items.length} בחירות`}
                    className={styles.tray}
                    data-summary-group={s.id}
                    data-muted={Boolean(highlightedStep && highlightedStep !== s.id)}
                >
                    <header className={styles.trayHeader}>
                        {onEdit && (
                            <button type="button" className={styles.edit} disabled={disabled}
                                aria-label={`עריכת ${s.title}`} onClick={() => onEdit(s.id)}>
                                <Pencil size={16} aria-hidden="true" /><span>עריכה</span>
                            </button>
                        )}
                        <h2 className={styles.trayTitle}>{s.id === 'veggies' ? 'הבחירות שלכם' : s.title}</h2>
                        <span className={styles.groupCount}>
                            {summaryGroupCountLabel(items, s.id)}
                        </span>
                    </header>
                    <ul className={s.id === 'sauces' ? styles.sauces : styles.ingredients}>
                        {items.map(item => {
                            const price = effectiveItemPrice(item.id, item.price);
                            const preparation = isPreparationChoice(item);
                            return (
                                <li key={item.id} className={styles.item} data-preparation={preparation}>
                                    <div className={styles.food}>
                                        {preparation || !item.icon?.startsWith('/')
                                            ? <ClipboardCheck size={28} aria-hidden="true" />
                                            : <img src={item.icon} alt="" width={72} height={72} loading="lazy" decoding="async" />}
                                        {price > 0 && <span className={styles.supplement}><bdi dir="ltr">+₪{price}</bdi></span>}
                                    </div>
                                    <span className={styles.itemName}>{preparation ? preparationLabel(item) : item.he}</span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
