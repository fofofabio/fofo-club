export type Video = {
  youtubeId: string;
  title: string;
  description: string;
  song?: string;
  date: string; // YYYY-MM-DD
  duration?: string; // e.g. "0:54"
};

export const videos: Video[] = [
  {
    youtubeId: "si-cVgzR-70",
    title: "A Sunny Day in Paradise",
    description: "Teichalm See exkursion by bike.",
    song: "Golliboi – Rotes Meer",
    date: "2026-06-03",
    duration: "0:54",
  },
];
