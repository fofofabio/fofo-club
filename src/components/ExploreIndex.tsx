import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const SECTIONS: {
  num: string;
  label: string;
  href: string;
  desc: string;
  tone?: "blue" | "pink";
}[] = [
  { num: "01", label: "Tools", href: "/tools", desc: "code, tools, prototypes", tone: "blue" },
  { num: "02", label: "Blog", href: "/blog", desc: "thoughts, projects, updates" },
  { num: "03", label: "Videos", href: "/videos", desc: "rides, trips, random days", tone: "pink" },
  { num: "04", label: "About", href: "/about", desc: "who i am, what this is" },
];

export default function ExploreIndex() {
  return (
    /* Full-bleed black band — the "drop". Breaks out of the contained paper
       rhythm above and below it, with oversized type. */
    <section className="relative w-[100vw] ml-[calc(50%-50vw)] border-y-[2.5px] border-black bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="mb-10 flex items-end justify-between gap-4">
          <span className="nb-eyebrow">03 · The Index</span>
          <p className="hidden max-w-xs text-right text-sm text-white/60 sm:block">
            four doors into the club. dip in, take what makes sense, ignore the rest.
          </p>
        </div>

        <div className="border-t-[2.5px] border-white/25">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`group flex items-center gap-4 border-b-[2.5px] border-white/25 py-7 transition-colors sm:gap-8 ${
                s.tone === "blue"
                  ? "hover:text-fofo-blue"
                  : s.tone === "pink"
                    ? "hover:text-fofo-pink"
                    : "hover:text-white/60"
              }`}
            >
              <span className="font-pixel text-sm tracking-widest text-white/40">{s.num}</span>
              <span className="font-display text-4xl font-bold leading-none tracking-tight sm:text-7xl">
                {s.label}
              </span>
              <span className="ml-auto hidden font-sans text-sm lowercase tracking-normal text-white/50 md:block">
                {s.desc}
              </span>
              <ArrowUpRight className="h-6 w-6 flex-shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 sm:h-8 sm:w-8" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
