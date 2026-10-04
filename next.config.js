const { validateSupabaseEnvironment } = require('./scripts/validate-supabase-environment.cjs');

// Fail before Next can embed a misplaced server key in a browser bundle.
validateSupabaseEnvironment(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Opt-in local UI verification must not overwrite an already-running build.
    distDir: process.env.BARIBALI_UI_PREVIEW === '1' ? '.next-ui-preview' : '.next',
    ...(process.env.BARIBALI_UI_PREVIEW === '1' ? {
        typescript: { tsconfigPath: 'tsconfig.ui-preview.json' },
    } : {}),
    reactStrictMode: true,
    images: {
        remotePatterns: [],
    },
};

module.exports = nextConfig;
