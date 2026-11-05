# Time log: feat/signatories

- 23:16 start, fetch; no `test/question-flow-hardening` branch on origin yet. `npm run setup` 2 min 16 s.
- 23:23 schema: `CompanySignatory`, `SignatureRequest`, migration `20261105212314_signatories` (`prisma migrate dev` worked non-interactively). `valid_from` is nullable: null = the entry waits for its signing link (deviation from the brief, so a named stranger is never in force before the link is opened).
- 23:30 domain: `src/domain/signatories/mandates.ts` (half-open ranges: `valid_to` and `expires_on` are exclusive), record-check adds `q_email`, `q_monthly_income`, `q_can_sign`, `q_annual_revenue`; `signatory_is_applicant` also against the record e-mail; `whoDecides`.
- 23:45 server: `src/server/signatories.ts`, token path `decideByToken`, `onBehalfOf` for the admin (D45), seed.
- 23:55 routes, route table, openapi. 00:10 pages (sign, signatories list, decision-page demo outbox), question-flow error codes, keys in four languages.
- 00:15 merged origin/main (#26 hardening, #29, #30). Added the two new tables to `tests/helpers/reset-db.ts` (RESET_ORDER must name every model; deleting customers would otherwise hit the FK). Hardening session: please keep this.

## Left undone (usage limit reached)

- docs: D44, D45 and the amendments of D38–D40 in `docs/decisions.md`; `docs/features/signatories.md`; `docs/features/question-flow.md` update; lines in STATUS.md, docs/features/README.md and README Features.
- full `npm run check:all` (vitest passed piecewise; tsc and eslint clean before the merge); the PR.
- the decision page could link to the signatory list page.
