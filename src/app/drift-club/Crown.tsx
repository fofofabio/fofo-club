/* The signature detail: a crown scrawled over the leader's name, the way it got
   drawn on the whiteboard this page replaces. Flat marker ink, one colour, no
   glow - the richness on this page belongs to the screenshots, not the chrome. */

export default function Crown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Crown drawn over the leader"
    >
      {/* Drawn in one stroke, closed badly, the way a marker does it. */}
      <path pathLength="1"
        d="M20 112 C15 88 13 64 16 42 c1-5 5-6 9-2 l27 30 c3 3 7 3 9-1 L95 26
           c4-6 11-6 15 0 l33 42 c3 4 7 4 10 1 l28-31 c4-4 8-3 9 2 3 22 1 46-4 70"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The base line, overshot on the right like a hand that kept going. */}
      <path pathLength="1"
        d="M21 113 h164"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Three gems, ticked in after the outline. */}
      <path pathLength="1" d="M58 76 l4 5" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path pathLength="1" d="M102 60 l3 4" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path pathLength="1" d="M150 77 l4 5" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
