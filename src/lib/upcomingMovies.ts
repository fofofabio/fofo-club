import "server-only";

const SOURCE_ORIGIN = "https://www.uncut.at";
const MONTH_NAMES: Record<string, number> = {
  Jänner: 1, Januar: 1, Februar: 2, März: 3, April: 4, Mai: 5, Juni: 6,
  Juli: 7, August: 8, September: 9, Oktober: 10, November: 11, Dezember: 12,
};

export type UpcomingMovie = {
  key: string;
  title: string;
  releaseDate: string;
  imageUrl: string | null;
  detailsUrl: string;
};

export type UpcomingMovieDetail = {
  title: string;
  posterUrl: string | null;
  synopsis: string | null;
  director: string | null;
  cast: string[];
  genre: string | null;
  country: string | null;
  year: number | null;
  runtimeMinutes: number | null;
  trailerUrl: string | null;
  detailsUrl: string;
};

let upcomingCache: { value: { releases: UpcomingMovie[]; refreshedAt: string; sourceUrl: string }; expiresAt: number } | null = null;

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&ndash;/g, "–").replace(/&mdash;/g, "—").replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function cleanText(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseGermanDate(value: string) {
  const match = cleanText(value).match(/^(\d{1,2})\.\s+([A-Za-zÄÖÜäöü]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_NAMES[match[2]];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function monthPages(start: Date, count: number) {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    return `${SOURCE_ORIGIN}/movies/monat.php?country=AT&month=${date.getMonth() + 1}&year=${date.getFullYear()}`;
  });
}

function parseMonth(html: string, pageUrl: string) {
  const releases: UpcomingMovie[] = [];
  for (const group of html.matchAll(/<h3>([^<]+)<\/h3>([\s\S]*?)<\/ul>/gi)) {
    const releaseDate = parseGermanDate(group[1]);
    if (!releaseDate) continue;
    for (const item of group[2].matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const movieId = item[1].match(/film\.php\?movie_id=(\d+)/)?.[1];
      const title = cleanText(item[1].match(/class="grau14bold"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
      if (!movieId || !title) continue;
      const rawImage = item[1].match(/<img[^>]+src="([^"]+)"/i)?.[1] ?? null;
      releases.push({
        key: `upcoming_${movieId}`,
        title,
        releaseDate,
        imageUrl: rawImage ? new URL(rawImage, pageUrl).toString() : null,
        detailsUrl: `${SOURCE_ORIGIN}/movies/film.php?movie_id=${movieId}`,
      });
    }
  }
  return releases;
}

export async function fetchUpcomingAustrianMovies() {
  if (upcomingCache && upcomingCache.expiresAt > Date.now()) return upcomingCache.value;
  const now = new Date();
  const pages = monthPages(now, 6);
  const responses = await Promise.all(pages.map(async (url) => {
    const response = await fetch(url, {
      headers: { "User-Agent": "FofoClubWorkspace/1.0" },
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Release source returned ${response.status}.`);
    const html = await response.text();
    if (html.length > 700_000) throw new Error("Release response exceeded the safe size limit.");
    return parseMonth(html, url);
  }));
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const latest = new Date(now); latest.setDate(latest.getDate() + 180);
  const lastDate = `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, "0")}-${String(latest.getDate()).padStart(2, "0")}`;
  const unique = new Map<string, UpcomingMovie>();
  for (const movie of responses.flat()) if (movie.releaseDate >= today && movie.releaseDate <= lastDate) unique.set(movie.key, movie);
  const releases = [...unique.values()].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title));
  if (!releases.length) throw new Error("No upcoming Austrian releases could be recognized.");
  const value = { releases, refreshedAt: new Date().toISOString(), sourceUrl: `${SOURCE_ORIGIN}/movies/filmstarts.php` };
  upcomingCache = { value, expiresAt: Date.now() + 21_600_000 };
  return value;
}

export async function fetchUpcomingMovieDetail(movieId: string): Promise<UpcomingMovieDetail> {
  if (!/^\d{1,8}$/.test(movieId)) throw new Error("Invalid movie id.");
  const detailsUrl = `${SOURCE_ORIGIN}/movies/film.php?movie_id=${movieId}`;
  const response = await fetch(detailsUrl, {
    headers: { "User-Agent": "FofoClubWorkspace/1.0" },
    next: { revalidate: 43_200 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Movie source returned ${response.status}.`);
  const html = await response.text();
  if (html.length > 700_000) throw new Error("Movie response exceeded the safe size limit.");
  const ogTitle = cleanText(html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ?? "");
  const titleMatch = ogTitle.match(/^(.*?)\s*\((\d{4})\)\s*-\s*UNCUT$/);
  const posterUrl = html.match(/<meta property="og:image" content="(https:\/\/www\.uncut\.at\/[^"]+)"/i)?.[1] ?? null;
  const synopsis = cleanText(html.match(/class="movie-content-text"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "") || null;
  const director = cleanText(html.match(/itemprop="director"[\s\S]*?itemprop="name">([\s\S]*?)<\/span>/i)?.[1] ?? "") || null;
  const cast = [...html.matchAll(/itemprop="actor"[\s\S]*?itemprop="name">([\s\S]*?)<\/span>/gi)].map((match) => cleanText(match[1])).filter(Boolean).slice(0, 6);
  const genre = cleanText(html.match(/itemprop="genre">([\s\S]*?)<\/td>/i)?.[1] ?? "") || null;
  const country = cleanText(html.match(/>Land<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "") || null;
  const runtimeMinutes = Number(cleanText(html.match(/itemprop="duration">([\s\S]*?)<\/td>/i)?.[1] ?? "").match(/\d+/)?.[0]) || null;
  const rawTrailer = html.match(/class="trailerlink"><a href="([^"]+)"/i)?.[1] ?? null;
  return {
    title: titleMatch?.[1] || ogTitle.replace(/\s*-\s*UNCUT$/, "") || "Upcoming movie",
    posterUrl,
    synopsis,
    director,
    cast,
    genre,
    country,
    year: Number(titleMatch?.[2]) || null,
    runtimeMinutes,
    trailerUrl: rawTrailer ? new URL(rawTrailer, detailsUrl).toString() : null,
    detailsUrl,
  };
}
