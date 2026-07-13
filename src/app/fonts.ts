import { Inter, Bricolage_Grotesque, Tiny5, Caveat, Space_Mono } from "next/font/google";


export const inter = Inter({
subsets: ["latin"],
variable: "--font-inter",
display: "swap",
});


export const grotesk = Bricolage_Grotesque({
subsets: ["latin"],
variable: "--font-grotesk",
display: "swap",
});


export const tiny5 = Tiny5({
weight: "400",
subsets: ["latin"],
variable: "--font-tiny5",
display: "swap",
});


export const caveat = Caveat({
subsets: ["latin"],
variable: "--font-caveat",
display: "swap",
});


// "wire" voice — the machine hand. Metadata, source labels, keyboard hints,
// timestamps, version chrome. Never headlines or body (see DESIGN.md).
export const spaceMono = Space_Mono({
weight: ["400", "700"],
subsets: ["latin"],
variable: "--font-space-mono",
display: "swap",
});