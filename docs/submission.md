# Submission draft: the PR to the organiser

The text of the pull request from `ThomasParratt/northfina-lease-loop` `main` to `etufillari/northfina-lease-loop` `main`, in the shape of the organiser's template (`.github/pull_request_template.md`). The coordinator fills the two placeholders from the README "Status" section on the day, Johannes the team name, and opens it before the 15:00 Helsinki freeze (the organiser records the last commit at 16:00).

Title: `Team <name>: Lease Loop`

---

## Team

| Name     | GitHub          | Main focus                                                                                                 |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| Johannes | `Tonttu84`      | coordination and decisions; pricing, invoicing, contracts, exits, second life, signatories, the demo cards |
| Thomas   | `ThomasParratt` | the asset statuses, the row schemas, the decision race, the question-flow validation, the Sign button      |
| Panu     | `panu-kangas`   | the look, the landing and catalogue pages, the price page, the passport popup, My leases                   |

(From the commit authors on `main`; Johannes checks the focus column before it is sent.)

## What we built

Lease Loop takes one e-bike, laptop or farm machine through three lives: a live price from the list of the day, a question flow that asks only what the amount needs, a contract that locks the price but not the tax, monthly invoices with the VAT of their own date, a fair early exit line by line, and a second life priced by the residual curve and offered to the waiting list by rules. Every item has a passport with its lives and the CO₂ they saved, and every change is a row in a tamper-evident audit chain. It is for Northfina's customers and staff; there is no AI, ML or LLM anywhere in the product.

## How to run the demo

As in the README [Quick start](../README.md#quick-start):

```bash
npm ci
npm run db:setup
npm run dev
```

Then open `http://localhost:3000/en/demo`: one **Run** button per scenario card, each landing on the page where the numbers are compared, with the demo clock and "Continue as" set for you. The ten-minute walk through it is [docs/demo.md](demo.md).

## The Spine

- [x] Catalogue with today's price
- [x] Price with sliders (term, down payment)
- [x] Application with the question flow
- [x] Contract that locks the price
- [x] Monthly invoices from the contract
- [x] End of term: buy, return or pass on
- [x] Second life: re-price and re-lease

## Scenario cards that work

<README Status table>

## Smart Problems we picked

<README Smart problems list>

**Wildcard:** four things beyond the brief.

- **The time-travel clock.** One demo clock on the demo page; every date the product uses is read from it once per request, so the judges can stand on 6 November for the price lock, 1 January 2027 for the VAT change and 5 June 2027 for the early exit ([demo-cards.md](features/demo-cards.md), [catalogue.md](features/catalogue.md)).
- **The asset passport.** Each item's lives, contracts, assessments and refurbishments, and the CO₂ each later life saved ([circular-impact.md](features/circular-impact.md)).
- **The tamper-evident audit chain.** Each audit row carries the hash of the one before; the audit page shows the head hash and names the first broken row, and `npm run demo:tamper` proves it ([audit-chain.md](features/audit-chain.md)).
- **The signatory link.** A company's signatory list and a one-time signing link sent to the named person, so the coordinator who applied for card 6 cannot sign it ([signatories.md](features/signatories.md)).

**What's smart about our solution?** One rounding rule, half up, in one function on integer cents and a factor in millionths; the quote freezes the list version and the net rent while each invoice takes the VAT of its own day; the early exit is the outstanding balance by amortisation, shown line by line; the second-life price is market value plus refurbishment and the waiting list is ranked by four named steps, each place with the step that decided it. Every outcome is a code with params, written in English, Finnish, Swedish or Estonian.

## Decisions and mentor questions

Every reading we took is a numbered decision with its reason and what we chose against: [docs/decisions.md](decisions.md) (D1 to D72). Three readings of the brief are open with the mentors ([docs/mentor-questions.md](mentor-questions.md)): the fleet quantity of card 6 (D8, issue #13), passing on to a named person (D16, issue #54) and the price and age a returned seeded item is valued from (D60). Card 8's curve age (D31) is an assumption stated in the README "Status" section.

## Docs

One page per feature, each with its rule worked on the scenario-card numbers, its decisions, its pure functions and the tests that pin the numbers:

- [docs/features/catalogue.md](features/catalogue.md)
- [docs/features/pricing.md](features/pricing.md)
- [docs/features/question-flow.md](features/question-flow.md)
- [docs/features/contracts.md](features/contracts.md)
- [docs/features/invoicing.md](features/invoicing.md)
- [docs/features/exits.md](features/exits.md)
- [docs/features/second-life.md](features/second-life.md)
- [docs/features/circular-impact.md](features/circular-impact.md)
- [docs/features/signatories.md](features/signatories.md)
- [docs/features/my-leases.md](features/my-leases.md)
- [docs/features/demo-cards.md](features/demo-cards.md)
- [docs/features/audit-chain.md](features/audit-chain.md)
- [docs/features/row-schemas.md](features/row-schemas.md)
- [docs/features/test-isolation.md](features/test-isolation.md)
- [docs/features/look.md](features/look.md)
- [docs/features/STATUS.md](features/STATUS.md): the state of every slice

The wave reviews are in `docs/reviews/`, the time logs of every task in `docs/log/`.

## Engineering

- [ ] `npm run check:all` passes locally
- [ ] CI is green on our last commit (Actions enabled in our fork)
- [x] No `--no-verify` was used
- [x] No AI, ML or LLM features inside the app (`npm run check:no-ai`, and `tests/meta-rules.test.ts`)

## Anything else the judges should know?

**How we used AI tools.** The product has none. The code was written with Claude Code: a coordinating session on Claude Fable planned the waves and merged the pull requests, and every agent or session that wrote code or tests ran on Claude Opus (`AGENTS.md`, "Which model does what"; decision D18). Each feature was built in its own worktree on its own branch, test first, then one hardening agent and one review agent after every wave; each pull request was squash-merged as one conventional commit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
