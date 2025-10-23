import { Inter, Bricolage_Grotesque, Tiny5 } from "next/font/google";


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