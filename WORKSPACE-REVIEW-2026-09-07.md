# Workspace additions and security review

Reviewed 2026-09-07 against local commit `fee0322`, with read-only anonymous checks of `https://www.fofoclub.at`. No application code, dependencies, credentials, or live records were changed.

## New destinations

The strongest direction is a personal home for work and interests. Preserve the existing Hours, Tasks, and Finances, and make additional destinations optional so navigation stays manageable.

| Addition | Useful first version | Later expansion |
| --- | --- | --- |
| Pro Cycling | News grouped by story, race calendar, favorite riders/teams, spoiler-free headlines and hidden results | Stage profiles, standings, race-day briefings and region-specific viewing links, subject to reliable data access |
| News | Chosen topics and sources, a finite daily briefing, publication times, original links, read/unread and mute controls | Source comparison and optional summaries with attribution |
| Library | Save articles, videos, links and personal notes from anywhere in the workspace; search and tags | Highlights, collections, links to related projects |
| Ride Planner | Routes to try, distance/elevation, gear checklist and weather for the intended ride | Route-file import and activity integration |
| Ideas | Quick capture of ideas, screenshots and references; develop an idea into a project when ready | Moodboards and lightweight project notebooks |
| Watch & Listen | A personal queue for documentaries, race replays, videos and podcasts | Progress and release reminders |

**Recommended first release: Pro Cycling**, backed by a small shared reader that can later support News. Begin with approved feeds, headline/snippet/source/time, deduplication, favorites, saved stories and spoiler protection. Add structured race data only after checking coverage, reuse rights, reliability and cost. These are product proposals; specific providers and integrations were not evaluated.

Keep results and revealing thumbnails hidden until explicitly revealed in spoiler-free mode. Offer a clear end to each daily briefing, with optional notifications and quiet defaults. Let the user pin a handful of destinations; put the rest in a secondary menu.

## Improvements to the existing experience

- Turn the existing Daily Brief into an optional Today destination with a small chosen task list and a persistent active timer.
- Give destinations URLs so refresh and browser Back retain context. Currently WorkspaceDesk uses component state for navigation.
- Preserve drafts while switching to Finances: the conditional rendering currently unmounts HoursTracker and TodoBoard.
- Reconnect the section observer after returning from Finances; its empty dependency array currently keeps references to the initial work sections.
- Strengthen time integrity before adding reports: stopping a session inserts then deletes without a transaction, so concurrent stops can duplicate entries; overnight sessions can collapse to one minute or fail the time constraint.
- Add user-facing import preview and reconciliation for finances, with category corrections and an explicit last-import timestamp. Preserve bank-ledger cash truth and integer cents.

## Security findings

### 1. Urgent verification: password-bearing database URL remains in Git history

The parent of commit `90f2d89` contains a password-bearing PostgreSQL URL in `.process.env`. That commit removes it, and the current file is empty. Inspection emitted only boolean presence checks, never the value. Deleting the current value does not remove its historical copies.

If that credential remains valid, anyone with access to the history could potentially access the database within its network and role permissions. Rotation status, historical repository visibility, credential privileges and database reachability were not established. This is evidence of historical credential exposure, not evidence of a breach.

Action: verify rotation; if unconfirmed, rotate/revoke it and update the deployment secret. Then consider coordinated history cleanup, ignore `.process.env`, and add secret scanning. History rewriting alone is insufficient. No old credential was used to connect to anything.

### 2. High: vulnerable framework version and dependency findings

`package-lock.json:5037` locks Next.js 15.5.10. The app uses App Router and login/logout Server Actions. The maintainer's [GHSA-m99w-x7hq-7vfj advisory](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj) describes unauthenticated CPU exhaustion in this configuration, patched in 15.5.21. Upgrade to a currently patched compatible release and reassess the resulting lockfile; that minimum is specific to this advisory.

`npm.cmd audit --omit=dev --json --fetch-retries=0 --fetch-timeout=20000` reported six affected dependency entries: two critical and four high. These counts include dependency propagation and are not six demonstrated attacks against this application. Entries include Next.js, next-auth, @auth/core, nanoid, nested PostCSS and sharp.

Auth.js is locked at next-auth 5.0.0-beta.31 and @auth/core 0.41.2. Its critical [existence-only authentication advisory](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3) is materially mitigated here because handlers require `session.user.id`, rather than merely a truthy auth object. The configured provider is Credentials, not email magic links or OAuth. Do not describe the audit's critical labels as a proven workspace login bypass.

Action: patch framework/auth dependencies and relevant transitive dependencies, then test login/logout, expired/revoked sessions, all API guards and a production build. The live deployment version was not verified and no denial-of-service payload was sent.

### 3. High if no edge control exists: login has no application-level throttling

`src/auth.ts:22-34` performs a database lookup and password verification for each supplied credential pair. No attempt limit, progressive delay or shared rate limiter was found. `src/lib/password.ts:24` uses synchronous scrypt, which blocks the Node event loop during verification. Existing-user and missing-user requests also do different amounts of work.

Action: apply account- and client-based shared throttling within the credential authorization path, covering both login entry points; bound input sizes and use asynchronous password derivation. Preserve generic login errors. Edge/WAF controls were not inspected, and no brute-force or load testing was performed.

### 4. Medium: sessions cannot be revoked individually

`src/auth.ts:10-12,46-60` uses JWT sessions without a session version, revocation list or user-state recheck. The installed Auth.js default max age is 30 days (`node_modules/@auth/core/lib/init.js:38`). A copied valid token can remain usable after the original browser logs out or the password is changed, until expiry or a broader secret change. See [Auth.js session strategy documentation](https://authjs.dev/concepts/session-strategies).

An isolated callback probe confirmed an existing synthetic token retains its user ID without querying user state. This tests callback behavior, not an actual stolen-cookie scenario.

Action: enforce a server-side session version or revocation record on each authenticated request, with an explicit expiry policy and a revoke-all-sessions operation. Retain compatibility with the chosen credential provider.

### 5. Medium hardening: no framing protection on observed responses

Live GET responses for `/workspace/login` and the anonymous `/workspace` redirect have neither Content-Security-Policy nor X-Frame-Options. `next.config.ts` defines neither. An authenticated workspace response was not inspected, so its final headers remain unverified.

Action: set `Content-Security-Policy: frame-ancestors 'none'` and an appropriate fallback framing policy for the private area, then verify authenticated responses. Add X-Content-Type-Options and a broader tested CSP. Missing headers alone do not establish an XSS exploit.

### 6. Low security / medium reliability: incomplete input validation

Most task/time handlers cast JSON to TypeScript types without runtime validation. Isolated calls to the actual transpiled handlers reproduced TypeErrors for `{text:42}` on task creation, `{project:42}` on active-session creation, and `null` on time-entry creation. These occur after authentication and can produce server errors instead of controlled 400 responses.

The active-session endpoint accepts arbitrary timezone text, which is later passed to Intl during stop; invalid zones can leave a user's timer stuck. Text sizes, reorder array lengths, UUIDs and date formats lack comprehensive application bounds. Finance validation is stronger but still assumes a non-null body and has no PostgreSQL integer upper bound for amounts.

Action: use shared runtime schemas, reject malformed JSON with 400, bound sizes and arrays, and validate timezones before persistence. No authenticated malformed requests were sent to production.

## Positive controls and evidence

- Live anonymous `/workspace` GET returned 307 to `/workspace/login`; login returned 200.
- Live anonymous finance, todos and time-entries GETs all returned 401.
- Isolated execution of all 20 workspace API method handlers with absent authentication returned 401 before body parsing or data-layer calls. Authentication and database dependencies were mocked; these checks do not establish two-user isolation at runtime.
- SQL access consistently uses the session user ID and parameterized values. Updates/deletes scope both record and owner; subtask operations check parent ownership. No direct object-reference authorization bypass was found in this source review.
- Passwords use random salts, scrypt and timing-safe comparison. Auth.js defaults include HttpOnly/SameSite=Lax cookies and Secure cookies for HTTPS; an authenticated session cookie was not inspected.
- The observed site serves HSTS. The workspace page redirect and login page use private/no-store cache headers.
- Workspace UI text is rendered through React; no workspace `dangerouslySetInnerHTML` sink was found.

## Remaining verification and safeguards for new tabs

Authenticated browser behavior, cross-account integration tests, production WAF rules, database permissions/TLS/backups, credential rotation, authenticated cache headers and a comprehensive Git secret scan remain outside this completed bounded review. This is not a full penetration test or a clean bill of health.

Custom JSON APIs have no explicit Origin/CSRF gate. SameSite cookies and normal JSON preflight provide meaningful protection; no exploitable CSRF path was demonstrated. Add a same-origin policy for mutations, especially before introducing other same-site integrations. Explicitly use private/no-store on sensitive API responses; anonymous 401 responses currently advertise public revalidation, which is not evidence of private data leakage.

News ingestion should use approved feed destinations, restrict redirects/private network access, limit request time and response size, and sanitize external markup. Treat article content as untrusted data if summaries are added. Keep feed credentials server-side and saved articles/user preferences scoped to the authenticated user. Structured race data, external media and full article reuse require provider-specific checks before implementation.

Recommended order: verify/revoke the historical credential, patch dependencies, add throttling and revocation, complete authenticated security acceptance, then build the Pro Cycling reader.
