import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Lacquer } from "next/font/google";

import { auth } from "@/auth";
import { listDriftRuns } from "@/lib/driftRuns";

import DriftBoard from "./DriftBoard";

// Loaded here rather than in app/fonts.ts: these are the only page wearing
// them, and the rest of the site has no business inheriting a racing-menu
// italic. Barlow carries the menu chrome, its condensed cut the big figures.
const barlow = Barlow({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["500", "600"],
  style: ["italic"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

/* The wordmark only: a sprayed face whose edges are already ragged with
   overspray, so the texture comes from the type rather than from anything
   drawn on top of it. */
const marker = Lacquer({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Drift club",
  description: "Office drift league.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function StadiumDriftPage() {
  const [runs, session] = await Promise.all([listDriftRuns(), auth()]);

  return (
    <div className={`${barlow.variable} ${barlowCondensed.variable} ${marker.variable}`}>
      <DriftBoard initialRuns={runs} canModerate={Boolean(session?.user?.id)} />
    </div>
  );
}
