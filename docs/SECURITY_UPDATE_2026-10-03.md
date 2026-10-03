# Security dependency update — 2026-10-03

This is a dependency-only phase; it does not change checkout or visual design.

- Next.js and its matching ESLint configuration are pinned to 16.3.8 (from 16.2.10).
- Direct PostCSS is pinned to 8.5.28. Compatible transitive fixes were refreshed
  for Sharp, Nano ID, WebSocket, browser-baseline mapping, brace expansion,
  Browserslist, JS-YAML and Picomatch in the lockfile.
- `npm audit --omit=dev`: zero known vulnerabilities after the update.
- Full audit still reports five development-only affected packages in the
  `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next`
  chain. The current braces release is still 3.0.3; the proposed audit downgrade
  to Next.js ESLint 14 is incompatible with this Next.js 16 project and is not
  applied. Review again when an upstream compatible fix is published.

The Windows-hosted Next.js vulnerability is especially relevant to local
development: https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36.
The app does not currently use `next/og` / `ImageResponse`; do not claim that
every published Next.js exploit applies to this application.

Verification: typecheck, lint (the existing nine warnings), all 192 focused
regression tests and a production build. Not pushed, merged or deployed.
