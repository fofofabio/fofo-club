import "server-only";

const PROGRAMME_URL = "https://nonstopkino.at/programm/?location=steiermark";
const MOVIE_ORIGIN = "https://nonstopkino.at";
const GRAZ_VENUES = new Map([
  ["filmzentrum-im-rechbauerkino", "Rechbauerkino"],
  ["geidorf-kunstkino", "Geidorf Kunstkino"],
  ["kiz-royalkino", "KIZ RoyalKino"],
  ["schubert-kino", "Schubert Kino"],
]);
let programmeCache: { value: { movies: Movie[]; refreshedAt: string }; expiresAt: number } | null = null;

export type Screening = {
  id: string;
  startsAt: string;
  date: string;
  time: string;
  venueId: string;
  venue: string;
  versionCode: string;
  versionLabel: string;
  cinemaUrl: string | null;
  calendarUrl: string | null;
};

export type Movie = {
  key: string;
  title: string;
  url: string;
  imageUrl: string | null;
  screenings: Screening[];
};

export type MovieDetail = {
  director: string | null;
  cast: string[];
  year: number | null;
  runtimeMinutes: number | null;
  originalLanguage: string | null;
  synopsis: string | null;
};

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function text(value: string | undefined) {
  return decodeEntities((value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function attr(html: string, name: string) {
  return html.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
}

function classBlock(html: string, className: string) {
  return html.match(new RegExp(`<p[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/p>`, "i"))?.[1] ?? "";
}

function classValue(html: string, className: string) {
  const block = classBlock(html, className);
  return text(block.match(/<span[^>]+class="[^"]*\bvalue\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? block) || null;
}

function versionLabel(code: string) {
  const labels: Record<string, string> = {
    DF: "German dubbed",
    OV: "Original version",
    OmU: "Original with subtitles",
    OmdU: "Original with German subtitles",
    OmeU: "Original with English subtitles",
  };
  return labels[code] ?? (code || "Version not specified");
}

function safeMovieUrl(value: string) {
  try {
    const parsed = new URL(value, MOVIE_ORIGIN);
    return parsed.origin === MOVIE_ORIGIN && parsed.pathname.startsWith("/movies/")
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function safeHttpsUrl(value: string | null, origin?: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value, MOVIE_ORIGIN);
    return parsed.protocol === "https:" && (!origin || parsed.origin === origin) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export async function fetchGrazProgramme(): Promise<{ movies: Movie[]; refreshedAt: string }> {
  if (programmeCache && programmeCache.expiresAt > Date.now()) return programmeCache.value;
  const response = await fetch(PROGRAMME_URL, {
    headers: { "User-Agent": "FofoClubWorkspace/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Programme source returned ${response.status}.`);

  const html = await response.text();
  if (html.length > 3_000_000) throw new Error("Programme response exceeded the safe size limit.");

  const movieMap = new Map<string, Movie>();
  const articles = html.match(/<article\b[\s\S]*?<\/article>/g) ?? [];

  for (const article of articles) {
    const venueId = attr(article, "data-venue") ?? "";
    const venue = GRAZ_VENUES.get(venueId);
    if (!venue) continue;

    const url = safeMovieUrl(article.match(/<a[^>]+href="([^"]+)"/)?.[1] ?? "");
    const title = text(article.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]);
    const date = attr(article, "data-weekday") ?? "";
    const time = text(article.match(/class="big">([\s\S]*?)<\/div>/)?.[1]);
    if (!url || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) continue;

    const key = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const code = attr(article, "data-language") ?? "";
    const imageUrl = article.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;
    // Keep the cinema's published local wall time. Austria changes between
    // CET and CEST, so attaching a fixed offset would silently shift shows.
    const startsAt = `${date}T${time}:00`;
    const existing = movieMap.get(key) ?? { key, title, url, imageUrl, screenings: [] };

    existing.screenings.push({
      id: attr(article, "id") ?? `${key}-${venueId}-${date}-${time}-${code}`,
      startsAt,
      date,
      time,
      venueId,
      venue,
      versionCode: code,
      versionLabel: versionLabel(code),
      cinemaUrl: null,
      calendarUrl: null,
    });
    movieMap.set(key, existing);
  }

  const movies = [...movieMap.values()]
    .map((movie) => ({ ...movie, screenings: movie.screenings.sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }))
    .sort((a, b) => a.screenings[0].startsAt.localeCompare(b.screenings[0].startsAt));

  if (!movies.length) throw new Error("The Graz programme could not be recognized.");
  const value = { movies, refreshedAt: new Date().toISOString() };
  programmeCache = { value, expiresAt: Date.now() + 10_800_000 };
  return value;
}

export async function fetchMovieDetail(movieKey: string): Promise<MovieDetail & { screenings: Screening[] }> {
  if (!/^[a-z0-9%_-]{1,160}$/i.test(movieKey)) throw new Error("Invalid movie key.");
  const url = `${MOVIE_ORIGIN}/movies/${movieKey}/`;
  const response = await fetch(url, {
    headers: { "User-Agent": "FofoClubWorkspace/1.0" },
    next: { revalidate: 43_200 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Movie source returned ${response.status}.`);
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("Movie response exceeded the safe size limit.");

  const director = classValue(html, "director");
  const castValue = classValue(html, "cast") ?? "";
  const year = Number(classValue(html, "releaseYear")) || null;
  const runtimeMinutes = Number(classValue(html, "duration")?.match(/\d+/)?.[0]) || null;
  const originalLanguage = classValue(html, "spokenLanguages");
  const synopsis = text(classBlock(html, "description")) || null;

  const screenings: Screening[] = [];
  for (const article of html.match(/<article\b[\s\S]*?<\/article>/g) ?? []) {
    const venueId = attr(article, "data-venue") ?? "";
    const venue = GRAZ_VENUES.get(venueId);
    if (!venue) continue;
    const date = attr(article, "data-weekday") ?? "";
    const time = text(article.match(/class="big">([\s\S]*?)<\/div>/)?.[1]);
    if (!date || !time) continue;
    const code = attr(article, "data-language") ?? "";
    const links = [...article.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const cinemaUrl = safeHttpsUrl(links.find((match) => text(match[2]) === "Website")?.[1] ?? null);
    const calendarUrl = safeHttpsUrl(links.find((match) => text(match[2]).includes("Termin"))?.[1] ?? null, MOVIE_ORIGIN);
    screenings.push({
      id: attr(article, "id") ?? `${movieKey}-${venueId}-${date}-${time}-${code}`,
      startsAt: `${date}T${time}:00`, date, time, venueId, venue,
      versionCode: code, versionLabel: versionLabel(code), cinemaUrl, calendarUrl,
    });
  }

  return {
    director,
    cast: castValue.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
    year,
    runtimeMinutes,
    originalLanguage,
    synopsis,
    screenings: screenings.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}
