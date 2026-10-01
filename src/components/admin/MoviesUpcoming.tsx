"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, CalendarDays, CalendarPlus, Check, Clock3, ExternalLink, Film, MapPin, Search, Sparkles, X } from "lucide-react";
import clsx from "clsx";

type Screening = { id: string; startsAt: string; date: string; time: string; venueId: string; venue: string; versionCode: string; versionLabel: string; cinemaUrl: string | null; calendarUrl: string | null };
type Movie = { key: string; title: string; url: string; imageUrl: string | null; screenings: Screening[] };
type MovieState = { movieKey: string; state: "watchlist" | "seen" | "dismissed"; note: string };
type MovieDetail = { director: string | null; cast: string[]; year: number | null; runtimeMinutes: number | null; originalLanguage: string | null; synopsis: string | null; screenings: Screening[] };
type Horizon = "tonight" | "tomorrow" | "week" | "coming" | "watchlist";
type UpcomingRelease = { key: string; title: string; releaseDate: string; imageUrl: string | null; detailsUrl: string };
type UpcomingMovieDetail = { title: string; posterUrl: string | null; synopsis: string | null; director: string | null; cast: string[]; genre: string | null; country: string | null; year: number | null; runtimeMinutes: number | null; trailerUrl: string | null; detailsUrl: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

function dateKey(offset = 0) { const value = new Date(); value.setDate(value.getDate() + offset); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function dateLabel(date: string) { return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)); }
function isOriginal(screening: Screening) { return screening.versionCode !== "DF"; }
function clockMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function estimatedFinishMinutes(screening: Screening, runtime: number, buffer: number) { return clockMinutes(screening.time) + runtime + buffer; }
function finishLabel(screening: Screening, runtime: number, buffer: number) {
  const finish = estimatedFinishMinutes(screening, runtime, buffer);
  return `${String(Math.floor(finish / 60) % 24).padStart(2, "0")}:${String(finish % 60).padStart(2, "0")}${finish >= 1_440 ? " next day" : ""}`;
}

function imageAtWidth(value: string | null, width: number) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === "culturekit-assets.imgix.net") url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    return value;
  }
}

function briefSynopsis(value: string) {
  const firstSentence = value.match(/^.+?[.!?](?=\s|$)/)?.[0];
  const summary = firstSentence && firstSentence.length >= 45 ? firstSentence : value;
  if (summary.length <= 180) return summary;
  return `${summary.slice(0, 180).replace(/\s+\S*$/, "").trimEnd()}…`;
}

const NEW_MOVIES_KEY = "fofo-graz-programme-seen-v1";
const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;

function newlyAddedMovies(movies: Movie[]) {
  const keys = movies.map((movie) => movie.key);
  try {
    const saved = window.localStorage.getItem(NEW_MOVIES_KEY);
    if (!saved) {
      window.localStorage.setItem(NEW_MOVIES_KEY, JSON.stringify({ seen: keys, newUntil: {} }));
      return new Set<string>();
    }
    const parsed = JSON.parse(saved) as { seen?: string[]; newUntil?: Record<string, number> };
    const seen = new Set(Array.isArray(parsed.seen) ? parsed.seen : []);
    const now = Date.now();
    const newUntil = Object.fromEntries(Object.entries(parsed.newUntil ?? {}).filter(([, until]) => typeof until === "number" && until > now));
    for (const key of keys) {
      if (!seen.has(key)) newUntil[key] = now + NEW_BADGE_MS;
      seen.add(key);
    }
    window.localStorage.setItem(NEW_MOVIES_KEY, JSON.stringify({ seen: [...seen], newUntil }));
    return new Set(keys.filter((key) => key in newUntil));
  } catch {
    return new Set<string>();
  }
}

export default function MoviesUpcoming() {
  const [view, setView] = useState<"programme" | "radar">("programme");
  return <div><div className="mb-3 grid grid-cols-2 border-[2.5px] border-black bg-white shadow-brutal-sm"><button type="button" onClick={() => setView("programme")} className={clsx("p-4 font-mono text-xs font-bold uppercase", view === "programme" ? "bg-black text-white" : "hover:bg-fofo-yellow")}>Playing in Graz</button><button type="button" onClick={() => setView("radar")} className={clsx("border-l-[2.5px] border-black p-4 font-mono text-xs font-bold uppercase", view === "radar" ? "bg-fofo-pink text-white" : "hover:bg-fofo-pink/20")}>Movies coming up</button></div>{view === "programme" ? <NonstopProgramme /> : <ReleaseRadar />}</div>;
}

function NonstopProgramme() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [states, setStates] = useState<Record<string, MovieState>>({});
  const [refreshedAt, setRefreshedAt] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("tonight");
  const [after, setAfter] = useState("17:00");
  const [latestFinish, setLatestFinish] = useState("");
  const [preShowMinutes, setPreShowMinutes] = useState(15);
  const [venue, setVenue] = useState("all");
  const [includeDubbed, setIncludeDubbed] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [details, setDetails] = useState<Record<string, MovieDetail | null>>({});
  const detailRequests = useRef(new Map<string, Promise<MovieDetail | null>>());
  const [newMovieKeys, setNewMovieKeys] = useState<Set<string>>(new Set());
  const [newOnly, setNewOnly] = useState(false);
  const [message, setMessage] = useState("Checking what’s playing in Graz…");
  const [choice, setChoice] = useState<Movie[]>([]);
  const [layout, setLayout] = useState<"films" | "times">("films");
  const [timingsLoading, setTimingsLoading] = useState(false);

  const loadDetail = useCallback((key: string) => {
    const existing = detailRequests.current.get(key);
    if (existing) return existing;
    const request = requestJson<MovieDetail>(`/api/workspace/movies/${key}`)
      .then((value) => { setDetails((current) => ({ ...current, [key]: value })); return value; })
      .catch(() => { setDetails((current) => ({ ...current, [key]: null })); return null; });
    detailRequests.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    requestJson<{ movies: Movie[]; states: MovieState[]; refreshedAt: string }>("/api/workspace/movies")
      .then((data) => { setMovies(data.movies); setNewMovieKeys(newlyAddedMovies(data.movies)); setStates(Object.fromEntries(data.states.map((state) => [state.movieKey, state]))); setRefreshedAt(data.refreshedAt); setMessage(""); })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (selected) void loadDetail(selected.key);
  }, [selected, loadDetail]);

  useEffect(() => {
    if (!latestFinish || !movies.length) return;
    const missing = movies.filter((movie) => !(movie.key in details));
    if (!missing.length) return;
    let cancelled = false;
    setTimingsLoading(true);
    Promise.all(missing.map((movie) => loadDetail(movie.key)))
      .finally(() => { if (!cancelled) setTimingsLoading(false); });
    return () => { cancelled = true; };
  }, [latestFinish, movies, details, loadDetail]);

  const eligible = useMemo(() => {
    const today = dateKey(), tomorrow = dateKey(1), weekEnd = dateKey(7);
    return movies.flatMap((movie) => {
      const movieState = states[movie.key]?.state;
      if (movieState === "dismissed") return [];
      if (newOnly && !newMovieKeys.has(movie.key)) return [];
      let screenings = movie.screenings.filter((screening) => venue === "all" || screening.venueId === venue);
      if (!includeDubbed) screenings = screenings.filter(isOriginal);
      screenings = screenings.filter((screening) => {
        if (horizon === "watchlist") return movieState === "watchlist" && screening.date >= today;
        if (horizon === "tonight") return screening.date === today && screening.time >= after;
        if (horizon === "tomorrow") return screening.date === tomorrow;
        if (horizon === "week") return screening.date >= today && screening.date <= weekEnd;
        return screening.date > weekEnd;
      });
      if (latestFinish) {
        const runtime = details[movie.key]?.runtimeMinutes;
        screenings = runtime ? screenings.filter((screening) => estimatedFinishMinutes(screening, runtime, preShowMinutes) <= clockMinutes(latestFinish)) : [];
      }
      return screenings.length ? [{ ...movie, screenings }] : [];
    });
  }, [movies, states, venue, includeDubbed, horizon, after, latestFinish, details, preShowMinutes, newOnly, newMovieKeys]);

  const agenda = useMemo(() => eligible.flatMap((movie) => movie.screenings.map((screening) => ({ movie, screening }))).sort((a, b) => a.screening.startsAt.localeCompare(b.screening.startsAt)), [eligible]);

  async function setMovieState(movieKey: string, state: MovieState["state"] | null, noteOverride?: string) {
    const previous = states[movieKey];
    const note = noteOverride ?? previous?.note ?? "";
    setStates((current) => { const next = { ...current }; if (state) next[movieKey] = { movieKey, state, note }; else delete next[movieKey]; return next; });
    try {
      const result = await requestJson<{ state: MovieState | null }>(`/api/workspace/movies/${movieKey}`, { method: "PATCH", body: JSON.stringify({ state, note }) });
      setStates((current) => { const next = { ...current }; if (result.state) next[movieKey] = result.state; else delete next[movieKey]; return next; });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
  }

  function helpMeChoose() {
    const distinct = [...eligible].sort((a, b) => {
      const watch = Number(states[b.key]?.state === "watchlist") - Number(states[a.key]?.state === "watchlist");
      const fresh = Number(newMovieKeys.has(b.key)) - Number(newMovieKeys.has(a.key));
      return watch || fresh || a.screenings[0].startsAt.localeCompare(b.screenings[0].startsAt) || a.title.localeCompare(b.title);
    });
    const varied = distinct.filter((movie, index) => index === 0 || movie.screenings[0].venueId !== distinct[0].screenings[0].venueId);
    setChoice([...varied, ...distinct.filter((movie) => !varied.includes(movie))].slice(0, 3));
  }

  return <section className="border-[2.5px] border-black bg-white shadow-brutal">
    <div className="grid border-b-[2.5px] border-black lg:grid-cols-[1fr_auto]">
      <div className="bg-[#241231] p-5 text-white md:p-7">
        <p className="meta !text-fofo-pink">{"// Graz · nonstop"}</p>
        <h2 className="mt-2 font-display text-3xl font-bold lowercase leading-tight md:text-4xl">tonight deserves a film.</h2>
        <p className="mt-2 text-sm text-white/70">Four Graz cinemas · original versions first · every listed screening in one place.</p>
      </div>
      <div className="flex min-w-56 flex-col justify-between border-t-[2.5px] border-black bg-fofo-pink p-5 lg:border-l lg:border-t-0">
        <Sparkles className="h-6 w-6" />
        <div><p className="font-mono text-[10px] uppercase tracking-widest">Published programme</p><p className="mt-1 text-sm">{refreshedAt ? "Checked " + new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(refreshedAt)) : "Checking now…"}</p></div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2 border-b-[2.5px] border-black bg-fofo-paper p-3">
      {(["tonight", "tomorrow", "week", "coming", "watchlist"] as Horizon[]).map((value) => <button type="button" key={value} onClick={() => setHorizon(value)} className={clsx("border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase", horizon === value ? "bg-black text-white" : "bg-white hover:bg-fofo-yellow")}>{value === "week" ? "This week" : value === "coming" ? "Coming soon" : value}</button>)}
      <button type="button" onClick={helpMeChoose} className="ml-auto flex items-center gap-2 border-2 border-black bg-fofo-yellow px-4 py-2 font-mono text-xs font-bold uppercase"><Sparkles className="h-4 w-4" />Help me choose</button>
    </div>
    <div className="grid border-b-[2.5px] border-black sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr]">
      <label className="border-b-2 border-black p-4 sm:border-r-2 xl:border-b-0"><span className="font-mono text-[10px] uppercase tracking-widest">Earliest start</span><input type="time" value={after} onChange={(event) => setAfter(event.target.value)} className="mt-2 block w-full border-2 border-black bg-white px-3 py-2" /></label>
      <label className="border-b-2 border-black p-4 xl:border-b-0 xl:border-r-2"><span className="font-mono text-[10px] uppercase tracking-widest">Cinema</span><select value={venue} onChange={(event) => setVenue(event.target.value)} className="mt-2 block w-full border-2 border-black bg-white px-3 py-2"><option value="all">All four cinemas</option><option value="filmzentrum-im-rechbauerkino">Rechbauerkino</option><option value="geidorf-kunstkino">Geidorf Kunstkino</option><option value="kiz-royalkino">KIZ RoyalKino</option><option value="schubert-kino">Schubert Kino</option></select></label>
      <label className="flex cursor-pointer items-center gap-3 p-4"><input type="checkbox" checked={includeDubbed} onChange={(event) => setIncludeDubbed(event.target.checked)} className="h-5 w-5 accent-fofo-blue" /><span><strong className="block text-sm">Include dubbed</strong><span className="text-xs text-black/50">Original versions only by default</span></span></label>
    </div>
    <details className="border-b-[2.5px] border-black bg-fofo-paper">
      <summary className="cursor-pointer px-4 py-3 font-mono text-xs font-bold uppercase">Timing options {latestFinish ? "· finish filter on" : ""}</summary>
      <div className="grid gap-3 border-t-2 border-black p-4 sm:grid-cols-2">
        <label><span className="font-mono text-[10px] uppercase tracking-widest">Latest finish</span><select value={latestFinish} onChange={(event) => setLatestFinish(event.target.value)} className="mt-2 block w-full border-2 border-black bg-white px-3 py-2"><option value="">Any finish</option><option value="21:00">Film ends by 21:00</option><option value="22:00">Film ends by 22:00</option><option value="23:00">Film ends by 23:00</option><option value="23:59">Film ends before midnight</option></select></label>
        <label><span className="font-mono text-[10px] uppercase tracking-widest">Extra time after film starts</span><select value={preShowMinutes} onChange={(event) => setPreShowMinutes(Number(event.target.value))} className="mt-2 block w-full border-2 border-black bg-white px-3 py-2"><option value={0}>Runtime only</option><option value={15}>+ 15 min allowance</option><option value={25}>+ 25 min allowance</option></select></label>
        <p className="text-xs text-black/55 sm:col-span-2">Finish times are estimates. Films without a published runtime cannot be verified against this filter.</p>
      </div>
    </details>
    {message ? <p className="p-6 font-mono text-sm">{message}</p> : null}
    {choice.length ? <div className="border-b-[2.5px] border-black bg-fofo-yellow p-5"><div className="flex items-center justify-between"><div><p className="meta">Three that fit</p><h3 className="font-display text-2xl font-bold lowercase">let’s make it easy.</h3></div><button type="button" onClick={() => setChoice([])} aria-label="Dismiss suggestions"><X className="h-5 w-5" /></button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{choice.map((movie, index) => <button type="button" key={movie.key} onClick={() => setSelected(movie)} className="border-2 border-black bg-white p-4 text-left shadow-brutal-sm"><span className="font-mono text-xs">0{index + 1}</span><strong className="mt-2 block text-lg">{movie.title}</strong><span className="mt-2 block text-xs text-black/55">{states[movie.key]?.state === "watchlist" ? "On your watchlist" : newMovieKeys.has(movie.key) ? "New in the programme" : movie.screenings[0].versionLabel} · {movie.screenings[0].time} at {movie.screenings[0].venue}</span></button>)}</div></div> : null}
    <div className="flex flex-wrap items-center gap-3 border-b-[2.5px] border-black p-3"><p className="font-mono text-[10px] uppercase text-black/55">{timingsLoading ? "Calculating finish times…" : `${eligible.length} films · ${agenda.length} screenings`}</p>{newMovieKeys.size > 0 ? <button type="button" onClick={() => setNewOnly((value) => !value)} aria-pressed={newOnly} title="New to your Graz programme since an earlier visit; highlighted for seven days." className={clsx("border-2 border-black px-2 py-1 font-mono text-[10px] font-bold uppercase", newOnly ? "bg-fofo-pink text-white" : "bg-fofo-pink/20")}>{newMovieKeys.size} recently added</button> : null}<div className="ml-auto flex"><button type="button" onClick={() => setLayout("films")} className={clsx("border-2 border-black px-3 py-2 font-mono text-[10px] uppercase", layout === "films" && "bg-black text-white")}>Films</button><button type="button" onClick={() => setLayout("times")} className={clsx("border-y-2 border-r-2 border-black px-3 py-2 font-mono text-[10px] uppercase", layout === "times" && "bg-black text-white")}>By time</button></div></div>
    {layout === "films" ? <div className="grid gap-px bg-black md:grid-cols-2 2xl:grid-cols-3">{eligible.map((movie) => <MovieCard key={movie.key} movie={movie} state={states[movie.key]?.state ?? null} detail={details[movie.key] ?? null} detailLoaded={movie.key in details} isNew={newMovieKeys.has(movie.key)} finishAllowance={preShowMinutes} onRequestDetail={loadDetail} onOpen={() => setSelected(movie)} onState={(state) => setMovieState(movie.key, state)} />)}</div> : <div className="divide-y-2 divide-black">{agenda.map(({ movie, screening }) => <button key={screening.id} type="button" onClick={() => setSelected({ ...movie, screenings: [screening, ...movie.screenings.filter((item) => item.id !== screening.id)] })} className="grid w-full grid-cols-[5rem_1fr] gap-4 p-4 text-left hover:bg-fofo-yellow sm:grid-cols-[5rem_1fr_14rem_9rem]"><span><strong className="block font-mono text-xl">{screening.time}</strong><small className="font-mono text-[9px] uppercase text-black/45">{dateLabel(screening.date)}</small></span><span><strong className="block">{movie.title}{newMovieKeys.has(movie.key) ? <span className="ml-2 border border-black bg-fofo-pink px-1.5 py-0.5 font-mono text-[9px] uppercase text-white">New here</span> : null}</strong><small className="text-black/45">{screening.versionLabel}</small></span><span className="hidden text-sm sm:block">{screening.venue}</span><span className="hidden font-mono text-xs sm:block">{details[movie.key]?.runtimeMinutes ? `est. ${finishLabel(screening, details[movie.key]!.runtimeMinutes!, preShowMinutes)}` : "finish unknown"}</span></button>)}</div>}
    {!message && !eligible.length && !timingsLoading ? <div className="p-12 text-center"><Film className="mx-auto h-10 w-10 text-black/25" /><h3 className="mt-4 font-display text-2xl font-bold lowercase">{latestFinish ? "no verified finish times fit." : newOnly ? "no new films for that window." : "nothing published for that window."}</h3><p className="mt-2 text-sm text-black/45">{latestFinish ? "Try a later finish time. Films without a published runtime cannot be checked against this filter." : "Try another day, include dubbed versions, or widen the cinema filter."}</p></div> : null}
    {selected ? <MoviePanel movie={selected} detail={details[selected.key] ?? null} detailLoaded={selected.key in details} stateRecord={states[selected.key] ?? null} isNew={newMovieKeys.has(selected.key)} onState={(state, note) => setMovieState(selected.key, state, note)} onClose={() => setSelected(null)} /> : null}
  </section>;
}

function MovieCard({ movie, detail, detailLoaded, state, isNew, finishAllowance, onRequestDetail, onOpen, onState }: {
  movie: Movie;
  detail: MovieDetail | null;
  detailLoaded: boolean;
  state: MovieState["state"] | null;
  isNew: boolean;
  finishAllowance: number;
  onRequestDetail: (key: string) => Promise<MovieDetail | null>;
  onOpen: () => void;
  onState: (state: MovieState["state"] | null) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const first = movie.screenings[0];
  const second = movie.screenings[1];

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) {
      void onRequestDetail(movie.key);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void onRequestDetail(movie.key);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(card);
    return () => observer.disconnect();
  }, [movie.key, onRequestDetail]);

  return <article ref={cardRef} className="flex flex-col bg-white">
    <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left hover:bg-fofo-paper" aria-label={`Film details and screenings for ${movie.title}`}>
      <div className="relative aspect-[2.2/1] w-full overflow-hidden bg-[#241231]">
        {movie.imageUrl ? <Image src={imageAtWidth(movie.imageUrl, 1100)!} alt="" fill sizes="(min-width: 1536px) 33vw, (min-width: 768px) 50vw, 100vw" quality={85} className="object-cover" /> : <div className="flex h-full items-center justify-center p-6 text-center font-display text-3xl font-bold lowercase text-white">{movie.title}</div>}
        <span className="absolute left-3 top-3 border-2 border-black bg-fofo-yellow px-2 py-1 font-mono text-[10px] font-bold uppercase">{first.versionCode || "version ?"}</span>
        {isNew ? <span className="absolute right-3 top-3 border-2 border-black bg-fofo-pink px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">New here</span> : null}
      </div>
      <div className="flex w-full flex-1 flex-col p-4">
        <h3 className="font-display text-xl font-bold leading-tight">{movie.title}</h3>
        <p className="mt-1 font-mono text-[10px] uppercase text-black/55">{[detail?.year, detail?.runtimeMinutes ? `${detail.runtimeMinutes} min` : null, detail?.originalLanguage].filter(Boolean).join(" · ") || (detailLoaded ? "Details unavailable" : "Loading film details…")}</p>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-black/65">{detail?.synopsis ? briefSynopsis(detail.synopsis) : (detailLoaded ? "Description unavailable from nonstop." : "Loading a short film description…")}</p>
        <div className="mt-auto pt-4">
          <p className="flex items-center gap-2 font-mono text-sm font-bold"><Clock3 className="h-4 w-4" />{dateLabel(first.date)} · {first.time}</p>
          <p className="mt-1 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" />{first.venue} <span className="font-mono text-[10px] uppercase text-black/50">{first.versionLabel}</span></p>
          {detail?.runtimeMinutes ? <p className="mt-2 font-mono text-[10px] uppercase text-black/55">Estimated finish {finishLabel(first, detail.runtimeMinutes, finishAllowance)}</p> : null}
          {second ? <p className="mt-2 font-mono text-[10px] text-black/55">Also {dateLabel(second.date)} · {second.time}{movie.screenings.length > 2 ? ` · ${movie.screenings.length - 2} more` : ""}</p> : null}
        </div>
      </div>
    </button>
    <div className="grid grid-cols-2 border-t-2 border-black"><button type="button" onClick={() => onState(state === "watchlist" ? null : "watchlist")} className={clsx("flex items-center justify-center gap-2 p-3 font-mono text-[10px] uppercase", state === "watchlist" && "bg-fofo-yellow")}><Bookmark className="h-4 w-4" />Want to see</button><button type="button" onClick={() => onState(state === "seen" ? null : "seen")} className={clsx("flex items-center justify-center gap-2 border-l-2 border-black p-3 font-mono text-[10px] uppercase", state === "seen" && "bg-fofo-blue text-white")}><Check className="h-4 w-4" />Seen</button></div>
  </article>;
}

function ReleaseRadar() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [states, setStates] = useState<Record<string, MovieState>>({});
  const [windowDays, setWindowDays] = useState<30 | 90 | 180 | "saved">(90);
  const [query, setQuery] = useState("");
  const [refreshedAt, setRefreshedAt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("https://www.uncut.at/movies/filmstarts.php");
  const [message, setMessage] = useState("Reading the Austrian release calendar…");
  const [selected, setSelected] = useState<UpcomingRelease | null>(null);
  const [detail, setDetail] = useState<UpcomingMovieDetail | null>(null);

  useEffect(() => {
    requestJson<{ releases: UpcomingRelease[]; refreshedAt: string; sourceUrl: string; states: MovieState[] }>("/api/workspace/movies/upcoming").then((upcoming) => {
      setReleases(upcoming.releases);
      setRefreshedAt(upcoming.refreshedAt);
      setSourceUrl(upcoming.sourceUrl);
      setStates(Object.fromEntries(upcoming.states.map((state) => [state.movieKey, state])));
      setMessage("");
    }).catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetail(null);
    const movieId = selected.key.replace("upcoming_", "");
    requestJson<UpcomingMovieDetail>(`/api/workspace/movies/upcoming/${movieId}`).then(setDetail).catch((error) => setMessage(error.message));
  }, [selected]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-AT");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit = new Date(today); if (windowDays !== "saved") limit.setDate(limit.getDate() + windowDays);
    return releases.filter((movie) => {
      const state = states[movie.key]?.state;
      if (state === "dismissed") return false;
      if (normalizedQuery && !movie.title.toLocaleLowerCase("de-AT").includes(normalizedQuery)) return false;
      if (windowDays === "saved") return state === "watchlist";
      return new Date(`${movie.releaseDate}T12:00:00`) <= limit;
    });
  }, [query, releases, states, windowDays]);

  const grouped = useMemo(() => {
    const months = new Map<string, UpcomingRelease[]>();
    for (const movie of filtered) {
      const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${movie.releaseDate}T12:00:00`));
      months.set(label, [...(months.get(label) ?? []), movie]);
    }
    return [...months];
  }, [filtered]);

  async function setReleaseState(movieKey: string, state: MovieState["state"] | null) {
    const previous = states[movieKey];
    setStates((current) => { const next = { ...current }; if (state) next[movieKey] = { movieKey, state, note: previous?.note ?? "" }; else delete next[movieKey]; return next; });
    try {
      const result = await requestJson<{ state: MovieState | null }>(`/api/workspace/movies/${movieKey}`, { method: "PATCH", body: JSON.stringify({ state, note: previous?.note ?? "" }) });
      setStates((current) => { const next = { ...current }; if (result.state) next[movieKey] = result.state; else delete next[movieKey]; return next; });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
  }

  return <section className="border-[2.5px] border-black bg-white shadow-brutal">
    <div className="grid border-b-[2.5px] border-black lg:grid-cols-[1.2fr_.8fr]"><div className="bg-[#101b38] p-6 text-white md:p-9"><p className="meta !text-fofo-yellow">{"// Austria · release radar"}</p><h2 className="mt-3 font-display text-4xl font-bold lowercase leading-[.95] md:text-6xl">what’s coming to cinemas.</h2><p className="mt-5 max-w-xl text-sm leading-6 text-white/60">A wider look at announced Austrian theatrical releases. These films may reach Graz or Nonstop later; a release date is not yet a screening.</p></div><div className="flex flex-col justify-between border-t-[2.5px] border-black bg-fofo-yellow p-6 lg:border-l lg:border-t-0"><CalendarDays className="h-8 w-8" /><div><p className="font-mono text-[10px] uppercase tracking-widest">Austrian release calendar</p><p className="mt-2 text-sm">{refreshedAt ? `Checked ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(refreshedAt))}` : "Checking now…"}</p><a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase underline">Source: UNCUT <ExternalLink className="h-3 w-3" /></a></div></div></div>
    <div className="flex flex-wrap gap-2 border-b-[2.5px] border-black bg-fofo-paper p-3">{([30, 90, 180] as const).map((days) => <button type="button" key={days} onClick={() => setWindowDays(days)} className={clsx("border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase", windowDays === days ? "bg-black text-white" : "bg-white hover:bg-fofo-yellow")}>Next {days} days</button>)}<button type="button" onClick={() => setWindowDays("saved")} className={clsx("border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase", windowDays === "saved" ? "bg-fofo-yellow" : "bg-white hover:bg-fofo-yellow")}>Saved</button><label className="ml-auto flex min-w-64 items-center gap-2 border-2 border-black bg-white px-3"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search releases" className="w-full bg-transparent py-2 text-sm outline-none" /></label></div>
    {message ? <p className="p-6 font-mono text-sm">{message}</p> : null}
    <div>{grouped.map(([month, movies]) => <section key={month}><div className="sticky top-20 z-10 border-y-[2.5px] border-black bg-fofo-pink px-5 py-3 text-white first:border-t-0"><h3 className="font-display text-2xl font-bold lowercase">{month}</h3><p className="font-mono text-[9px] uppercase">{movies.length} announced releases</p></div><div className="grid gap-px bg-black md:grid-cols-2 xl:grid-cols-3">{movies.map((movie) => {
      const state = states[movie.key]?.state ?? null;
      const releaseDate = new Date(`${movie.releaseDate}T12:00:00`);
      const checkedDate = refreshedAt.slice(0, 10) || dateKey();
      const daysAway = Math.max(0, Math.round((Date.parse(`${movie.releaseDate}T00:00:00Z`) - Date.parse(`${checkedDate}T00:00:00Z`)) / 86_400_000));
      return <article key={movie.key} className="grid min-h-28 grid-cols-[4rem_1fr] bg-white"><button type="button" onClick={() => setSelected(movie)} aria-label={`View details for ${movie.title}`} className="relative m-3 mr-0 h-16 overflow-hidden border-2 border-black bg-[#241231]">{movie.imageUrl ? <Image src={movie.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : <Film className="m-4 h-7 w-7 text-white" />}</button><div className="flex min-w-0 flex-col p-3"><p className="font-mono text-[9px] uppercase text-fofo-blue">{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(releaseDate)} · {daysAway === 0 ? "today" : `in ${daysAway} days`}</p><button type="button" onClick={() => setSelected(movie)} className="mt-1 text-left"><h4 className="line-clamp-2 font-display text-lg font-bold leading-tight hover:text-fofo-blue">{movie.title}</h4></button><p className="mt-1 text-[10px] text-black/45">Not yet confirmed for Nonstop</p><div className="mt-auto flex gap-2 pt-2"><button type="button" onClick={() => setReleaseState(movie.key, state === "watchlist" ? null : "watchlist")} className={clsx("flex items-center gap-1 border-2 border-black px-2 py-1 font-mono text-[9px] uppercase", state === "watchlist" && "bg-fofo-yellow")}><Bookmark className="h-3 w-3" />{state === "watchlist" ? "Saved" : "Save"}</button><button type="button" onClick={() => setReleaseState(movie.key, "dismissed")} className="border-2 border-black px-2 py-1 font-mono text-[9px] uppercase">Hide</button><button type="button" onClick={() => setSelected(movie)} aria-label={`Open details for ${movie.title}`} className="ml-auto border-2 border-black bg-fofo-blue p-1.5 text-white"><ExternalLink className="h-3 w-3" /></button></div></div></article>;
    })}</div></section>)}</div>
    {!message && !filtered.length ? <div className="p-12 text-center"><CalendarDays className="mx-auto h-10 w-10 text-black/25" /><h3 className="mt-4 font-display text-2xl font-bold lowercase">no releases in that view.</h3><p className="mt-2 text-sm text-black/45">Widen the date window or clear the search.</p></div> : null}
    {selected ? <UpcomingMoviePanel movie={selected} detail={detail} state={states[selected.key]?.state ?? null} onState={(state) => setReleaseState(selected.key, state)} onClose={() => setSelected(null)} /> : null}
  </section>;
}

function useMovieDialog(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);
}

function UpcomingMoviePanel({ movie, detail, state, onState, onClose }: { movie: UpcomingRelease; detail: UpcomingMovieDetail | null; state: MovieState["state"] | null; onState: (state: MovieState["state"] | null) => void; onClose: () => void }) {
  useMovieDialog(onClose);
  const date = new Date(`${movie.releaseDate}T12:00:00`);
  return createPortal(<div className="fixed inset-0 z-[200] overflow-y-auto bg-black/75 p-3 pt-24 md:p-8 md:pt-28" role="dialog" aria-modal="true" aria-label={movie.title} onClick={(event) => { if (event.target === event.currentTarget) window.setTimeout(onClose, 0); }}><button type="button" onClick={(event) => { event.stopPropagation(); window.setTimeout(onClose, 0); }} aria-label="Close upcoming movie" className="fixed right-4 top-24 z-[220] grid h-12 w-12 place-items-center border-[3px] border-black bg-white shadow-brutal hover:bg-fofo-pink hover:text-white md:right-8"><X className="h-7 w-7" /></button><div className="mx-auto grid max-w-5xl border-[3px] border-black bg-white shadow-brutal-lg md:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr]"><div className="relative min-h-64 max-h-80 bg-[#101b38] md:max-h-none md:min-h-0">{detail?.posterUrl || movie.imageUrl ? <Image src={detail?.posterUrl ?? movie.imageUrl!} alt="" fill sizes="(min-width: 1024px) 256px, (min-width: 768px) 224px, 100vw" className="object-contain" /> : <Film className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/40" />}</div><div><div className="border-b-[3px] border-black bg-fofo-yellow p-6 md:p-8"><p className="font-mono text-[10px] uppercase tracking-widest">Austrian release · {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)}</p><h2 className="mt-3 font-display text-4xl font-bold leading-none md:text-5xl">{detail?.title ?? movie.title}</h2><p className="mt-4 text-sm font-semibold">Announced for Austrian cinemas · not yet confirmed for Nonstop</p></div><div className="p-6 md:p-8">{detail ? <><p className="font-mono text-xs uppercase text-black/45">{[detail.year, detail.country, detail.genre, detail.runtimeMinutes ? `${detail.runtimeMinutes} min` : null].filter(Boolean).join(" · ")}</p>{detail.director ? <p className="mt-5 text-sm"><span className="text-black/45">Directed by</span> {detail.director}</p> : null}{detail.cast.length ? <p className="mt-2 text-sm"><span className="text-black/45">With</span> {detail.cast.join(", ")}</p> : null}{detail.synopsis ? <p className="mt-6 max-w-2xl text-sm leading-6 text-black/65">{detail.synopsis}</p> : null}</> : <p className="text-sm text-black/45">Loading movie details…</p>}<div className="mt-7 flex flex-wrap gap-2"><button type="button" onClick={() => onState(state === "watchlist" ? null : "watchlist")} className="border-2 border-black bg-fofo-yellow px-4 py-2 font-mono text-xs uppercase"><Bookmark className="mr-2 inline h-4 w-4" />{state === "watchlist" ? "Saved" : "Want to see"}</button>{detail?.trailerUrl ? <a href={detail.trailerUrl} target="_blank" rel="noreferrer" className="border-2 border-black px-4 py-2 font-mono text-xs uppercase">Trailer <ExternalLink className="ml-2 inline h-3 w-3" /></a> : null}<a href={detail?.detailsUrl ?? movie.detailsUrl} target="_blank" rel="noreferrer" className="border-2 border-black bg-fofo-blue px-4 py-2 font-mono text-xs uppercase text-white">Full details <ExternalLink className="ml-2 inline h-3 w-3" /></a></div></div></div></div></div>, document.body);
}

function MoviePanel({ movie, detail, detailLoaded, stateRecord, isNew, onState, onClose }: {
  movie: Movie;
  detail: MovieDetail | null;
  detailLoaded: boolean;
  stateRecord: MovieState | null;
  isNew: boolean;
  onState: (state: MovieState["state"] | null, note?: string) => void;
  onClose: () => void;
}) {
  useMovieDialog(onClose);
  const state = stateRecord?.state ?? null;
  const [note, setNote] = useState(stateRecord?.note ?? "");
  useEffect(() => setNote(stateRecord?.note ?? ""), [stateRecord?.note]);
  const grouped = useMemo(() => {
    const map = new Map<string, Screening[]>();
    const screenings = detail?.screenings.length ? detail.screenings : movie.screenings;
    for (const screening of screenings) {
      map.set(screening.date, [...(map.get(screening.date) ?? []), screening]);
    }
    return [...map];
  }, [detail, movie.screenings]);
  const next = movie.screenings[0];
  const nextDetails = detail?.screenings.find((screening) => screening.id === next.id);
  const nextUrl = nextDetails?.cinemaUrl ?? movie.url;

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/75 p-3 pt-20 md:p-8 md:pt-20" role="dialog" aria-modal="true" aria-label={movie.title} onClick={(event) => { if (event.target === event.currentTarget) window.setTimeout(onClose, 0); }}>
      <button type="button" onClick={(event) => { event.stopPropagation(); window.setTimeout(onClose, 0); }} aria-label="Close film" className="fixed right-4 top-4 z-[220] grid h-12 w-12 place-items-center border-[3px] border-black bg-white shadow-brutal hover:bg-fofo-pink hover:text-white md:right-8"><X className="h-7 w-7" /></button>
      <div className="mx-auto max-w-5xl border-[3px] border-black bg-white shadow-brutal-lg">
        <div className="grid md:grid-cols-[.85fr_1.15fr]">
          <div className="bg-[#241231] p-3 md:p-5">
            <div className="relative aspect-[3/2] w-full">
              {movie.imageUrl ? <Image src={imageAtWidth(movie.imageUrl, 1200)!} alt="" fill sizes="(min-width: 768px) 42vw, 100vw" quality={85} className="object-contain" /> : <div className="flex h-full items-center justify-center p-6 text-center font-display text-4xl font-bold lowercase text-white">{movie.title}</div>}
            </div>
          </div>
          <div className="p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2"><p className="meta">{"// now in Graz"}</p>{isNew ? <span className="border-2 border-black bg-fofo-pink px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">New here</span> : null}</div>
            <h2 className="mt-2 font-display text-4xl font-bold leading-none md:text-5xl">{movie.title}</h2>
            <p className="mt-3 font-mono text-xs uppercase text-black/55">{[detail?.year, detail?.runtimeMinutes ? `${detail.runtimeMinutes} min` : null, detail?.originalLanguage].filter(Boolean).join(" · ") || (detailLoaded ? "Details unavailable" : "Film details loading…")}</p>
            {detail?.director ? <p className="mt-3 text-sm"><span className="text-black/50">Directed by</span> {detail.director}</p> : null}
            <div className="mt-5 border-[2.5px] border-black bg-fofo-yellow p-4">
              <p className="font-mono text-[10px] font-bold uppercase">Next matching screening</p>
              <p className="mt-2 font-display text-xl font-bold">{dateLabel(next.date)} · {next.time}</p>
              <p className="mt-1 text-sm">{next.venue} · {next.versionLabel}</p>
              <a href={nextUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 font-mono text-xs font-bold uppercase">{nextDetails?.cinemaUrl ? "Open cinema programme" : "Open nonstop film page"}<ExternalLink className="h-4 w-4" /></a>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onState(state === "watchlist" ? null : "watchlist", note)} className="border-2 border-black px-3 py-2 font-mono text-xs uppercase">{state === "watchlist" ? "Saved ✓" : "Want to see"}</button>
              <button type="button" onClick={() => onState(state === "seen" ? null : "seen", note)} className="border-2 border-black px-3 py-2 font-mono text-xs uppercase">{state === "seen" ? "Seen ✓" : "Mark seen"}</button>
              <button type="button" onClick={() => { onState("dismissed", note); onClose(); }} className="border-2 border-black px-3 py-2 font-mono text-xs uppercase">Not for me</button>
            </div>
          </div>
        </div>
        <div className="border-t-[3px] border-black p-5 md:p-7">
          <h3 className="font-display text-2xl font-bold">All Graz screenings</h3>
          <p className="mt-1 text-xs text-black/55">Listed by nonstop. Check the cinema for seats and booking details.</p>
          <div className="mt-5 space-y-5">
            {grouped.map(([date, screenings]) => <div key={date}><h4 className="border-b-2 border-black pb-2 font-display text-lg font-bold">{dateLabel(date)}</h4><div>{screenings.map((screening) => <div key={screening.id} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 border-b border-black/15 py-3"><strong className="font-mono text-lg">{screening.time}</strong><div><p className="text-sm font-semibold">{screening.venue}</p><p className="text-xs text-black/55">{screening.versionLabel}</p></div><div className="flex gap-1">{screening.calendarUrl ? <a href={screening.calendarUrl} aria-label="Add to calendar" className="border-2 border-black p-2"><CalendarPlus className="h-4 w-4" /></a> : null}<a href={screening.cinemaUrl ?? movie.url} target="_blank" rel="noreferrer" aria-label={screening.cinemaUrl ? "Open cinema programme" : "Open nonstop film page"} className="border-2 border-black bg-fofo-blue p-2 text-white"><ExternalLink className="h-4 w-4" /></a></div></div>)}</div></div>)}
          </div>
        </div>
        <div className="border-t-[3px] border-black bg-fofo-paper p-5 md:p-7">
          <h3 className="font-display text-2xl font-bold">About the film</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">{detail?.synopsis || (detailLoaded ? "Film description unavailable from nonstop." : "Loading film description…")}</p>
          {detail?.cast.length ? <p className="mt-3 text-sm text-black/60"><strong>Cast:</strong> {detail.cast.join(", ")}</p> : null}
          <label className="mt-5 block font-mono text-[10px] font-bold uppercase">Personal note<textarea value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => state && onState(state, note)} placeholder="Why this one caught your eye…" className="mt-2 min-h-16 w-full border-2 border-black bg-white p-3 font-sans text-sm font-normal normal-case" /></label>
          <p className="mt-4 text-xs leading-5 text-black/50">Programme without guarantee. “Listed” does not mean seats are available. Reserve externally and check the cinema’s ticket collection deadline.</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
