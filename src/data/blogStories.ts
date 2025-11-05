export type BlogStory = {
  slug: string;
  title: string;
  kicker?: string;
  summary: string;
  heroImage: string;
  heroImageAlt: string;
  heroImageCredit?: string;
  publishedAt: string;
  highlight?: boolean;
  body: string[];
};

export const blogStories: BlogStory[] = [
  {
    slug: "vienna-city-half-2025",
    title: "Vienna City Half Marathon 2025",
    kicker: "race log",
    summary:
      "Chasing springtime speed from UNO-City across the Reichsbruecke, along the Donaukanal and Ringstrasse to Rathausplatz, locking into 3:57/km pace and celebrating a 1:23:55 personal best on home streets.",
    heroImage: "/viennavcmhalf2025.jpg",
    heroImageAlt: "Runner celebrating after the Vienna City Half Marathon 2025 finish line.",
    publishedAt: "2025-04-13",
    highlight: true,
    body: [
      "Race morning started with the soft chill that only April in Vienna delivers: clear skies, 1 deg C that felt like -6 deg C thanks to a 23 km/h wind from the north-west. I warmed up in the chute on Wagramer Strasse between Schuettaustrasse and Erzherzog-Karl-Strasse beside UNO-City, wrapped in throwaway layers while the sun crept over the Donau. The plan stayed simple: stay relaxed across the city and trust the limited training.",
      "The first kilometres flew by as we surged over the Reichsbruecke, slipped into the Prater via Praterstern, and traced the left bank of the Donaukanal. Splits landed right around four minutes per kilometre as the course settled onto the Ringstrasse past familiar landmarks. The city sounded like a live soundtrack, tram bells, cowbells, and brass bands bouncing off the museums.",
      "Schoenbrunn delivered its familiar sting once the route swung out along the Ring and back toward the palace. The gentle rise past the gardens slowed things slightly, but the legs stayed lively. I tucked behind two other runners, sharing the headwind, and seeing 39:34 at 10 km told me the rhythm was locked in.",
      "From 11 km onward it turned into a controlled squeeze, steady effort, heart rate in the high 170s. I hit 15 km in 59:08 and committed to the negative split.",
      "The final stretch carried a touch more drive: consistent rhythm, a strong push toward Rathausplatz, and a last-minute sprint past the Burgtheater. I stopped the clock at 1:23:55 for 21.28 km, 79 m of gain, and 176 bpm average, a new half-marathon personal best.",
      "I hung over the barricade for a while on the Rathausplatz cobbles, shoes dusted in blue confetti, soaking in the morning. Vienna City Half remains my favourite test: fast, honest, and close to home. Legs hurt, heart full, onto the next build.",
    ],
  },
  {
    slug: "alpine-gravel-overnighter",
    title: "Placeholder Title",
    kicker: "ride notes",
    summary:
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    heroImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Gravel bike resting beside an alpine hut at dawn.",
    publishedAt: "2024-09-07",
    body: [
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    ],
  },
  {
    slug: "night-ride-to-grado",
    title: "Placeholder Title",
    kicker: "ride notes",
    summary:
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    heroImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Cyclists riding along a coastal road just before sunrise.",
    publishedAt: "2024-06-21",
    body: [
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    ],
  },
  {
    slug: "makers-corner-workbench",
    title: "Placeholder Title",
    kicker: "projects",
    summary:
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    heroImage: "https://images.unsplash.com/photo-1512427691650-1e0c24c75f17?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Workshop workbench with tools neatly organized on pegboards.",
    publishedAt: "2024-11-02",
    body: [
      "Lorem Ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    ],
  },
];

export const featuredStory: BlogStory | null =
  blogStories.find((story) => story.highlight) ?? blogStories[0] ?? null;
