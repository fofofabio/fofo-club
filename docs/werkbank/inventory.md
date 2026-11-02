# Workspace capability inventory — 12 October 2026

Initial checkout: clean. Scope: private presentation and interactions; no database, auth, API, calculation or integration changes.

- Hours: server-backed active session (restored by time-entry GET), project/task drafts, day/week navigation, drag timeline, manual entries, edit/delete, continuation, daily totals/dial, project totals, copied weekly report. Keep a single mounted owner across destinations.
- Tasks: quick capture/project/due dates, inline editing, pinned ordering, drag order, notes, nested subtasks, completion/archive, delayed deletion with real Undo, timer draft handoff. Existing age CSS dims old items; replace with explicit age/overdue text. Global task shortcut must be local to visible Tasks.
- Finances: cents-based totals, cashflow and income projection, category drill-down, daily spend, subscription status, recurring-expense editor, filtered transaction ledger. Preserve all arithmetic.
- Cycling: home/drive/saved/ridden filters, distance/time/elevation limits, maps/3D/elevation, route alternatives/evidence, ratings/traffic/notes, heatmaps and authenticated GPX links.
- Cinema: local programme/upcoming releases, screening/time/venue/version filters, finish allowance, recommendations, posters/details/calendar/external links, watchlist/seen/dismissed and notes.
- Login: server auth redirect, useActionState credential action, throttling, JWT session version validation, sign-out. No auth changes.

## Protected Cow
`src/components/DailyCow.tsx`, `src/data/cowQuotes.ts`, `public/cow-thinker.png`, global Tailwind classes and font variables (Bricolage, Space Mono), blue background, borders/shadows, responsive sizes, thought bubble, new-moo flip/swap timers, client day-of-year quote. Leave all sources/assets unchanged. Keep max-w-3xl and mb-8 above Hours, after navigation. Workspace style rules apply only to `.ws-tool` and shell primitives; cow has original inherited Inter/black/light rendering.

## Shared shell dependencies
Root layout currently loads public header/LogoFly/KeyboardNav/RouteTransitions for every route. Move the identical public wrapper into a path-aware component; private routes bypass it. Keep global stylesheet and all public components unchanged. Theme tokens remain local, including descendant overlays.

## Verification boundaries
`prebuild` executes workspace-refresh-routes.mjs: loads private configuration, calls BRouter and writes generated route data. Run Next build directly, without this hook. Authenticated production reads may be used only read-only; mutations need isolated local fixture data, never production records. Empty/mock views do not prove authenticated integrations.
