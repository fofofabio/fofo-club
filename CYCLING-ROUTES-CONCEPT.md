# Cycling routes to try

Planning draft — 7 September 2026. No implementation or route validation has been performed.

## Product promise

Open the workspace, find a ride that fits today, and understand why it should be enjoyable before exporting it to the bike computer.

The collection should feel like recommendations from a thoughtful local road cyclist: coherent routes, lovely stretches, manageable compromises, and honest descriptions. The route itself is the product. A heatmap is supporting evidence.

## Confirmed preferences

- Road bike, paved roads. No deliberate gravel, MTB trails or hike-a-bike connectors.
- Normal rides start and finish at the user's specified home in Graz. Store the exact supplied address as private user configuration, not in checked-in source, public previews or analytics.
- Browse by distance, estimated time and elevation independently.
- A separate **Schmankerl** collection accommodates driving to destination rides, including mountain passes. Label the change of start location explicitly.
- Prefer roads used by other cyclists, combined with low car exposure and peaceful riding.

## What a perfect route captures

| Dimension | What the cyclist should experience | How the product evaluates it |
| --- | --- | --- |
| Peace | Long stretches without constantly anticipating overtakes | Car exposure, separation, road speed, noise proximity and continuous quiet stretches |
| Confidence | Knowing the route is suitable for this bike and accessible | Bicycle access, paved surface, condition evidence, closures, barriers and uncertainty |
| Flow | Settling into a rhythm | Avoid unnecessary turns, stop-start paths, repeated road crossings and pointless detours |
| Reward | A reason to remember this ride | A view, valley, climb, stretch of forest, riverside section or worthwhile stop |
| Appropriate effort | Getting the ride wanted today | Length, climbing distribution, sustained steepness, estimated elapsed time and late-ride demands |
| Shape | Feeling like a complete outing | Sensible loop, warm-up, main experience, recovery sections and a considerate return home |
| Freshness | Discovering something without gambling on suitability | New-to-you sections supported by access/surface evidence and local recommendations |
| Practicality | Being able to leave and return comfortably | Home connector, water/cafe options, shortening options and GPX handoff |

### Peace has more than one meaning

A separated cycleway beside a busy highway can reduce interaction with cars without delivering quiet. A rural lane may be quiet but narrow, fast-moving or used by through traffic. A busy shared path can be traffic-free yet unsuitable for uninterrupted road riding. Show these distinctions rather than calling every small road peaceful.

Two recommended route explanations:

- “Long uninterrupted stretches on minor paved roads; one busier connection marked on the map.”
- “Mostly separated from cars, but the first section follows a noisy main road.”

These are example copy patterns, not descriptions of validated routes.

### Judge the weakest section as well as the average

A lovely 60 km loop with a difficult short connector is materially different from a consistently pleasant loop. For every candidate inspect:

- Total distance exposed to higher-stress traffic.
- Longest continuous exposed section.
- Awkward crossings, left turns, tunnels, pinch points and poorly surfaced descents.
- Unknown sections and their exact positions.
- Whether a quieter alternative adds a reasonable amount of distance and climbing.

Scenery and popularity must never compensate for prohibited access or a surface that fails the road-bike requirement. A single significant unresolved section prevents a route from being labelled reviewed.

### Design the whole ride

The opening should get you out of Graz without unnecessary friction and allow some warm-up. Put a route's major reward somewhere that makes sense, and avoid an unexpected steep finale unless that is the point of the ride. Prefer a coherent loop, while allowing a good out-and-back where it produces a better experience.

Evaluate both directions separately: climbing gradients, descents, junction approach and return-home effort change. “Reverse route” requires recalculation, not merely reversing coordinates.

A climb is described by length, gain and sustained gradient, not only total ascent. A short very steep pitch and a long steady climb should not receive the same description. Smooth elevation data before deriving gradients; avoid precise-looking maxima created by GPS noise.

## Heatmap feasibility and evidence

[Strava's Global Heatmap](https://support.strava.com/en-us/articles/15401880-the-global-heatmap-and-strava-metro) represents aggregated activity. Its [documented public API](https://developers.strava.com/docs/reference/) lists athlete routes, activities and segments, but no global heatmap endpoint was found. A licensed global popularity integration is therefore an unresolved dependency, not a promised first-release feature.

Avoid scraping protected tiles or treating a paid consumer account as data-reuse permission. A user can consult an external heatmap and import a route they are allowed to export; that does not grant this product global popularity data.

Popularity also has limitations: commuting bottlenecks, repeated training laps and mixed cycling disciplines can make a road bright without proving that it is quiet, paved or enjoyable. Missing heat may mean low contributor coverage, not an unsuitable road. Historical aggregate heat cannot establish current closures or today's traffic.

| Signal | Role | Honesty rule |
| --- | --- | --- |
| Licensed aggregate cycling activity | Support routes ridden by others | Keep separate from car traffic; show coverage and age |
| Local club or curated published routes | Seed promising candidates | Planned/published is not the same as actually ridden; verify reuse and geometry |
| Personal GPX history and feedback | Identify favorites, disliked segments and new roads | Private by default; do not present as community popularity |
| OpenStreetMap attributes | Bicycle access, surfaces, road classes, cycle infrastructure | Missing tags stay unknown; a designated cycle route is not proof of popularity |
| Modeled traffic/noise | Estimate relative comfort where measurements are absent | Label estimated; never invent cars-per-hour values |
| Official counters | Calibrate specific measured locations when usable | Point measurements do not establish traffic on every surrounding road |

OSM documents [bicycle access](https://wiki.openstreetmap.org/wiki/Key:bicycle) and [surface](https://wiki.openstreetmap.org/wiki/Key:surface) separately. Unknown surface is not automatically asphalt; strict road mode excludes unresolved stretches until reviewed.

[BRouter](https://github.com/abrensch/brouter) is a promising first routing candidate because of bicycle profiles and elevation awareness. Its [pseudo-tag documentation](https://brouter.de/essbee/myInfoEn.pdf) covers modeled noise, traffic and proximity to rivers/forest; the [low-traffic road profile](https://github.com/abrensch/brouter/blob/master/misc/profiles2/fastbike-verylowtraffic.brf) uses related penalties. Availability and quality around Graz still require a technical spike. These are estimates, not live traffic measurements.

[GraphHopper custom models](https://docs.graphhopper.com/openapi/section/explore-our-apis/api-explorer) are an alternative for weighting road attributes. Do not choose a paid provider before comparing real Graz routes, supported attributes, hosting and cost. A routing engine needs a supported backend; do not assume a public demo service is a production dependency.

## How routes are selected

1. Gather candidate loops and points of interest from permitted curated sources, personal imports and routing-generated alternatives.
2. Connect normal loops to the private home start and finish; evaluate the city connectors as part of the ride.
3. Apply hard constraints: cycling access, paved suitability, continuity, known closures and selected limits.
4. Evaluate remaining segments for estimated car exposure, noise, flow, effort and evidence uncertainty.
5. Evaluate the whole loop for its worst section, sustained quiet, reward, coherence and repeated roads.
6. Prefer a small set of genuinely different options rather than near-duplicate loops.
7. Review initial routes with local knowledge and improve them from ride feedback.

Provisional ranking order: suitability first; peace and manageable exposure second; fit to available time/climbing third; flow and scenery next; popularity and novelty as supporting preferences. Tune against the user's judgments instead of shipping arbitrary precise weights.

Do not display a single “safety score.” Show useful facts, modeled assessments and their confidence separately. An orange marked connection and an explanation are more actionable than “87/100.”

## The experience

### Routes overview

Use a scenic route journal with clear map thumbnails and restrained workspace styling. Suggested navigation: **From home · Schmankerl · Saved · Ridden**.

Keep the first controls small: available time, distance and climbing. Advanced preferences can include flatter, more climbing, peaceful, scenic, familiar or new-to-me. Filters intersect; one does not silently override another.

Initial collection bands are navigation labels, not fitness judgments:

| Distance | Estimated riding time | Elevation gain |
| --- | --- | --- |
| Under 40 km | Under 1.5 h | Under 300 m |
| 40–70 km | 1.5–3 h | 300–700 m |
| 70–100 km | 3–5 h | 700–1,200 m |
| 100–140 km | Over 5 h | 1,200–1,800 m |
| Over 140 km | Custom limit | Over 1,800 m |

These columns are independent; rows do not define paired categories. Time should be a range that considers elevation and the user's pace, with a separate allowance for stops. Do not derive time by dividing every distance by one constant speed.

Route cards show a distinctive name, short reason to ride, map, distance, ascent, time range, road suitability, major compromise and evidence status. Show 3 strong suggestions first with the full collection still accessible.

### Route detail

Lead with the experience: “Why ride this?” Then a large map and synchronized elevation profile. Clicking a demanding climb or awkward connector highlights it on both.

Below: start/finish, surface breakdown including unknowns, city exit/return, climb descriptions, difficult connections, optional water/cafe stop, shortening option, source/review date and **Save / Download GPX**.

Offer adjustments in plain language: “Quieter alternative”, “Shorter version”, “Less climbing”, or “Keep this viewpoint”. Recalculate and show the actual tradeoff before replacing a saved route. Routes must remain valid when an optional cafe is closed; opening hours are only shown if sourced.

Mobile keeps the chosen route, GPX and key notes reachable. Native navigation, automatic bike-computer sync and live rerouting are later integrations, not first-release promises.

### Schmankerl

This is a destination collection with its own starting points. Cards include the attraction, driving estimate each way, public start/parking location if verified, ride statistics and total outing time. Show pass/seasonal access information when sourced, and distinguish unknown from open.

Do not mix a 3-hour ride with 4 hours of driving into “rides under 3 hours.” Keep the home-based promise intact outside this category. No specific pass has been validated in this planning phase.

### After a ride

Ask only a few useful things: “Would you ride it again?”, “How was the traffic?”, “Any section to avoid?” Let the user mark a road segment directly. Keep positive favorites as well as problems. Feedback should change future recommendations, with time/day context and an option to undo or remove it.

## Proposed first release and validation

Start with a reviewed collection of roughly 12–18 home loops covering genuinely different distance/climbing combinations, plus a small separate Schmankerl collection. This is a proposed target, not a claim that those routes already exist or have been checked.

Include filters, route stories, map/elevation detail, explicit compromises, favorites, GPX export and simple ride feedback. A useful first version can rely on curated routes and modeled low-traffic routing while global popularity access remains unresolved. Label that version accurately; do not market it as heatmap-powered.

Before implementation, the evidence spike should compare candidate routes with familiar good/bad local roads and examine crossings, paved coverage, continuity, ascent and both directions. Before release, verify every advertised initial route, exact home connection, exported geometry, independent filters and low-confidence handling. Actual ride feedback remains stronger evidence than a plausible map.

Success means choosing a suitable ride quickly, fewer unwelcome surfaces/connections, enjoyable quiet stretches and a growing set of routes the user would willingly repeat. Route count and distance alone are poor success measures.

## Boundaries and next decisions

The precise home location and ride history remain private. Mask home endpoints on any future shared preview and avoid logging coordinates. Review the earlier workspace security findings before release.

Still to refine through design: typical pace, acceptable detour for quiet, climbing comfort and preferred navigation device. None blocks this concept. Default to conservative road suitability and transparent uncertainty until those preferences are known.
