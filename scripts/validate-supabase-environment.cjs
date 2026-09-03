'use strict';

const PUBLIC_KEY_NAMES = [
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const ADMIN_KEY_NAMES = [
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
];

function jwtRole(value) {
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        return typeof payload.role === 'string' ? payload.role : null;
    } catch {
        return null;
    }
}

function keyKind(value) {
    const key = value?.trim() ?? '';
    if (!key) return 'empty';
    if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') return 'admin';
    if (key.startsWith('sb_publishable_') || jwtRole(key) === 'anon') return 'public';
    return 'unknown';
}

/**
 * Runs while Next loads its config, before NEXT_PUBLIC_* values are embedded
 * into browser chunks. Errors mention only variable names, never key material.
 */
function validateSupabaseEnvironment(environment = process.env) {
    for (const name of PUBLIC_KEY_NAMES) {
        if (keyKind(environment[name]) === 'admin') {
            throw new Error(`${name} contains a server-only Supabase key`);
        }
    }
    for (const name of ADMIN_KEY_NAMES) {
        if (keyKind(environment[name]) === 'public') {
            throw new Error(`${name} contains a public Supabase key`);
        }
    }
}

module.exports = { keyKind, validateSupabaseEnvironment };
