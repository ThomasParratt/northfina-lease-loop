# Audit seal (D80): time log

Branch `feat/audit-signing` from `main` at `9d16dd5`, in the main checkout (one session, no slot). Real clock (Helsinki). The two next steps D36 left in `docs/features/audit-chain.md`: sign each row, anchor the head outside the database.

- 09:40 the question from the user; the choices asked and answered: Ed25519 (not HMAC), a local anchor file plus an RFC 3161 script (not an outside call from the app), a PR left open for the team.
- 09:45 branch; read RULES.md (§10 "no secrets": the key is the one exception, D80), `src/server/audit.ts`, `src/domain/audit/`, the tests' database helpers.
- 09:46 to 09:48 `seal.test.ts` first, then `seal.ts`: the pure verifier with the signature check passed in. Commit `d284709`.
- 09:48 to 09:56 the migration `audit_seal` (`npm run db:migrate`; `prisma generate` by hand after it), `audit-signing.ts`, `audit-anchors.ts`, `withAudit` and the verifier, the route schema, the badge and the keys in four languages, a key per test run, the reset clearing the anchor file.
- 09:50 blocked for a minute: the shell's `node` is 24 and `better-sqlite3` is built for the pinned 22 (`.nvmrc`); every DB test failed until `~/.nvm/versions/node/v22.22.2/bin` went first on the PATH. Not a code problem; not changed.
- 09:57 `npm run openapi`; commit `be5947d`.
- 09:58 to 10:01 `ensure-env` (the key), `clear-audit-anchors`, `demo:tamper --rewrite`, `audit:anchor` (+ tests); a run against freetsa.org on a scratch database: stamped, rewritten, caught three ways. Commit `21cc711`.
- 10:01 to 10:04 D80, the feature page, STATUS, the demo, the submission draft, the README.

- 10:04 `npm run check:all`: one failure, the organiser's README line for `db:setup` had been edited (`tests/readme-original.test.ts`); reverted, the new command row kept.
- 10:08 `npm run check:all` green (1 717 tests, coverage 96 % lines, build); push, PR.

## Left undone

- Not merged: the PR is for the team (D80 is "proposed").
- Existing local databases have unsigned rows: the audit page reads `unsigned_in_chain` until `npm run db:reset`. Each teammate's `.env` gets its key from `npm run dev` (predev) or `db:setup`.
- No scheduled stamping and no key rotation (the feature page's open questions).
- The page was not checked in a browser at 375 px; the badge is three pills that wrap.
