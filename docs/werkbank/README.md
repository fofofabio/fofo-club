# Private workspace

The private `/workspace` and `/workspace/login` routes use an isolated paper-and-ink shell. Public route chrome stays in `SiteChrome`; the Cow of Wisdom retains its original component, assets and styling exception.

## Structure

- `WorkspaceDesk` owns the focused Hours, Tasks, Finances, Cycling and Cinema views, URL/history navigation and task-to-timer handoff. Visited views stay mounted to preserve drafts; Hours remains the single timer owner.
- `WorkspaceUI` provides theme controls, buttons, tables, disclosures, feedback and dialog focus behavior.
- `workspace.css` scopes private tokens, responsive layouts and compatibility rules. Content maps and charts keep meaningful data colors.
- `workspaceRequest` preserves existing API contracts while providing shared mutation feedback.
- Tasks uses one readable list with quick capture, project filtering, explicit everyday actions, a More disclosure and optional project reporting.

Authentication, user isolation, backend APIs and financial/route calculations retain their existing contracts.

## Validation

The final implementation passes TypeScript, component lint, optimized Next build, whitespace checks and four light/dark token contrast tests. Token tests do not prove every rendered state.

The initial migration also received responsive and fixture workflow checks. The later visual refinement could not receive fresh automated browser inspection; the user reviewed the local result and confirmed that it opens normally. Local screenshots and comparison measurements are intentionally not included in Git.

Run contrast checks with `node --test scripts/werkbank-contrast.test.mjs`.

For a verification build, invoke Next directly (`node_modules/.bin/next.cmd build` on Windows). The normal npm prebuild hook refreshes generated cycling routes through BRouter; use it only when that external refresh is intended.

## Isolated mutation checks

Start the app on port 3100 and sign in there. Run `node scripts/werkbank-fixture-server.mjs`, then open `http://localhost:3110/workspace`. The loopback proxy replaces workspace API data with in-memory fixtures and blocks all other mutations. Login submissions must use port 3100. Fixture results do not establish production mutation persistence or external integration availability.
