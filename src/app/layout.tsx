import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { inter, grotesk, tiny5 } from "./fonts";
import LogoFly from "@/components/LogoFly";           // client component (ok to use here)
import RouteTransitions from "@/components/RouteTransitions"; // client wrapper

export const metadata: Metadata = {
  title: "Fofo Club",
  description: "For Ordinary Fellows, Occasionally exceptional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${tiny5.variable}`}>
      <body className="min-h-dvh antialiased bg-fofo-paper text-black">
        <LogoFly />
        {/* Header */}
        <header className="sticky top-0 z-50 border-b-[2.5px] border-black bg-fofo-paper/90 backdrop-blur">
          <div className="flex w-full items-center justify-between pl-6 pr-6 py-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Fofo Club home">
              <img
                id="fofo-navbar-logo"
                src="/fofo-logo.png"
                alt="Fofo Club"
                className="h-16 w-16 select-none"
              />
            </Link>

            <nav className="ml-auto flex items-center gap-2 sm:gap-3">
              {[
                ["tools", "/tools", false],
                ["blog", "/blog", false],
                ["videos", "/videos", false],
                ["about", "/about", true],
              ].map(([label, href, filled]) => (
                <Link
                  key={href as string}
                  href={href as string}
                  className={`border-[2px] border-black px-3 py-1.5 font-pixel text-[11px] uppercase tracking-widest transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm ${
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
      </body>
    </html>
  );
}
