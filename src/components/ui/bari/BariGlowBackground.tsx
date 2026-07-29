/**
 * Ambient gold-glow backdrop — a static, self-contained glow for panels,
 * modals and hero sections that want the brand ambiance without mounting the
 * animated particle field (components/ui/GoldField).
 */
export default function BariGlowBackground({ className = '' }: { className?: string }) {
    return (
        <div
            className={['pointer-events-none absolute inset-0 overflow-hidden', className].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            <div
                className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(200,168,78,0.18) 0%, transparent 70%)' }}
            />
            <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(200,168,78,0.06) 0%, transparent 70%)' }}
            />
        </div>
    );
}
