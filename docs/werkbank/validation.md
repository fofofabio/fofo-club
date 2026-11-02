# Werkbank workspace validation

12 October 2026 · local implementation · no deployment or push

## Delivered

Private shell and login, separate Hours / Tasks / Finances / Cycling / Cinema views, isolated light/dark tokens, navigation with direct `?view=` links and browser history, persistent timer strip, retained drafts and visited view state. Hours uses a daily ledger with timeline/dial disclosures. Tasks has readable age/due information and keyboard order controls. Finances has a month selector, semantic ledger, category drill-down and quick access to recurring editors. Cycling uses a route list and consistent details. Cinema retains programme, releases, filters and personal states.

Public route content, fonts, global styles, authentication, database/data libraries, API handlers, calculations and integrations were left unchanged. The existing public header was moved verbatim to a wrapper that bypasses private routes. The initial checkout was clean.

## Checks

| Area | Evidence | Result |
| --- | --- | --- |
| Build | Next production build invoked directly; route-refresh prebuild hook intentionally not run | Passed |
| Types | TypeScript no-emit check | Passed |
| Lint | Changed routes, shell and all admin components | No errors; retained public image optimization warning |
| Contrast | 4 automated tests covering both themes, body/secondary/placeholder text and control boundaries | Passed; >=4.5:1 text and >=3:1 control boundaries |
| Responsive | Five views at 1440 x 1000, 768 x 1024, 390 x 844, in light and dark | 30 checks; no horizontal page overflow |
| Timer | Start, navigate to Tasks, refresh, Stop & save using isolated API fixtures | Passed; one mounted owner and one persisted session |
| Navigation | Direct links, Back/Forward, selected marker, draft survival | Passed |
| Tasks | Capture, text editing, pin state, keyboard ordering, subtask capture/completion, deletion Undo | Passed with fixtures; real tasks and notes loaded |
| Hours | Native keyboard time editing, duration recalculation, daily ledger and copied weekly report | Passed with fixtures; native time inputs tested with real keyboard events |
| Finances | Real ledger and totals rendered; fixture expense 800.00 -> 899.50, commitment total 909.49, category disclosure | Passed |
| Cycling | Real route details, heatmap/map content, GPX download; fixture saved state, rollback and empty filter | Passed |
| Cinema | Real programme, details and existing personal states; fixture watchlist and detail keyboard flow | Passed |
| Authentication | User signed in, signed out, then signed in again through the redesigned production-build login | Passed |
| Anonymous access | /workspace redirects to login; seven relevant GET APIs and active-session POST return 401 | Passed; active-session GET is unsupported and returns 405 |
| Errors | Injected local failure remains actionable; optimistic route state rolls back | Passed |
| Public site | Home/About before-after screenshots; identical public header markup after animation settled; public source/styles unchanged | Passed |
| Cow | Original source/assets unchanged; desktop computed values identical; all rendered mobile nodes match; new-moo flip/quote and daily reset tested | Passed |

## Cow protection

`DailyCow.tsx`, `cowQuotes.ts`, the cow image, fonts and global utilities are unchanged. The Cow remains above Hours after navigation, at its original max-width. At desktop its box remains 768 x 347 px. It retains its blue surface, thought bubble, typography, shadows and interactions in both themes. New work-surface selectors do not reach it. Cow screenshot differences from JPEG encoding are not treated as pixel-identity evidence; computed typography, colors, geometry and shadows were compared directly.

## Verification limits

Real authenticated reads, login/sign-out, route GPX download and detail navigation were exercised against the configured backend. Business-data writes were exercised only against the loopback in-memory fixture proxy. These tests prove the frontend flows; they do **not** establish that production mutations, persistence across backend restarts, or external providers always succeed. No workspace production records were created, edited or deleted for verification. Existing auth/API/data isolation code is unchanged; cross-user isolation was not re-audited with a second live account.

Reduced motion is enforced by the work-surface stylesheet and the Cow's existing motion-reduce rules; an OS-level reduced-motion preference was not switched during the run. All ordinary work-surface transitions and decorative animations are removed regardless of that preference. Actual failed-credential submission was not performed, to avoid creating production login-throttle records; required-field behavior and error markup remain in the unchanged authentication contract.

## Review artifacts

- `inventory.md` records the capabilities and protected dependencies before restructuring.
- `responsive-results.json` contains the 30 measured view/theme/size results.
- `cow-style-comparison.json` and `cow-mobile-style-comparison.json` contain the before/after measurements.
- `screenshots/` contains all five tools at the three sizes in both themes, public comparisons, Cow comparisons and error/login captures. Tool mutation screenshots use clearly named fixture data.

Reproduce contrast: `node --test scripts/werkbank-contrast.test.mjs`.
For safe frontend mutation testing, start the local app on 3100, sign in locally, then run `node scripts/werkbank-fixture-server.mjs` and open `http://localhost:3110/workspace`. Workspace API writes stay in memory; all other mutations are blocked by the proxy. No production-data claim should be inferred from fixture screenshots.

Additional 320 x 800 check: the Tasks page has no horizontal overflow and the capture field remains 239 px wide. Action rows wrap within their work surface. The final styles also keep subscription confidence text neutral and make the root scrollbar/gutter follow the private dark theme only while that shell is present.

Screenshots: [Hours](C:/fofo-club/docs/werkbank/screenshots/hours-light-desktop.jpg) · [Dark theme](C:/fofo-club/docs/werkbank/screenshots/hours-dark-desktop.jpg) · [Mobile Tasks](C:/fofo-club/docs/werkbank/screenshots/tasks-dark-mobile.jpg) · [Finances](C:/fofo-club/docs/werkbank/screenshots/finances-light-desktop.jpg) · [Cycling](C:/fofo-club/docs/werkbank/screenshots/cycling-light-desktop.jpg) · [Cinema](C:/fofo-club/docs/werkbank/screenshots/cinema-light-desktop.jpg)

Final production-build fixture check: a double-click on Save block created exactly one manual entry. The final 30-view capture pass again reported no horizontal page overflow. Weekly-report clipboard contents were read and matched the fixture project totals and daily entries.

Cleanup limitation: automatic approval review rejected recursive removal of `C:\temp\fofo-werkbank-baseline` with “blocked by policy.” That temporary source comparison folder and its archive remain; the copied `.env.local` was removed. The application checkout and its dependency folder were not affected.
