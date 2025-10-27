import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { inter, grotesk, tiny5 } from "./fonts";
import LogoFly from "@/components/LogoFly";           // client component (ok to use here)
import RouteTransitions from "@/components/RouteTransitions"; // client wrapper

export const metadata: Metadata = {
  title: "Fofo Club",
  description: "Fofo Club — Digital Racing Division",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${tiny5.variable}`}>
      <body className="min-h-dvh antialiased bg-white text-black">
        <LogoFly />

        {/* Header */}
        <header className="sticky top-0 z-50 border-black/10 bg-white/70 backdrop-blur">
          <div className="flex w-full items-center justify-between pl-6 pr-6 py-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Fofo Club home">
              <img
                id="fofo-navbar-logo"
                src="/fofo-logo.png"
                alt="Fofo Club"
                className="h-16 w-16 select-none"
              />
            </Link>

            <nav className="ml-auto flex items-center gap-6">
              {[
                ["tools", "/tools"],
                ["projects", "/projects"],
                ["blog", "/blog"],
                ["gear", "/gear"],
                ["about", "/about"],
              ].map(([label, href]) => (
                <Link key={href} href={href as string} className="meta hover:text-fofo-blue/90">
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
