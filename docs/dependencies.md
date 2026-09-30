# Dependency maintenance

Updated 2026-09-27. Production deployment and rollback are recorded in the operations repository.

| Component | New version / approach |
|---|---|
| Node | 24 LTS (minimum 24.11, `.nvmrc`, build base `24-trixie-slim`, runtime `distroless/nodejs24-debian13:nonroot`) |
| Nuxt | 4.5.2, existing root directory layout retained through `srcDir` |
| Nuxt UI / Tailwind | 4.11.1 / 4; existing components migrated to current APIs |
| Prisma | 7.10.0 with `@prisma/adapter-pg`; connection pool limited to 5 |
| Nodemailer | 10.0.10 |
| Lucia / Prisma adapter | Removed; small database-session implementation in `server/utils/auth.ts` |
| nuxt-scheduler | Removed; node-cron 4.6.0, no overlapping callbacks, shutdown cleanup |
| Mailpit (local tests only) | 1.31.2, local ports bound to loopback |
| PostgreSQL | 16 remains supported; no data-format change required |

Nuxt 3 reached EOL on 2026-07-31 ([upstream](https://nuxt.com/docs/3.x/getting-started/upgrade));
Lucia was deprecated in March 2025 ([upstream](https://lucia-auth.com/)). Prisma 8's npm latest tag pointed
at a release candidate when checked; production therefore uses stable Prisma 7. The local npm minimum
release-age policy excludes releases less than seven days old (UI 4.11.2 and Nodemailer 10.0.11).

The update does not change database tables or discard sessions. The old `Key` table remains for rollback
compatibility but is unused. Existing session cookies and all email/widget tokens keep working. New session,
user and email/widget token identifiers use Node's cryptographic random generator. The existing active/idle
session lifetimes and Origin checks are retained. Nuxt 4 reuses `useFetch` data across navigation, so the
route middleware now fetches authentication afresh, including after logout.

Nuxt 4 also changes the SSR script order and emits an importmap. The CSP allows hashes only for the two
expected head scripts and the final config/data pair, pins their contents per process and rejects injected
lookalikes. No `unsafe-inline` was added for scripts. Icons are served locally; external font loading is disabled.

## Audit and overrides

Before: 71 npm audit findings (6 critical, 48 high, 12 moderate, 5 low).
After: 0 findings across the full lockfile, including development dependencies; no deprecated lockfile packages.
Audit results are a registry snapshot, not proof that no unknown vulnerabilities exist.

Four temporary overrides close upstream dependency gaps:

- `@prisma/config > deepmerge-ts ^8.0.2`: fixes recursive-graph stack exhaustion. Prisma uses `deepmerge`;
  both configuration loading and all database migrations are exercised with this override.
- `mysql2 ^3.24.0`: Prisma's tooling brings an unused MySQL driver; closes auth downgrade and decompression DoS.
- `esbuild ^0.28.2`: removes the vulnerable 0.27 development-server branch.
- `glob ^13.0.6`: removes Nitro/archiver's deprecated glob 10 branch. Node 24 supports glob 13.

Re-check the overrides on each upstream upgrade; remove them once upstream requires fixed versions.
Use `npm ci` under Node 24; do not run `npm audit fix --force` without reviewing the resulting major upgrades.
`prisma.config.ts` loads `.env` for CLI use; production gets its URL through Compose.

## Verification

Use only synthetic data and Mailpit locally. Existing shell tests print expected and actual values;
review their complete output, not just their exit status. Browser upgrade/CSP tests and inline-CSP tests
assert and fail on regressions.

The test scripts accept `PULSE_TEST_URL`, `PULSE_TEST_MAIL_URL`, `PULSE_TEST_DB`, and (scheduler logs)
`PULSE_TEST_APP`, so a separate Compose project can run alongside another local environment.
`NODE_PATH` / `PLAYWRIGHT_NODE_PATH` points to a separately installed Playwright.

Checked during this migration:

- Clean Docker build, Prisma client generation, all 33 migrations on an empty PostgreSQL database.
- `e2e-embed-api.sh`, `e2e-privacy.sh`, `e2e-research.sh`, `e2e-review-fixes.sh`, `e2e-security.sh`.
- `e2e-scheduler.sh`: real minute ticks, Berlin delivery times, weekly replacement, retention, pause/opt-out,
  failure isolation; `e2e-settings-tz.cjs` separately checks Berlin/New York browser settings.
- `e2e-upgrade.cjs`: legacy session renewal, expiry, CSRF, revocation, table search, detail dialogs, bulk archive,
  menus, settings, data download, mobile navigation, magic-link login, logout and form validation.
- `e2e-csp.cjs`: application/mail-answer pages, error page, light/dark mode and embedded demo;
  `csp-inline-scripts.test.mjs`: real SSR HTML and injection attempts.

Mail tests deliver only to the local Mailpit. The institutional SMTP delivery path needs a real-user login
check if a production end-to-end confirmation is desired.

The migration image prunes the already locked build dependencies offline to Prisma and dotenv only;
it does not ship the Nuxt build toolchain. This preserves space for the previous release on the 6 GB VM.

The production runtime is distroless (Debian 13, Node 24, uid 65532), without a shell, npm, Perl or
package-management tools. The full Debian/Node image scan exposed findings in these unused tools;
they are excluded from the serving image. Diagnostics use `docker exec web /nodejs/bin/node ...`.
