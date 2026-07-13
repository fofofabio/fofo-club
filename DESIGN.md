# Paper & Wire — the fofo club design language

One site co-authored by two hands that never quite agree:

- **The human** scribbling in a notebook — warm, unpolished, in public.
- **The machine** it runs on — live, structural, honest about being software.

The whole "in public, unfinished" ethos gets a second meaning: the site openly
admits it's *software*, and shows you the wiring. This is what makes it read as
"this person loves technology and the internet" without a single stock trope.

---

## Three materials

| Material | What it is | Voice / tokens |
|----------|------------|----------------|
| **Paper** | The notebook soul | `font-display` (Bricolage), `font-hand` (Caveat), revision `<s>` marks, warm `#F2EFE6`, marker `#FFE14D` |
| **Wire** | The machine, made visible | `font-mono` (**Space Mono**) — metadata, `.fc-src` source labels, `.fc-key` keyboard hints, colophon, version/branch |
| **Signal** | The thread joining them | Electric `#0008FF` — ink *and* hyperlink *and* CRT phosphor. Marks anything **live / interactive**. |

## Five principles

1. **Show the wiring.** Prefer real structure over decoration: source labels,
   keyboard shortcuts, version/branch, git-flavored chrome.
2. **Two hands, one page.** Pair a human mark with a machine mark on the same
   surface — a Caveat margin note faced by a mono `<section/>` tag. Keep the
   tension; never blend them into mush.
3. **The web is a place you love.** Keyboard nav (`t/b/v/?`), hypertext links
   that own the blue, a blinking caret. Internet-native affordances.
4. **Blue is the current.** `#0008FF` only ever marks live/interactive. Static
   content stays ink-black on paper. Pink + yellow stay rare pops.
5. **Motion is physics.** Everything animates on the shared `fc-*` easing
   vocabulary (`--fc-ease-yank`, `--fc-ease-soft`) so effects rhyme.

## Font jobs (one voice per font)

- **Bricolage** (`font-display`) — headlines only.
- **Inter** (`font-sans`) — body copy.
- **Space Mono** (`font-mono`) — machine chrome: labels, metadata, keyboard
  hints, timestamps, version, source tags.
- **Tiny5** (`font-pixel`) — **toys / games only** (tools, Ant Kingdom, Wordle).
  No longer the default "tech" voice — that job moved to Space Mono.
- **Caveat** (`font-hand`) — human margin notes.

## Building blocks (globals.css)

- `.wire` / `.wire-blue` — mono caps-tracked chrome text.
- `.fc-src` — source label ( `<hero/>`, `// section: about` ). Always `aria-hidden`.
- `.fc-key` (`.fc-key b`) — keyboard hint chip; bracketed key is blue = live.
- `.fc-link` — hypertext link: blue, offset underline, lifts on hover. For links
  with a real destination worth showing, use the `FcLink` component
  (`src/components/FcLink.tsx`) — it adds a mono hover chip revealing the URL.
- `.fc-caret` — blinking caret (editor cursor + terminal prompt). Reduced-motion safe.

Machine-chrome text that used to be `font-pixel` (stats labels, marquee ticker,
index numbers, scroll hint, footer nav + colophon, 404 chrome) is now
`font-mono`. Tiny5 (`font-pixel`) is reserved for toys/games only.

Global keyboard nav lives in `src/components/KeyboardNav.tsx` and mirrors the
hero's `[t] [b] [v] [?]` hints.

## What we deliberately did NOT do

- No dashboard / status-bar strip.
- No teardown of the neo-brutalist bones (borders, offset shadows, marquee).
- No touching LogoFly, layout, section order, or the copy voice.

Paper & Wire is **additive tension**, not a rewrite.
