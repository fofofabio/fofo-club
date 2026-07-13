"use client";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import PageHeader from "@/components/PageHeader";
import WeatherCard from "@/components/WeatherCard";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tool = {
  label: string;
  desc: string;
  href: string;
  tone?: "blue" | "pink" | "black";
};

const TOOLS: Tool[] = [
  { label: "Halftone", desc: "Dots, grids, print vibes.", href: "/tools/halftone", tone: "blue" },
  { label: "Image to ASCII", desc: "Turn images into text art.", href: "/tools/ascii" },
  { label: "Wordle", desc: "Daily 5-letter puzzle.", href: "/tools/wordle", tone: "pink" },
  { label: "2048", desc: "Merge tiles to reach 2048.", href: "/tools/2048" },
  { label: "Ant Kingdom", desc: "Grow a pixel ant colony.", href: "/tools/ant-kingdom", tone: "black" },
];

const chipTone: Record<NonNullable<Tool["tone"]>, string> = {
  blue: "nb-chip",
  pink: "nb-chip nb-chip-pink",
  black: "nb-chip nb-chip-black",
};

export default function ToolsPage() {
  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <PageHeader
          eyebrow="Tools"
          title="Playground"
          description="Small utilities & games, built to poke at ideas."
        />

        <main className="relative isolate flex-1">
          <div className="absolute inset-0 nb-dots pointer-events-none opacity-60" />
          <div className="relative mx-auto max-w-6xl px-6 py-16">
            <SectionFade once threshold={0.12} baseClass="fc-stamp" inClass="fc-stamp-in">
              <div className="mb-10">
                <WeatherCard defaultCity="Graz" />
              </div>

              <div className="mb-6">
                <span className="nb-eyebrow">01 · The bench</span>
              </div>

              <motion.div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="nb-card fc-dogear group flex min-h-[180px] flex-col justify-between overflow-hidden bg-white p-5"
                  >
                    <div className="flex items-start justify-between">
                      <span className={chipTone[tool.tone ?? "blue"]}>{tool.label}</span>
                      <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="mt-6 text-sm text-black/70">{tool.desc}</p>
                  </Link>
                ))}
              </motion.div>
            </SectionFade>
          </div>
        </main>

        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </div>
    </PageTransition>
  );
}
