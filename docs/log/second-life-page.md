# Second life page: time log

Branch `fix/second-life-page` from `main` at `9ddcf7f`. Real clock (Helsinki).

- 15:20 screenshot of `/en/assets/ebike-007/second-life` as the admin: the "Ways to relist it" and "The waiting list" headings clipped at the card's rounded edge; entries shown as `wait-02`, the rules as "Ranked by D13", the price as "(D86)".
- 15:24 cause: an unpadded `Card` (the tables run to its edges) also left its `<h2>` unpadded. Fixed in `Card`, so the quote calculator's comparison card is fixed too.
- 15:26 entries read as the data's `who` with "Request 2" under it; the decision names who wins; the rules and the "higher id" rank step say "joined the list first/later"; "(D86)" out of the price wording and the item page's price note, in all four languages.
- 15:28 screenshots in English and Finnish checked.
- 15:30 `npm run check:all` on Node 24 failed: `better-sqlite3` is built for Node 22 (`.nvmrc`). On Node 22.22.2: green.
- 15:45 rebased onto `9ddcf7f` (#89), checks again, commit, PR.

## Left undone

- The `who` texts are the data pack's and stay English on the fi, sv and et pages.
- The fi, sv and et wording wants a native speaker's read.
