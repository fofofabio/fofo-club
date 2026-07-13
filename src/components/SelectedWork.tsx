import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tone = "blue" | "pink" | "black";

type Work = {
  chip: string;
  tone: Tone;
  title: string;
  blurb: string;
  href: string;
  /** dark inverted card (like the "live feel love m*ve" tile) */
  dark?: boolean;
};

const chipClass: Record<Tone, string> = {
  blue: "nb-chip",
  pink: "nb-chip nb-chip-pink",
  black: "nb-chip nb-chip-black",
};

const WORKS: Work[] = [
  {
    chip: "Type",
    tone: "black",
    title: "live / feel / love / m✳ve",
    blurb: "a moving type study — words that shift weight, slant, and color.",
    href: "/about",
    dark: true,
  },
  {
    chip: "Tool",
    tone: "blue",
    title: "pace.m",
    blurb:
      "a training log that turns raw running sessions into readable pace maps.",
    href: "/tools",
  },
  {
    chip: "System",
    tone: "blue",
    title: "eat. sleep. templates.",
    blurb:
      "experiments in esl template systems — reusable, logic-driven layouts that update themselves.",
    href: "/tools",
  },
  {
    chip: "Brand",
    tone: "pink",
    title: "the fofo world",
    blurb:
      "the rotating visual language that ties the whole club together — loud, playful, honest.",
    href: "/about",
  },
];

export default function SelectedWork() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <div className="mb-8">
        <span className="nb-eyebrow">02 — Selected Work</span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {WORKS.map((w) => (
          <Link
            key={w.title}
            href={w.href}
            className={`nb-card nb-card-press group flex min-h-[220px] flex-col justify-between p-6 ${
              w.dark ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={chipClass[w.tone]}>{w.chip}</span>
              <ArrowUpRight
                className={`h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                  w.dark ? "text-white" : "text-black"
                }`}
              />
            </div>

            <div className="mt-6">
              <h3
                className={`font-display text-3xl font-bold tracking-tight ${
                  w.dark ? "text-white" : "text-fofo-blue"
                }`}
              >
                {w.title}
              </h3>
              <p
                className={`mt-3 text-sm ${
                  w.dark ? "text-white/70" : "text-black/70"
                }`}
              >
                {w.blurb}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
