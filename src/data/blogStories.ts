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
    title: "Alpine Gravel Overnighter",
    kicker: "micro adventure",
    summary:
      "Two days through Salzburg's side valleys with a bivvy sack, too much instant coffee, and the best sunrise I've seen this year.",
    heroImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Gravel bike resting beside an alpine hut at dawn.",
    publishedAt: "2024-09-07",
    body: [
      "I'd been staring at weather apps all week waiting for a clear window. When Saturday finally promised high pressure, I threw a bivvy sack, stove, and minimal kit onto the Topstone and started rolling out of Salzburg before sunrise.",
      "The first climb up to Gaisberg was all mist and silence. Once I dropped into the Hintersee valley the sun finally punched through, turning every wet pine needle into a fibre optic cable.",
      "I camped just above the tree line, cowboy-style, and was rewarded with a sunrise so orange it felt fake. The descent back toward the city the next morning was all brakes and giggles.",
    ],
  },
  {
    slug: "night-ride-to-grado",
    title: "Night Ride to Grado",
    kicker: "ride notes",
    summary:
      "A 180 km moonlit roll from Villach to the Adriatic, chasing tailwinds, espresso, and the first swim of summer.",
    heroImage: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Cyclists riding along a coastal road just before sunrise.",
    publishedAt: "2024-06-21",
    body: [
      "The plan was reckless: roll out of Villach after dinner, ride the Alpe-Adria trail through the night, and reach Grado in time for a sunrise swim.",
      "Moonlight turned the Gailtal valley into grayscale. My only company between gelato stops was the hum of the chain and the occasional fox darting across the trail.",
      "Grado greeted me with quiet streets and warm water. I plunged straight in with helmet hair and sticky eyes, then inhaled two espressos and a brioche before the tourists woke up.",
    ],
  },
  {
    slug: "makers-corner-workbench",
    title: "Building the Maker's Workbench",
    kicker: "projects",
    summary:
      "Designing a modular workbench for the studio: steel frame, CNC-cut birch, hidden casters, and enough power outlets to make the electrician wince.",
    heroImage: "https://images.unsplash.com/photo-1512427691650-1e0c24c75f17?auto=format&fit=crop&w=1600&q=80",
    heroImageAlt: "Workshop workbench with tools neatly organized on pegboards.",
    publishedAt: "2024-11-02",
    body: [
      "The studio was begging for a proper work surface, so I sketched out a bench that could host soldering, bike wrenching, and the occasional plywood project.",
      "I welded a simple square frame, added locking casters, and topped it with CNC-cut birch plywood sealed in matte varnish.",
      "Power and storage were the final touches: flush-mounted outlets, under-shelf LED strips, and pegboards for days. It's now the nerve centre of the workshop.",
    ],
  },
];

export const featuredStory: BlogStory | null =
  blogStories.find((story) => story.highlight) ?? blogStories[0] ?? null;
