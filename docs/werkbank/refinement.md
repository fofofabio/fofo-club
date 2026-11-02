# Workspace visual refinement — 19 October 2026

The supplied EREX screenshots were used as visual references. This pass restores typographic character and varies the composition while retaining the warm paper/ink palette.

## Changes

- One existing sans-serif family, Bricolage Grotesque, across private workspace chrome and tools; stronger main headings and tabular summary values.
- Compact Fofo/Workspace header. Theme, back link and sign-out live in Account; the login keeps its own utility controls.
- Hours retains its existing state owner, inputs and ledger. Timer emphasis and lighter secondary surfaces replace repeated boxes.
- Tasks uses an open capture surface and continuous task rows, with a separate quiet summary rail. Daily brief remains available.
- Finance metrics form a continuous ruled strip above the ledger.
- Cycling uses open route rows; Cinema uses spaced film spreads and underlined view tabs.
- Login uses a strong ink rule and a more expressive heading.

Cow source, assets and scoped exception were not edited. Public components, API handlers, authentication, calculations and mutation logic were not changed in this pass.

## Checks and limits

- TypeScript: passed.
- ESLint on all seven changed private components: passed.
- Light/dark token contrast: 4/4 passed. These tests measure tokens, not every rendered state.
- Optimized Next build: passed, bypassing the route-refresh prebuild hook. Existing metadataBase and Browserslist warnings remain.
- Whitespace checks: passed.
- Fresh screenshots, responsive browser checks, rendered Cow comparison and authenticated workflow verification remain pending: the browser tool security gate rejected local preview access. No alternate browser access was attempted.
- User reported a client-side exception during the development preview. Their subsequent screenshot showed a 502 while the upstream app was deliberately stopped for rebuilding. This screenshot does not establish the original exception cause. A clean optimized build was started on port 3100; the user confirmed that it opens normally. The original exception cause remains unconfirmed.
- Port 3110 is the in-memory fixture proxy. It blocks login POSTs; sign in on port 3100. No production mutations were used for validation.

This is an implemented visual refinement with static/build checks complete, not a claim of completed browser acceptance.

## Tasks follow-up from user screenshot

User rejected the first Tasks composition. Their screenshot exposed a scoped selector that hid the capture input, excessive small action icons, and competing project reporting. The hiding selector was removed. Tasks now uses a single column, 18–20px wrapping task titles, an explicit Add task button, one project selector, visible text actions for Notes/Subtasks/Start timer, and a keyboard-accessible More disclosure for pin/order/delete. Project reporting is retained below the list as a disclosure. Underlying save, ordering, handoff, archive and Undo handlers remain in place. Fresh user review of this follow-up is pending.
