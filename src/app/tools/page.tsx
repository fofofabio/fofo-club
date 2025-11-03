"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import WeatherCard from "@/components/WeatherCard";
import Footer from "@/components/Footer";

export default function ToolsPage() {
  const [showWeather, setShowWeather] = useState(false);
  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto max-w-5xl px-6 py-16 lg:py-24 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-10">
              <p className="meta text-fofo-blue">TOOLS</p>
              <h1 className="mt-2 font-semibold leading-tight tracking-tight text-4xl md:text-5xl">
                Tools for your everyday
              </h1>
              <p className="mt-3 max-w-2xl text-black/60">
                Small utilities. Clean and fast.
              </p>
            </header>

            {/* Tool grid */}
            <motion.div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Weather tile */}
              <motion.div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
                <div className="flex items-center gap-2">
                  <span className="meta text-fofo-blue">WEATHER</span>
                </div>
                <p className="mt-2 text-sm text-black/60">Clean 5-day forecast.</p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowWeather((v) => !v)}
                    className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow min-w-[88px] justify-center"
                  >
                    <span className="meta text-fofo-blue">WEATHER</span>
                    <span className="text-black/70">{showWeather ? "Hide" : "Open card"}</span>
                  </button>
                </div>
              </motion.div>

              {/* Placeholder tiles */}
              <motion.div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm opacity-90 transition hover:-translate-y-0.5 hover:shadow">
                <div className="flex items-center gap-2">
                  <span className="meta text-fofo-blue">STOPWATCH</span>
                </div>
                <p className="mt-2 text-sm text-black/60">Minimal lap timer.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/50">
                  coming soon
                </div>
              </motion.div>

              <motion.div className="rounded-2xl border border-black/10 bg-white/70 p-5 shadow-sm opacity-90 transition hover:-translate-y-0.5 hover:shadow">
                <div className="flex items-center gap-2">
                  <span className="meta text-fofo-blue">UNIT CONVERTER</span>
                </div>
                <p className="mt-2 text-sm text-black/60">Quick length/weight/temperature.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/50">
                  coming soon
                </div>
              </motion.div>
            </motion.div>

            {/* Expanded area below grid that reflows layout (instant show to avoid layout-animation squeeze) */}
            {showWeather && (
              <div className="mt-8" style={{ overflow: 'visible' }}>
                <div className="transition-opacity duration-250 ease-[cubic-bezier(.2,.8,.2,1)] opacity-100">
                  <WeatherCard defaultCity="Graz" />
                </div>
              </div>
            )}
          </SectionFade>
        </main>

        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </div>
    </PageTransition>
  );
}
