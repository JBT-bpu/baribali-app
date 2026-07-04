import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
    {
        // Non-app scratch/reference directories that next lint's old
        // scoping never covered — keep them out of the flat config too.
        ignores: [
            'opus_help/**',
            'design-assets/**',
            'lottie/**',
            'Local TECH/**',
            'plans/**',
        ],
    },
    ...nextCoreWebVitals,
    {
        rules: {
            'react/no-unescaped-entities': 'off',
            '@next/next/no-img-element': 'off',
            // eslint-config-next 16 bundles a newer eslint-plugin-react-hooks
            // with new React-Compiler-era rules that flag several pre-existing
            // patterns across the app (setState-in-effect, ref reads during
            // render, Date.now() in an effect). Fixing these properly means
            // real behavioral refactoring, which is out of scope for this
            // upgrade-only pass — downgraded to warn so they stay visible as
            // tracked follow-up work instead of silently suppressed or
            // blocking the build.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/purity': 'warn',
        },
    },
];

export default config;
