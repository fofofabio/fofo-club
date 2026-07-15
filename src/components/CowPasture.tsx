"use client";

import clsx from "clsx";

type Props = {
  className?: string;
};

/**
 * A framed little pasture: a thick black band, a blue band, then the
 * Windows XP hill as a backdrop with a herd of cows standing on the grass.
 * Sibling to <DailyCow /> — same brutalist frame, different flavour of cow.
 */

type Cow = {
  src: string;
  alt: string;
  /** left position, % of the scene */
  left: number;
  /** distance from the bottom, % of the scene */
  bottom: number;
  /** width, % of the scene */
  width: number;
  /** flip horizontally so the herd doesn't all face one way */
  flip?: boolean;
  /** optional small speech bubble floating above the cow */
  say?: string;
  /** extra px to raise (+) or lower (−) the speech bubble */
  sayLift?: number;
  /** hide the bubble on phones, where two bubbles would collide */
  sayHideMobile?: boolean;
  /** shorter line to show on phones, where the full quote wraps too tall */
  sayMobile?: string;
};

// cow1 + grazing appear more than once; laying + flying just the once.
// Scattered across the hill at different depths — cows further up sit higher
// and are drawn smaller, so the herd reads with a bit of perspective instead
// of a straight line along the bottom edge.
const HERD: Cow[] = [
  { src: "/cow_grazing.png", alt: "a grazing cow", left: 4, bottom: 2, width: 14 },
  { src: "/cow1.png", alt: "a cow", left: 26, bottom: 22, width: 9, flip: true },
  { src: "/cow_laying.png", alt: "a resting cow", left: 37, bottom: 6, width: 12, say: "Moo", sayLift: -10, sayHideMobile: true },
  {
    src: "/cow_grazing.png",
    alt: "a grazing cow",
    left: 55,
    bottom: 1,
    width: 13,
    flip: true,
    say: "Humanity has failed because we mastered the planet but lost ourselves.",
    sayMobile: "We mastered the planet but lost ourselves.",
    sayLift: 14,
  },
  { src: "/cow1.png", alt: "a cow", left: 71, bottom: 14, width: 10 },
  { src: "/cow1.png", alt: "a cow", left: 84, bottom: 11, width: 11, flip: true },
  { src: "/cow_flying.png", alt: "a flying cow", left: 40, bottom: 66, width: 11 },
];

export default function CowPasture({ className }: Props) {
  return (
    <div
      className={clsx(
        // black outer band
        "rounded-[28px] border-[2.5px] border-black bg-black p-2.5 shadow-brutal",
        className,
      )}
    >
      {/* blue band */}
      <div className="rounded-[20px] bg-fofo-blue p-2.5">
        {/* the scene: windows xp hill + the herd */}
        <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[12px] border-[2.5px] border-black sm:aspect-[16/7]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/windows-xp.png"
            alt="rolling green hills under a blue sky"
            className="absolute inset-0 h-full w-full select-none object-cover"
          />

          {/* quiet wiring label, same voice as the daily cow */}
          <span className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 drop-shadow">
            cow livestream
          </span>

          {HERD.map((cow, i) => (
            <div
              key={i}
              className="pointer-events-none absolute"
              style={{
                left: `${cow.left}%`,
                bottom: `${cow.bottom}%`,
                width: `${cow.width}%`,
              }}
            >
              {cow.say ? (
                <CloudBubble
                  text={cow.say}
                  textMobile={cow.sayMobile}
                  lift={cow.sayLift}
                  hideMobile={cow.sayHideMobile}
                />
              ) : null}
              {/* wiggle wrapper so the cow sways but the bubble stays put */}
              <span
                className="cow-wiggle block"
                style={{
                  animationDelay: `${(i % 5) * 0.5}s`,
                  animationDuration: `${2.4 + (i % 3) * 0.4}s`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cow.src}
                  alt={cow.alt}
                  className="block w-full select-none object-contain"
                  style={{ transform: cow.flip ? "scaleX(-1)" : undefined }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * A puffy thought-cloud that grows to fit its text. The cloud is an SVG that
 * stretches to the text box (non-scaling stroke keeps the outline even), with
 * two little trailing puffs pointing down toward the cow.
 */
function CloudBubble({
  text,
  lift = 0,
  hideMobile = false,
  textMobile,
}: {
  text: string;
  lift?: number;
  hideMobile?: boolean;
  textMobile?: string;
}) {
  return (
    <div
      className={clsx(
        "absolute bottom-full left-1/2 z-20 w-max max-w-[96px] -translate-x-1/2 sm:max-w-[155px]",
        hideMobile && "hidden sm:block",
      )}
      style={{ marginBottom: `calc(0.75rem + ${lift}px)` }}
    >
      <div className="relative px-4 pb-3 pt-7 sm:px-6 sm:pb-4">
        {/* A fat, full-bodied cloud that fills the padded box, so the text
            sits over solid white and stays centred (padding = the margin
            between the words and the cloud's edge). */}
        <svg
          viewBox="0 0 640 512"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d="M0 336c0 79.5 64.5 144 144 144l368 0c70.7 0 128-57.3 128-128c0-61.9-44-113.6-102.4-125.4c4.1-10.7 6.4-22.4 6.4-34.6c0-53-43-96-96-96c-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32c-88.4 0-160 71.6-160 160c0 2.7 .1 5.4 .2 8.1C40.2 219.8 0 273.2 0 336z"
            fill="white"
            stroke="black"
            strokeWidth="2.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="relative block text-center font-display text-[9px] font-bold leading-[1.35] text-black [text-wrap:balance] sm:text-[11px]">
          {textMobile ? (
            <>
              <span className="sm:hidden">{textMobile}</span>
              <span className="hidden sm:inline">{text}</span>
            </>
          ) : (
            text
          )}
        </span>
      </div>
      {/* trailing thought puffs, drifting down toward the cow */}
      <span
        aria-hidden
        className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 rounded-full border-2 border-black bg-white"
      />
      <span
        aria-hidden
        className="absolute left-[42%] top-full mt-3 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-black bg-white"
      />
    </div>
  );
}
