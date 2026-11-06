# User portal: time log

Branch `feat/user-portal` from `main` at `b7817d1`, slot `vigorous-pare-5aac81`. Real clock (Helsinki).

- 06:21 base check (`main` = `b7817d1`), branch renamed, `npm run setup` and `npm run db:setup` in the background; read the leases page, the invoices and exits servers, the invoicing status and the exit plan's gate.
- 06:23 `src/domain/portal/`: `groupInvoices` and `endOfTermChoices`, tests first on cards 1 and 8 (the exit invoice is due on the exit day, corrected in the test). Commit `1da1abb`.
- 06:26 `listCustomerInvoices` in `src/server/invoices.ts` through `listContracts`, two tests on the migrated database.
- 06:27 to 06:30 the page: rows moved to `rows.tsx`, `portal.tsx` and `portal-data.ts`, `/customers/[id]`, the message keys in four files, `id="exit"` on the exit card. Typecheck and lint clean.
- 06:31 checked on the dev server: admin, Aino, Olavi on Aino's page, an unknown id, 375 px.
- 06:33 to 06:40 D75 (kept to the table's widths), `docs/features/user-portal.md`, the old page's pointer, the README Features line.
- 06:41 `npm run check:all`, push, PR.

## Left undone

- The Pay link opens the contract page, not one invoice (no anchor per invoice in the invoice table, which is not this slice's).
- `docs/features/STATUS.md` and the README Status section are the hardening agent's; the portal is not in them yet.
- The `fix/authz` session can swap the page's D26 check for `src/server/authorize.ts`; the "Applied on" line now lives in `src/app/[locale]/leases/rows.tsx` (moved unchanged from the page).
