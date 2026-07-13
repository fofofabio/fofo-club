const DEFAULT_ITEMS = [
  "finished & proud",
  "graz",
  "at fofo club",
  "for ordinary fellows",
  "occasionally exceptional",
];

export default function Marquee({
  items = DEFAULT_ITEMS,
}: {
  items?: string[];
}) {
  // duplicate the sequence so the -50% translate loops seamlessly
  const seq = [...items, ...items];
  return (
    <div className="nb-marquee py-2.5">
      <div className="nb-marquee__track font-pixel text-[12px] uppercase tracking-widest">
        {seq.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="px-4">{item}</span>
            <span aria-hidden className="text-white/70">
              ✳
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
