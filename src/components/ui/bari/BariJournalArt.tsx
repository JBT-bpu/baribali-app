import Image from 'next/image';
import styles from './BotanicalSurface.module.css';

/** Decorative brand illustration; account/order facts remain native content. */
export default function BariJournalArt({ compact = false }: { compact?: boolean }) {
    return <Image src="/homepage-assets/order-journal-botanical-v1.webp" alt="" aria-hidden
        width={256} height={192} sizes={compact ? '112px' : '180px'}
        className={compact ? styles.journalCompact : styles.journal} />;
}
