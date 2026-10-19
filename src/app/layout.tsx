import "./globals.css";
import type { Metadata } from "next";
import { inter, grotesk, tiny5, caveat, spaceMono } from "./fonts";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Fofo Club",
  description: "For Ordinary Fellows, Occasionally exceptional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${tiny5.variable} ${caveat.variable} ${spaceMono.variable}`}>
      <body className="min-h-dvh antialiased bg-fofo-paper text-black">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
