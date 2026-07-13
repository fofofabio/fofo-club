import Stars from "./Stars";

const STAR_FIELD = [
  { left: "82%", top: "18%", size: 22, delay: "0s" },
  { left: "92%", top: "62%", size: 16, delay: "1.1s", color: "var(--fofo-pink)" },
  { left: "70%", top: "78%", size: 18, delay: "0.7s" },
];

export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate border-b-[2.5px] border-black bg-fofo-paper">
      <Stars field={STAR_FIELD} />
      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="flex items-center gap-3">
          <span className="nb-eyebrow">{eyebrow}</span>
          <span aria-hidden className="fc-src">
            // {title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
          </span>
        </div>
        <h1 className="mt-5 font-display text-5xl font-bold leading-[0.9] tracking-tight md:text-7xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-lg text-black/70">{description}</p>
        )}
        {children}
      </div>
    </section>
  );
}
