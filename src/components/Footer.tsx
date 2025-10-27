"use client";

import { useEffect, useRef } from "react";
import { Mail, Github, Linkedin, Instagram } from "lucide-react";

export default function FofoFooter() {
  const lineRef = useRef<HTMLDivElement>(null);

  // animate the blue line once
  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    el.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden">
      {/* wired background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* track-line */}
      <div
        ref={lineRef}
        className="origin-left h-[2px] bg-fofo-blue mx-auto w-full max-w-5xl mt-20"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-8 flex flex-col items-center gap-3 text-fofo-black">
        {/* top meta rail */}
        <div className="meta text-xs text-fofo-black/60 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>graz</span>
          <span>
            local time{" "}
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>version 0.3.1</span>
          <span>updated oct 2025</span>
        </div>

        {/* main line */}
        <div className="flex flex-wrap justify-center items-center gap-x-3 text-sm mt-1">
          <span className="font-pixel tracking-widest text-fofo-black/70">
            built &amp; run by fabio unterholzer
          </span>
          <span className="text-fofo-black/50">·</span>
          <nav className="flex gap-x-3 font-pixel text-fofo-black/70">
            <a href="/tools" className="hover:text-fofo-blue transition-colors">
              tools
            </a>
            <a href="/projects" className="hover:text-fofo-blue transition-colors">
              projects
            </a>
            <a href="/fun" className="hover:text-fofo-blue transition-colors">
              fun
            </a>
            <a href="/gear" className="hover:text-fofo-blue transition-colors">
              gear
            </a>
            <a href="/about" className="hover:text-fofo-blue transition-colors">
              about
            </a>
          </nav>
          <span className="text-fofo-black/50">·</span>
          <span className="font-pixel text-fofo-black/70">© {year} fofo club</span>
        </div>

        {/* icon rail */}
        <div className="mt-3 flex gap-5">
          <a
            href="https://instagram.com/sirfabioo"
            target="_blank"
            className="transition hover:scale-110"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 text-fofo-blue opacity-70 hover:opacity-100" />
          </a>
          <a
            href="https://linkedin.com/in/fabio-unterholzer"
            target="_blank"
            className="transition hover:scale-110"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5 text-fofo-blue opacity-70 hover:opacity-100" />
          </a>
          <a
            href="https://github.com/fofofabio"
            target="_blank"
            className="transition hover:scale-110"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5 text-fofo-blue opacity-70 hover:opacity-100" />
          </a>
          <a
            href="mailto:hi@fofoclub.com"
            className="transition hover:scale-110"
            aria-label="Email"
          >
            <Mail className="w-5 h-5 text-fofo-blue opacity-70 hover:opacity-100" />
          </a>
        </div>
      </div>
    </footer>
  );
}
