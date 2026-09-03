const { validateSupabaseEnvironment } = require('./scripts/validate-supabase-environment.cjs');

// Fail before Next can embed a misplaced server key in a browser bundle.
validateSupabaseEnvironment(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [],
    },
};

module.exports = nextConfig;
