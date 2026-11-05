# Exits: buy out, return, pass on and the early exit (wave 2)

## What it does

A customer (or admin) ends an active contract by buying the item, giving it back or passing it on to a named person, at the end of the term or early; the contract page shows what each exit costs today, line by line, before anything is written. The exit writes the contract's status and end day, bills the buyout or early-exit invoice, cancels the unpaid rents it replaces, sets the asset `sold` or `returned` and writes the passport entry, all in one audited transaction.

## The rule

**Early exit (D14), before the end date:**

- buy = the outstanding balance after the paid rents: the financed amount amortised at the band's annual rate with the monthly rent (`outstandingBalanceAfter` from invoicing, not re-implemented);
- return or pass on = max(0, balance − market value) + the refurbishment to `good`, the leasable condition (the note of `data/refurbishment-costs.json`: a returned item must reach at least good to be leased again).

**On or after the end date** (the contract's last day): buy = the frozen buyout; return or pass on = only the refurbishment.

**Market value** (`data/residual-curves.json`, read exactly as its `how_to_use` says): net list price at the first lease × curve(age) × condition multiplier × usage adjustment.

- Age (D11): whole months from 1 January of the model year to the valuation day.
- Curve: linear interpolation between the two points around the age; the last value is held beyond the last point.
- Usage: `percent_per_step` for each whole `step` of usage, never beyond `max_total_percent` (e-bike: −2 % per 1 000 km, at most −20 %).
- Rounding (D1): each factor becomes an exact integer (the curve as a fraction of basis points, the condition in millionths, the usage in basis points). The product is taken in BigInt and rounded half up to the cent once.

**Refurbishment** (`data/refurbishment-costs.json`): the fixed steps whose `when` holds, in file order, then the condition upgrades one step at a time up to the target. The `when` texts are parsed, not hard-coded: `always`, `usage.value >= N unit`, `per started N unit since last service`. Any other text throws. A `resets_usage` step sets the usage to 0 afterwards.

**The contract status (the rule for `ended_early`):** on or after the end date the status is `bought`, `returned` or `passed_on`, by the mode. Before it the status is `ended_early` whatever the mode: a buy before the end is still a buy (CONTRACT_BOUGHT_OUT, the asset `sold`), but the contract did not run its term. `ended_on` is the exit day either way.

**The bill:**

- A buy issues one invoice: kind `buyout` on or after the end (the frozen buyout), kind `early_exit` before it (the D14 balance).
- A return or pass-on before the end issues one `early_exit` invoice for its cost. On or after the end it issues none (see open questions).
- An amount of 0 is not a refusal, but no invoice is issued for it.
- The invoice is issued and due on the exit day, at the VAT rate of that day (D2), with the next sequence number.

**The rents cancelled:** before the end, every unpaid rent gets the new status `cancelled`. The D14 balance after the paid rents already contains every rent not paid, so keeping one, even an overdue one, would bill it twice. Paid rents, including rents paid in advance, stay paid and count in the balance. On or after the end nothing is cancelled. The invoice table shows a cancelled rent as "Cancelled" and leaves it out of the total.

### Card 8, worked line by line

Card 1: `ebike-003` (Nordvolt Trail 500, model year 2026), 36 months, no down payment, signed and started 2026-11-05, financed 389 000, band B (7.9 % a year), rent 10 730 net, buyout 58 350, last day 2029-11-04. Aino has paid 7 rents and leaves on **2027-06-04**, the last day of month 7. She reports **good, 1 800 km** (an assumption of the tests: the pack says nothing about her bike).

| Line                                            | Buy                        | Return / pass on           |
| ----------------------------------------------- | -------------------------- | -------------------------- |
| Rents paid                                      | 7 of 36                    | 7 of 36                    |
| Still owed after 7 rents (D14)                  | 330 675                    | 330 675                    |
| For comparison: the 29 rents still to come      | 311 170                    | –                          |
| For comparison: the buyout at the end           | 58 350                     | –                          |
| Market value today                              | –                          | − 202 523                  |
| Still owed after the value, never below 0       | –                          | = 128 152                  |
| Refurbishment: safety inspection (always)       | –                          | + 4 500                    |
| **You pay, net**                                | **330 675**                | **132 652**                |
| Invoice (kind `early_exit`, 26 % on 2027-06-04) | 330 675 + 85 976 = 416 651 | 132 652 + 34 490 = 167 142 |
| Contract status                                 | `ended_early`              | `ended_early`              |
| Rents cancelled                                 | 29 (8 to 36)               | 29                         |

Market value: age (D11) = 12 × (2027 − 2026) + (6 − 1) = **17 months**. The curve between 12 months (70 %) and 24 months (52 %) gives 70 − 18 × 5 / 12 = **62.5 %**. Good is × 0.85; 1 800 km is one whole step, −2 %, so × 0.98. 389 000 × 0.625 × 0.85 × 0.98 = 202 523.125, so **202 523**. As new with 0 km it would be 389 000 × 0.625 = **243 125**, and the return 330 675 − 243 125 + 4 500 = 92 050.

**The gap from the brief's 311 200.** The brief pins card 8's market value at 311 200. That is 389 000 × **80 %**, the curve at **7 months** (82 % at 6, 70 % at 12, so 82 − 2), new, 0 km: the age counted from the start of the lease, not from the model year. D11 counts from 1 January 2026, so the data gives 17 months and 243 125 (as new). The tests pin what D11 and the pack give. `market-value.test.ts` also reproduces 311 200 with `monthsBetween('2026-11-05', '2027-06-05')` to show where the number comes from. For a first-life item the contract's start date is the first-lease date, so the decision may want to change; see open questions.

### Card 9 and card 10: the exits they start from

- Card 9, `ebike-007` (fair, 18 400 km): `refurbishmentPlan` gives the battery 35 000 (18 400 ≥ 15 000 km, resets the usage to 0) + the safety inspection 4 500 = 39 500 to keep it fair, + fair->good 12 000 = 51 500 to reach good. Wave 3's assessment and re-pricing (D12) import this and `marketValueCents`.
- Card 10, `ebike-008` (good, 9 800 km): 9 whole steps, −18 % on the market value; only the inspection to keep it good.
- A return or pass-on sets the asset `returned` with the reported condition and usage, the state cards 9 and 10 start from. Pass-on writes `passed_on` in the passport with the next customer.

## Decisions

- **D11**: the age from 1 January of the model year (`ageInMonths`).
- **D14**: the balance by amortisation, buy = balance, return = max(0, balance − market value) + refurbishment, shown line by line.
- **D16**: pass on names the next person (a picker of the customers, the leaving customer left out). It is assessed and costed like a return. The next person's application and the new contract with `previous_contract_id` are wave 3.
- **D22**: `CONTRACT_BOUGHT_OUT` sets the asset `sold`; `UNIT_RETURNED` and `UNIT_PASSED_ON` set it `returned`, on the bus (`src/server/catalogue-handlers.ts`), each a conditional write on `leased`.
- **D23**: every status (the contract's, the invoice's, the asset's), mode, condition, reason and invoice kind is parsed with its schema before use or write; a bad value throws.
- **D1, D2**: one half-up rounding per amount, the VAT per invoice line at the rate of the invoice day.
- The rule for `ended_early` and the cancelled rents are this slice's: written above and listed under open questions for `docs/decisions.md`.

## Pure functions

- `ageInMonths(modelYear, isoDay) → number` (`src/domain/residual/age.ts`): D11, at least 0. `monthsBetween(fromIso, toIso) → number`: whole months, the day clamped like the invoice periods.
- `marketValueCents({ listPriceCents, category, ageMonths, condition, usage }, curves) → { valueCents, ageMonths, curvePercent, conditionMultiplier, usageSteps, usageAdjustmentPercent }` (`src/domain/residual/market-value.ts`). The page fields (`curvePercent`, …) are for display; the value uses the exact fractions. `curvePercent(points, age)` and `usageAdjustment(rule, usage)` are exported too.
- `refurbishmentPlan({ category, condition, usage, targetCondition }, costs) → { steps, fixedCents, upgradeCents, totalCents, usageAfter, conditionAfter }` (`src/domain/refurbishment/plan.ts`). A step is `{ kind: 'fixed', id, costCents, resetsUsage, quantity }` or `{ kind: 'upgrade', id, from, to, costCents }`. `parseWhenRule(text)` throws on an unknown rule.
- `earlyExitCost({ contract, annualInterestPercent, invoices, today, asset, reported, curves, costs }) → { atOrAfterEnd, monthsPaid, balanceCents, balanceRows, remainingRentsNetCents, marketValue, refurbishment, buy, return }` (`src/domain/exits/early-exit.ts`). `buy` and `return` are `{ totalCents, lines }`. A line is `{ code, effect: add | subtract | subtotal | info | total, params }`, with every amount in `params.amountCents`.
- `planExit({ contract, mode, today, reported, reason?, nextCustomerId?, invoices, asset, annualInterestPercent, curves, costs, vatRates }) → { ok, plan: { mode, reason, status, endedOn, event, invoice, cancelInvoiceIds, cost } } | { ok: false, reason: { code, params } }` (`src/domain/exits/exit-plan.ts`). The refusals are `contract_not_active`, `not_started` (an exit before the start date, so `ended_on` is never before `start_date`), `pass_on_needs_next_customer`, `next_customer_is_self`, `reason_mismatch`, `usage_unit_mismatch` and `no_vat_rate_on_date`. The event is built and parsed with the schemas of `src/domain/events.ts`.
- `exitBilling({ mode, cost, today, invoices, vatRates }) → { invoice, cancelInvoiceIds }`: the bill alone, so the invoice handler recomputes the same bill from the event.

## Files

- Domain: `src/domain/residual/age.ts`, `src/domain/residual/market-value.ts`, `src/domain/refurbishment/plan.ts`, `src/domain/exits/early-exit.ts`, `exit-plan.ts`, `mode.ts`, `index.ts`. `cancelled` was added to `invoiceStatuses` in `src/domain/statuses.ts`; its badge tone was already there.
- Server: `src/server/exit-schemas.ts` (the contract), `src/server/exit-data.ts` (reads the contract, asset and invoices through their owners' read functions and builds the planner input; shared by the service and the invoice handler), `src/server/exits.ts` (`previewExit`, `exitContract`), the exit handlers in `src/server/invoice-handlers.ts` (`handleExit`), the asset handlers in `src/server/catalogue-handlers.ts` (`sellLeasedAsset`, `returnLeasedAsset`, registered by one import in `src/server/event-handlers.ts`), and the two rows in `src/server/routes.ts`.
- Routes: `GET /api/contracts/[id]/exit-preview?mode=&condition=&usageValue=` and `POST /api/contracts/[id]/exit` with the body `{ mode, reason?, condition, usage: { unit, value }, nextCustomerId? }`. The day is `todayForRequest()`, never one from the browser. Only the customer or admin may call them.
- UI: `src/components/exit-preview.tsx` (the lines in the visitor's language), `src/components/exit-form.tsx` (client: the three choices, the condition, the usage, the next person, a live preview, the submit), `src/components/contract-exit.tsx` (the self-contained server section: the preview and form for an active contract, the ended notice after), mounted with one line below `ContractSummary` in `src/app/[locale]/contracts/[id]/page.tsx`, the cancelled rows and the kind labels in `src/components/invoice-table.tsx`, and the `exit.*`, `invoice.kind.*` and `invoice.status.cancelled` keys in en/fi/sv/et.

## Tests that pin the numbers

- `src/domain/residual/age.test.ts`: 17 months on 2027-06-05, 0 on 2026-01-15, and card 9's `ebike-007` at 46 months.
- `src/domain/residual/market-value.test.ts`: on a curve point 231 455, between two points 243 125, beyond the last 97 250, the half-up 1.5 → 2, card 8 = 202 523, and the brief's 311 200 reproduced at 7 months from the first lease.
- `src/domain/refurbishment/plan.test.ts`: card 9 (35 000 + 4 500 + 12 000 = 51 500, usage 0; 39 500 when kept fair), 14 999 km, poor to good in order, no downgrade, the farm machine's started blocks, unknown rules throw.
- `src/domain/exits/early-exit.test.ts`: card 8 buy 330 675 with 311 170 and 58 350 beside it, return 132 652 line by line, as new 92 050, never below zero, the end date (buyout 58 350, return refurbishment 51 500), months paid.
- `src/domain/exits/exit-plan.test.ts`: card 8's buy event and its invoice 330 675 + 85 976 = 416 651, the return 132 652 + 34 490, 29 rents cancelled, an overdue rent cancelled too, the end-of-term statuses and the 58 350 + 15 171 buyout, every refusal, a zero exit without an invoice, D23 throws.
- `src/server/exits.test.ts` (real test DB, signed through `signContract`, rents paid through `payInvoice`): every write of buy, return and pass-on together, preview = exit and writes nothing, a second exit refused with nothing written, a throwing handler rolls everything back.

## Open questions

The first five are written up as proposed decisions D30 to D34 in `docs/decisions.md` (the D11 age for card 8, `ended_early`, the cancelled rents, the end-of-term return, what a cancelled invoice owes); the team decides them.

- **The market value of card 8.** D11 (from the model year) gives 243 125 as new on 2027-06-04 and 202 523 as good with 1 800 km. The brief's 311 200 is the curve at 7 months from the start of the lease. Should D11 use the contract's start date as the first-lease date for a first-life item? Changing it is one argument: call `monthsBetween(startDate, today)` instead of `ageInMonths`.
- **The condition and usage are self-reported** until the assessment (wave 3). The exit bills on what the customer says. The assessment may find another condition, and nothing re-bills yet.
- **A return at the end of the term issues no invoice.** The cost shown is the refurbishment, but the invoice kinds (`down_payment`, `rent`, `buyout`, `early_exit`) have no refurbishment charge, so nothing is billed and the page says the lessor bears it. Options: add a `refurbishment` kind (a text column, no migration), or decide that normal wear at the end is the lessor's.
- **`cancelled`** was added to `invoiceStatuses` (a text column, no migration). `contractBalanceOn` in invoicing does not know it yet: it would count a cancelled rent as open. Nothing calls it on an ended contract today; the invoicing owner should skip `cancelled` there.
- **Every unpaid rent is cancelled, not only the future ones.** The brief said "unpaid rents with a period after today". Cancelling only those would bill an overdue rent twice, once on its own invoice and once inside the D14 balance. The balance after the paid rents covers every rent not paid.
- **Pass on, next steps (wave 3):** the next person's application pre-filled for them, the second-life quote (D12), and `previous_contract_id` on their contract. Today the exit stops at `passed_on`, with the asset `returned` and the passport entry that names the next customer.
- **The farm machine's `per started N engine_hours since last service`** counts the blocks on the returned usage, because the pack has no service history.
- **The body's `reason`** is optional. The server derives it from the day and refuses one that contradicts it (`reason_mismatch`).
