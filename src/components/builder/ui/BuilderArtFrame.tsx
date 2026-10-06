import styles from './BuilderArtFrame.module.css';

/** Decoration only: native content owns geometry, meaning and interaction. */
export default function BuilderArtFrame({ variant = 'hero' }: { variant?: 'hero' | 'recipe' }) {
    return <span aria-hidden="true" data-art-frame={variant}
        className={`${styles.frame} ${variant === 'recipe' ? styles.recipe : styles.hero}`} />;
}
