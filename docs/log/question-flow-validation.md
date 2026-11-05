# Time log: answers that cannot be true, the record check and the signatory

Real clock, Helsinki. Coding agent: Opus, in the main checkout, branch `fix/question-flow-validation` cut from `main` at `2a76c9e`.

| When             | What                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-05 22:12 | Survey of the question flow for answers it takes that make no sense, with a throwaway probe test (deleted). Found: any real day is a birth date (2030 → "apply from 2048", 1800 → approved); a consumer on record answering "company" skips the age question and is approved; anyone can sign an `awaiting_signatory` case by typing any name. |
| 22:30            | Tests first: `answers.test.ts` (`birthDateRange`, `answerProblem`), `record-check.test.ts`, `signatory.test.ts`, `eligibility.test.ts` (D36), `applications.test.ts` (the three traps on a real DB). 14 failing as expected, on Node 22 (`.nvmrc`).                                                                                            |
| 22:33            | Domain: `answerProblem` and `birthDateRange` in `answers.ts` (D35, D37), `record-check.ts` (D36), `signatory.ts` (D37), the held reason in `eligibility.ts`. Server: `createApplication` and `decideApplication`, 403 `NOT_SIGNATORY`. 544 tests green.                                                                                        |
| 22:34            | Pages: the flow's specific error messages and the date picker's `min`/`max`; the decision page names the differing question and shows the sign form on the company's account only. Message keys in the four files.                                                                                                                             |
| 22:35            | Decisions D35 to D37 (D30 to D34 are taken by the open exits PR #20), the feature page, this log.                                                                                                                                                                                                                                              |

## Left undone

- The signatory's identity is still only an e-mail typed on the company's account; a real check needs an e-mailed one-time link.
- `POST /api/applications` does not check the body's `customerId` against the actor (open question in `question-flow.md`).
- The other findings of the survey (quantity by customer type, sanity of income, revenue and registry answers) were left out on purpose: the user chose the first three.
