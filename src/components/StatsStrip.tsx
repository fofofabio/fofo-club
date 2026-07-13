const STATS: { value: string; label: string; tone?: "blue" | "pink" }[] = [
  { value: "2024", label: "club founded" },
  { value: "∞", label: "half-finished ideas", tone: "pink" },
  { value: "1", label: "ordinary fellow" },
  { value: "48", label: "workspace / graz", tone: "blue" },
];

export default function StatsStrip() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="grid grid-cols-2 border-[2.5px] border-black bg-white shadow-brutal md:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`flex flex-col gap-1 p-6 ${
              i !== 0 ? "border-black md:border-l-[2.5px]" : ""
            } ${i % 2 === 1 ? "border-l-[2.5px]" : ""} ${
              i >= 2 ? "border-t-[2.5px] md:border-t-0" : ""
            } ${
              s.tone === "blue"
                ? "bg-fofo-blue text-white"
                : s.tone === "pink"
                  ? "bg-fofo-pink text-white"
                  : ""
            }`}
          >
            <span className="font-display text-4xl font-bold leading-none md:text-5xl">
              {s.value}
            </span>
            <span
              className={`font-pixel text-[10px] uppercase tracking-widest ${
                s.tone ? "text-white/80" : "text-black/60"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
