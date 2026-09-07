# Movies upcoming — Mein Kino

Planning draft — 7 September 2026. Public source feasibility checked; no feature, ingestion job, account connection or reservation was created.

## Product promise

“I'm at home. What would I enjoy seeing, and when can I actually go?”

The first screen should be a beautiful selection of films with immediately useful local screenings. Choosing a film comes first, then choosing its cinema/time. A chronological timetable remains available for evenings when the time matters more than the title.

## Confirmed scope

- Graz only, limited to nonstop partner cinemas.
- Prefer original-language screenings, while keeping other versions accessible and clearly labelled.
- Attractive film overview, upcoming availability, details, cinema and time.
- The user already has a subscription; no signup or subscription sales flow is needed.

The [official partner list](https://nonstopkino.at/kinos/) identifies **Filmzentrum im Rechbauerkino, Geidorf Kunstkino, KIZ RoyalKino and Schubert Kino** in Graz. The Steiermark programme also includes Bruck an der Mur, which is excluded. Use explicit venue identities, not only a state filter or free-text location match.

## What was verified in the source

A direct read of the user's [Steiermark programme URL](https://nonstopkino.at/programm/?location=steiermark) returned public HTML containing screening entries with film links, venue identifiers, local dates/times, version codes and images. Although the URL is filtered, the response contains other regions too: filtering must be enforced on ingestion and API output.

The 7 September snapshot contained these entries for the four venues:

| Cinema | Published entries | Distinct film links | Latest listed date |
| --- | ---: | ---: | --- |
| Rechbauerkino | 15 | 9 | 27 October 2026 |
| Geidorf Kunstkino | 24 | 9 | 10 September 2026 |
| KIZ RoyalKino | 34 | 16 | 10 September 2026 |
| Schubert Kino | 32 | 5 | 10 September 2026 |

Across the venues: 105 screening entries and 28 distinct film links. This is an ephemeral published snapshot, not a complete future schedule, seat count or guarantee that all entries are still upcoming at the time of reading. A late October event does not imply a complete programme through October.

The sampled [A Sad and Beautiful World detail page](https://nonstopkino.at/movies/a-sad-and-beautiful-world/) supplies director/cast, year, runtime, original language, synopsis and screening rows. Its KIZ link leads to the cinema's daily programme, not a verified screening-specific booking page. Therefore the first-release action should say **Open cinema programme** where only that level of link exists.

This confirms a practical ingestion candidate, not a stable public API contract or permission to reuse every asset. Check source terms, robots guidance, feed/partner options and image permissions before operational ingestion. If a supported feed is available, prefer it over HTML parsing. No provider was contacted.

## The home screen

Working label: **Mein Kino**. A poster-led gallery on the workspace's paper background, with a strong typographic heading and compact screening rows beneath posters. Film artwork supplies most of the color. Keep artwork intact rather than using it as unreadable text backgrounds.

The opening controls: **Tonight · Tomorrow · This week · Coming soon · Watchlist**. A small filter row adds earliest start, latest finish, preferred language and cinema. Genre/mood is optional and should not become a mandatory questionnaire.

Show a small “Tonight for you” selection followed by the complete matching film grid. Avoid autoplay trailers and endless carousels. Preserve filters and scroll position after opening a film and returning.

A card contains:

- Poster, title and release year when helpful.
- Genre and runtime, if reliably available.
- A one-sentence, spoiler-light premise.
- The next suitable screening: day, time, cinema and version.
- “3 more screenings” rather than repeated cards for each time.
- Save, seen and not-interested controls.

Use a designed typography fallback for a missing poster. A film should not disappear because artwork or optional metadata is unavailable. Text and buttons stay usable on keyboard/touch; status must not rely on color alone.

## Two ways to decide

### 1. Choose the film, then the evening

Browse the gallery, open a film, read a short synopsis or deliberately play its trailer. The detail view keeps the poster/title on one side and all eligible Graz screenings grouped by date on the other. A selected screening shows cinema, exact start, version, estimated finish and the appropriate external action.

Do not hide screenings at a second Graz cinema simply because another venue has the earliest showing. The default may emphasize the best original-language option, with every other version still accessible.

### 2. Choose the time, then the film

“I can leave after 18:00 and want to be home around 23:00.” Filter to realistically reachable screenings, accounting for travel and collection/arrival buffer. If travel is not configured, ask for a simple lead time and label the result accordingly instead of inventing a journey estimate.

A “Help me choose” button gives three distinct eligible options with short, factual reasons. Start with transparent rules: fits the time window, original version, unseen/watchlisted, and variety. No need for an AI recommender or a large rating questionnaire in the first version.

## Upcoming is three different states

| State | Meaning | Display |
| --- | --- | --- |
| Scheduled in Graz | A specific screening exists at one of the four venues | Date, time, cinema, language; source link |
| Announced by a Graz partner | A partner has announced a film, without screening times | Coming soon; dates not published |
| General release only | A national/global release exists with no local evidence | Outside the main eligible overview; optionally a separate discovery list later |

An Austrian release date is not a Graz showtime. A title in a global “upcoming movies” API must not be presented as something the user can definitely watch with nonstop.

“Last scheduled showing” is an acceptable factual label. “Last chance” is only justified by explicit source confirmation; a short publication horizon is insufficient.

## Original-language preference

Store film original language separately from each screening's spoken language and subtitle language. Preserve the source version code and its meaning.

- Original language is not synonymous with English.
- A German-language film in OV should still satisfy the original-language preference.
- OmdU means original version with German subtitles; OmeU indicates English subtitles when explicitly provided.
- A generic ambiguous OmU/combined label should remain ambiguous rather than assuming subtitle language.
- Prefer suitable original screenings by default; show a clearly marked alternative if only dubbed screenings are available.

Later, let the user specify languages they understand and acceptable subtitle languages. That improves suggestions without excluding foreign-language cinema unnecessarily.

## Nonstop eligibility and booking

The [nonstop FAQ](https://nonstopkino.at/infos/) says excluded screenings are omitted from its programme and may be marked by cinemas; special events and certain releases can be exceptions. It also explains that reservation and ticket collection happen through the cinema, with venue-dependent collection deadlines.

Accordingly, store eligibility at screening level:

- **Listed by nonstop** — appears in the current official programme, with source timestamp.
- **Needs confirmation** — found only on a partner cinema's site without clear inclusion evidence.
- **Excluded** — explicitly identified as outside the subscription; hidden by default.

Do not equate a partner venue with universal coverage or label every screening “free.” Show potential surcharges when explicitly sourced. Where official sources conflict, flag the screening for confirmation instead of presenting a confident inclusion badge.

The source cinema remains responsible for seat availability and booking. “Listed” does not mean seats remain available. Never show “Reserved” simply because an external link was opened or an event was added to a calendar.

First release needs no nonstop password, card number or stored payment information. Keep existing reservation flows external. A source-specific pickup deadline is better than a universal hardcoded number; otherwise direct the user to the cinema's confirmation.

## Film details and personal collection

Detail content: artwork, title/original title, year, runtime, director, small cast list, spoiler-light synopsis, optional trailer, versions and showtimes. Ratings can be a later secondary cue with source and vote count; they should not push lesser-known arthouse films out of view.

**Want to see / Seen / Not for me** is enough initially. Optional personal notes and a simple reaction can follow. Keep these records private and allow reversing decisions. Watchlisted films should resurface when a matching Graz screening is published, rather than disappearing when one week's programme ends.

Optional opt-in notifications later: new screening for a saved film, meaningful time change, or a confirmed final showing. No recurring generic notification feed by default.

## Data model and reliability plan

Separate Film, Cinema, Screening and UserFilmState. A film can have many screenings, versions and venue links. Match film identity using stable source IDs/URLs first; enrich with another provider only when title, year and supporting metadata agree. Do not merge remakes, reissues or similarly named films based on title alone. Special programmes can exist without a conventional movie match.

Screening identity should prefer a provider ID when available; fall back to a documented combination of film, cinema, auditorium if known, start time and version. A changed time must not leave both old and new showings looking valid. Persist source timestamps and reconciliation state.

Use Europe/Vienna for presentation and correct timezone-aware timestamps internally. Handle screenings after midnight and daylight-saving changes explicitly. Estimated finish uses runtime plus a labelled, configurable pre-show buffer; discussions/Q&As have unknown extra time unless supplied.

Proposed ingestion cadence, subject to source permission and limits: programme every 3–6 hours; cache film details longer; revalidate before an outing where feasible. Do not fetch the entire external programme on every page view. Near-term source links remain available even during a refresh failure.

Keep last-known-good data if a source fails, but label it stale and avoid declaring times freshly confirmed. A missing source response is not an empty programme. Use atomic snapshots, parser fixtures and alerts for sudden drops in coverage. Reconcile removed entries carefully: distinguish a changed/cancelled screening from an incomplete scrape. Do not state “cancelled” without sufficient evidence.

[TMDB](https://developer.themoviedb.org/docs/faq) is an optional metadata/poster enrichment source, with its required attribution and applicable usage terms. It does not replace local showtime or subscription-eligibility evidence. The first version may already have sufficient metadata from nonstop if reuse is supported.

## First release

Deliver the four-cinema programme, film-first gallery, date/time filters, original-language preference, movie detail, all local screening choices, watchlist/seen controls, source links and visible freshness. Include a genuine coming-soon section only when there are local announcements to populate it.

Next: calendar export, optional reminders, better personal suggestions and journey timing. Direct integrated reservations, seat maps, account connections and imported viewing history are outside the first release.

Acceptance requires comparing sampled entries across all four cinemas against official programmes, checking one film across multiple venues/versions, validating DST/midnight handling, filtering out Bruck and other regions, retaining posterless films, showing stale/unknown states, and ensuring no click is represented as a reservation. The user should be able to choose a film and reach the correct cinema programme in a short, calm interaction.

## Shared workspace considerations

Give both new destinations stable URLs and preserve navigation context. Keep personal watchlists and home-based route configuration user-scoped; public catalogue data can be cached separately. External HTML is untrusted and must be sanitized; restrict fetch destinations and request sizes. The prior security findings remain a release prerequisite, not work performed by this planning task.

Recommended sequence: approve the concepts, prove movie feed/reuse and road-routing data feasibility, design reviewable screen states, then implement. Cinema has the more concrete existing source; route quality deserves a curated evidence phase before a polished generator.
