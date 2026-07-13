"use client";

import { Mail, Github, Linkedin, Instagram } from "lucide-react";

export default function FofoFooter() {
  const year = new Date().getFullYear();

  const links = [
    ["tools", "/tools"],
    ["blog", "/blog"],
    ["videos", "/videos"],
    ["about", "/about"],
    ["privacy", "/privacy"],
  ];

  const socials = [
    { Icon: Instagram, href: "https://instagram.com/sirfabioo", label: "Instagram" },
    { Icon: Linkedin, href: "https://linkedin.com/in/fabio-unterholzer", label: "LinkedIn" },
    { Icon: Github, href: "https://github.com/fofofabio", label: "GitHub" },
    { Icon: Mail, href: "mailto:hi@fofoclub.com", label: "Email" },
  ];

  return (
    <footer className="relative isolate border-t-[2.5px] border-black bg-fofo-blue text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* giant wordmark */}
        <div className="flex items-center gap-3 leading-none">
          <span className="font-display text-[15vw] font-bold tracking-tighter md:text-[9rem]">
            fofo club
          </span>
          <span className="nb-star text-white text-4xl md:text-6xl">✳</span>
        </div>

        <p className="mt-4 max-w-md font-pixel text-[11px] uppercase tracking-widest text-white/70">
          for ordinary fellows, occasionally exceptional.
        </p>

        {/* rails */}
        <div className="mt-12 grid gap-8 border-t-[2.5px] border-white/40 pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <nav className="flex flex-wrap gap-3">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="border-[2px] border-white bg-transparent px-3 py-1.5 font-pixel text-[11px] uppercase tracking-widest transition-colors hover:bg-white hover:text-fofo-blue"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex gap-3">
            {socials.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center border-[2px] border-white transition-colors hover:bg-white hover:text-fofo-blue"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-x-4 gap-y-1 font-pixel text-[10px] uppercase tracking-widest text-white/60">
          <span>built &amp; run by fabio unterholzer</span>
          <span>graz · v1.0.1 · © {year} fofo club</span>
        </div>
      </div>
    </footer>
  );
}
