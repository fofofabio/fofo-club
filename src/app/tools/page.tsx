"use client";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import WeatherCard from "@/components/WeatherCard";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ToolsPage() {
  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto max-w-5xl px-6 py-16 lg:py-24 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-10">
              <p className="meta text-fofo-blue">TOOLS</p>
              <h1 className="mt-2 font-semibold leading-tight tracking-tight text-4xl md:text-5xl">
                Playground
              </h1>
              <p className="mt-3 max-w-2xl text-black/60">
                Small utilities & games.
              </p>
            </header>
            {/* Always-on weather */}
            <div className="mt-6">
              <WeatherCard defaultCity="Graz" />
            </div>

            {/* Tool grid */}
            <motion.div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Next up: Wordle */}
              <motion.div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm opacity-90 transition hover:-translate-y-0.5 hover:shadow">
                <div className="flex items-center gap-2">
                  <span className="meta text-fofo-blue">WORDLE</span>
                </div>
                <p className="mt-2 text-sm text-black/60">Daily 5-letter puzzle.</p>
                <Link href="/tools/wordle" className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/70 min-w-[88px] justify-center hover:-translate-y-0.5 hover:shadow transition">
                  Open
                </Link>
              </motion.div>

              {/* Next up: 2048 */}
              <motion.div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm opacity-90 transition hover:-translate-y-0.5 hover:shadow">
                <div className="flex items-center gap-2">
                  <span className="meta text-fofo-blue">2048</span>
                </div>
                <p className="mt-2 text-sm text-black/60">Merge tiles to reach 2048.</p>
                <Link href="/tools/2048" className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/70 min-w-[88px] justify-center hover:-translate-y-0.5 hover:shadow transition">
                  Open
                </Link>
              </motion.div>
            </motion.div>
          </SectionFade>
        </main>

        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </div>
    </PageTransition>
  );
}
