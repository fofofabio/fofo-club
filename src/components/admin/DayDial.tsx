"use client";

import { projectColor } from "@/lib/projectColor";

type Entry = {
  id: string;
  project: string;
  start: string; // "HH:MM"
  end: string;
};

type Props = {
  entries: Entry[];
  /** Center label, e.g. formatted day total. */
  centerLabel?: string;
  /** Visible window start/end in minutes (defaults to the workday 06–19). */
  windowStart?: number;
  windowEnd?: number;
  size?: number;
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

/**
 * A radial "pizza" of the day: each logged block is a colored wedge on a clock
 * face spanning the workday window. Summary only — the horizontal timeline
 * stays the editor.
 */
export default function DayDial({
  entries,
  centerLabel,
  windowStart = 6 * 60,
  windowEnd = 19 * 60,
  size = 150,
}: Props) {
  const span = windowEnd - windowStart;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 4;
  const r = R * 0.52; // donut hole for the center label

  const angleFor = (minute: number) =>
    -Math.PI / 2 + ((minute - windowStart) / span) * Math.PI * 2;

  const wedges = entries
    .map((entry) => {
      const start = Math.max(windowStart, toMinutes(entry.start));
      const end = Math.min(windowEnd, toMinutes(entry.end));
      if (end <= start) return null;
      return { entry, start, end };
    })
    .filter((w): w is { entry: Entry; start: number; end: number } => w !== null);

  function wedgePath(startMin: number, endMin: number) {
    const a0 = angleFor(startMin);
    const a1 = angleFor(endMin);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [o0x, o0y] = polar(cx, cy, R, a0);
    const [o1x, o1y] = polar(cx, cy, R, a1);
    const [i1x, i1y] = polar(cx, cy, r, a1);
    const [i0x, i0y] = polar(cx, cy, r, a0);
    return `M ${o0x} ${o0y} A ${R} ${R} 0 ${large} 1 ${o1x} ${o1y} L ${i1x} ${i1y} A ${r} ${r} 0 ${large} 0 ${i0x} ${i0y} Z`;
  }

  // Hour ticks at every 3rd hour for orientation.
  const ticks: number[] = [];
  for (let h = windowStart; h <= windowEnd; h += 180) ticks.push(h);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
      {/* base ring (unlogged time) */}
      <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="#00000010" strokeWidth={R - r} />

      {wedges.map(({ entry, start, end }) => (
        <path
          key={entry.id}
          d={wedgePath(start, end)}
          fill={projectColor(entry.project).ink}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}

      {/* hour ticks */}
      {ticks.map((m) => {
        const a = angleFor(m);
        const [x1, y1] = polar(cx, cy, R, a);
        const [x2, y2] = polar(cx, cy, R - 4, a);
        return <line key={m} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00000033" strokeWidth={1.5} />;
      })}

      {/* center label */}
      {centerLabel ? (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono"
          style={{ fontSize: size * 0.15, fontWeight: 700, fill: "#000" }}
        >
          {centerLabel}
        </text>
      ) : null}
    </svg>
  );
}
