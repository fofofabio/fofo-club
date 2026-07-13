type Star = { left: string; top: string; size: number; delay: string; color?: string };

const FIELD: Star[] = [
  { left: "8%", top: "22%", size: 26, delay: "0s" },
  { left: "18%", top: "70%", size: 16, delay: "1.2s", color: "var(--fofo-pink)" },
  { left: "62%", top: "14%", size: 20, delay: "0.6s" },
  { left: "88%", top: "48%", size: 30, delay: "1.8s" },
  { left: "74%", top: "80%", size: 16, delay: "0.9s", color: "var(--fofo-pink)" },
  { left: "45%", top: "88%", size: 18, delay: "2.1s" },
];

export default function Stars({ field = FIELD }: { field?: Star[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {field.map((s, i) => (
        <span
          key={i}
          className="nb-star nb-star-twinkle absolute"
          style={{
            left: s.left,
            top: s.top,
            fontSize: s.size,
            animationDelay: s.delay,
            color: s.color,
          }}
        >
          ✳
        </span>
      ))}
    </div>
  );
}
