"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import LogoFly from "./LogoFly";
import KeyboardNav from "./KeyboardNav";
import RouteTransitions from "./RouteTransitions";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/workspace" || pathname.startsWith("/workspace/")) return <>{children}</>;
  return <>
        <LogoFly />
        <KeyboardNav />
        {/* Header */}
        <header className="sticky top-0 z-50 border-b-[2.5px] border-black bg-fofo-paper/90 backdrop-blur">
          <div className="flex w-full items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <Link href="/" className="flex flex-shrink-0 items-center gap-3" aria-label="Fofo Club home">
              <img
                id="fofo-navbar-logo"
                src="/fofo-logo.png"
                alt="Fofo Club"
                className="h-11 w-11 select-none object-contain sm:h-16 sm:w-16"
              />
            </Link>

            <nav className="ml-auto flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
              {[
                ["tools", "/tools", true],
                ["blog", "/blog", false],
                ["videos", "/videos", false],
                ["about", "/about", false],
              ].map(([label, href, filled]) => (
                <Link
                  key={href as string}
                  href={href as string}
                  className={`border-[2px] border-black px-2 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm sm:px-3 sm:text-[13px] ${
                    filled
                      ? "bg-fofo-blue text-white"
                      : "bg-white text-black hover:bg-fofo-blue hover:text-white"
                  }`}
                >
                  {label as string}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* Route transitions (client) */}
        <RouteTransitions>{children}</RouteTransitions>
  </>;
}
