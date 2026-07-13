import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "blue" | "pink" | "black";

type Play = {
  label: string;
  desc: string;
  href: string;
  tone: Tone;
  cover: ReactNode;
};

const coverTone: Record<Tone, string> = {
  blue: "bg-fofo-blue text-white",
  pink: "bg-fofo-pink text-white",
  black: "bg-black text-white",
};

const chipTone: Record<Tone, string> = {
  blue: "nb-chip",
  pink: "nb-chip nb-chip-pink",
  black: "nb-chip nb-chip-black",
};

/* Small on-brand cover visuals — no screenshots, so each tool gets a
   typographic/graphic tile that fills the card instead of dead space. */
function WordleCover() {
  const tiles = ["F", "O", "F", "O", ""];
  const fill = [
    "bg-white text-black border-black",
    "bg-black text-white border-white",
    "bg-white text-black border-black",
    "bg-black text-white border-white",
    "border-white/60",
  ];
  return (
    <div className="flex gap-1.5">
      {tiles.map((t, i) => (
        <span
          key={i}
          className={`flex h-9 w-9 items-center justify-center border-2 font-display text-lg font-bold ${fill[i]}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function DotsCover() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-white"
          style={{ opacity: 0.3 + (i % 4) * 0.23 }}
        />
      ))}
    </div>
  );
}

const PLAY: Play[] = [
  {
    label: "Wordle",
    desc: "daily 5-letter puzzle.",
    href: "/tools/wordle",
    tone: "pink",
    cover: <WordleCover />,
  },
  {
    label: "2048",
    desc: "merge tiles to reach 2048.",
    href: "/tools/2048",
    tone: "blue",
    cover: (
      <span className="font-display text-6xl font-bold tracking-tight">2048</span>
    ),
  },
  {
    label: "Ant Kingdom",
    desc: "grow a pixel ant colony.",
    href: "/tools/ant-kingdom",
    tone: "black",
    cover: (
      <span className="text-6xl" role="img" aria-label="ant">
        🐜
      </span>
    ),
  },
  {
    label: "Halftone",
    desc: "dots, grids, print vibes.",
    href: "/tools/halftone",
    tone: "blue",
    cover: <DotsCover />,
  },
];

export default function SelectedWork() {
  return (
    <section
      id="play"
      className="mx-auto grid w-full max-w-7xl scroll-mt-24 grid-cols-12 gap-x-6 gap-y-10 px-6 py-28 md:py-36"
    >
      {/* header hugs the left five columns and stays put */}
      <div className="col-span-12 md:col-span-4 md:self-start md:pt-4">
        <div className="flex items-center gap-3">
          <span className="nb-eyebrow">01 · Play something</span>
          <span aria-hidden className="fc-src">// section: play</span>
        </div>
        <h2 className="mt-5 font-display text-4xl font-bold leading-[0.9] tracking-tight md:text-5xl">
          real,
          <br />
          half-finished
          <br />
          toys.
        </h2>
        <p className="mt-5 max-w-xs text-sm text-black/70">
          pick one and poke at it. nothing here is precious.
        </p>
      </div>

      {/* cards start at column 6 and bleed a touch past the grid on the right */}
      <div className="col-span-12 grid gap-6 sm:grid-cols-2 md:col-span-7 md:col-start-6 md:-mr-8 lg:-mr-16">
        {PLAY.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="nb-card fc-dogear group flex flex-col overflow-hidden bg-white"
          >
            <div
              className={`flex h-36 items-center justify-center ${coverTone[p.tone]}`}
            >
              {p.cover}
            </div>
            <div className="flex items-start justify-between gap-2 border-t-[2.5px] border-black p-4">
              <div>
                <span className={chipTone[p.tone]}>{p.label}</span>
                <p className="mt-2 text-sm text-black/75">{p.desc}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
