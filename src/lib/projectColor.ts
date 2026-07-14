// Project identity — a stable color + glyph per project name, threaded through
// the whole workspace (timeline blocks, task tags, breakdown bars). Blue stays
// reserved for "live / interactive" per Paper & Wire, so this palette leans on
// warm inks that read clearly on the #F2EFE6 paper without stealing the signal.

export type ProjectInk = {
  /** solid ink for fills / dots */
  ink: string;
  /** faint wash for backgrounds behind ink text */
  wash: string;
  /** readable text color on the paper background */
  text: string;
};

// Curated, deliberately un-blue palette. Distinct hues, similar weight, all
// legible as both a solid slab and a text color.
const PALETTE: ProjectInk[] = [
  { ink: "#E8590C", wash: "#FBE7D8", text: "#B24405" }, // ember
  { ink: "#2B8A3E", wash: "#DBEFDF", text: "#256F33" }, // moss
  { ink: "#9C36B5", wash: "#F1DEF5", text: "#7E2C91" }, // orchid
  { ink: "#0C8599", wash: "#D5EEF2", text: "#0A6A7A" }, // teal
  { ink: "#C2255C", wash: "#F7DBE6", text: "#9E1E4B" }, // raspberry
  { ink: "#5F3DC4", wash: "#E4DCF6", text: "#4C31A0" }, // violet
  { ink: "#B08900", wash: "#F5EBC5", text: "#8A6C00" }, // brass
  { ink: "#1864AB", wash: "#D6E4F2", text: "#14508A" }, // slate-blue
  { ink: "#087F5B", wash: "#D3EDE4", text: "#06664A" }, // pine
  { ink: "#D6336C", wash: "#F8DDE7", text: "#AE2857" }, // rose
];

const NEUTRAL: ProjectInk = { ink: "#495057", wash: "#E7E9EB", text: "#495057" };

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function projectColor(project: string | null | undefined): ProjectInk {
  const name = (project ?? "").trim();
  if (!name) return NEUTRAL;
  return PALETTE[hash(name.toLowerCase()) % PALETTE.length];
}

export function projectInitials(project: string | null | undefined): string {
  const name = (project ?? "").trim();
  if (!name) return "—";
  const words = name.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
