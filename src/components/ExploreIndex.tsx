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
    <section className="mx-auto w-full max-w-6xl px-6 py-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <span className="nb-eyebrow">03 — The Index</span>
        <p className="hidden max-w-xs text-right text-sm text-black/60 sm:block">
          four doors into the club. dip in, take what makes sense, ignore the rest.
        </p>
      </div>

      <div className="border-[2.5px] border-black bg-white shadow-brutal">
        {SECTIONS.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className={`group flex items-center gap-4 px-5 py-6 transition-colors sm:gap-8 sm:px-8 ${
              i !== 0 ? "border-t-[2.5px] border-black" : ""
            } ${
              s.tone === "blue"
                ? "hover:bg-fofo-blue hover:text-white"
                : s.tone === "pink"
                  ? "hover:bg-fofo-pink hover:text-white"
                  : "hover:bg-black hover:text-white"
            }`}
          >
            <span className="font-pixel text-sm tracking-widest opacity-50">{s.num}</span>
            <span className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
              {s.label}
            </span>
            <span className="ml-auto hidden font-pixel text-[11px] uppercase tracking-widest opacity-60 md:block">
              {s.desc}
            </span>
            <ArrowUpRight className="h-6 w-6 flex-shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Link>
        ))}
      </div>
    </section>
  );
}
