import type { Config } from "tailwindcss";


const config: Config = {
darkMode: ["class"],
content: [
"./src/pages/**/*.{ts,tsx}",
"./src/components/**/*.{ts,tsx}",
"./src/app/**/*.{ts,tsx}",
],
theme: {
extend: {
colors: {
fofo: {
blue: "#0008FF", // main accent
black: "#000000",
mist: "#B8DBD9",
pink: "#FF3DBE", // optional pop, use sparingly
paper: "#F2EFE6", // warm neo-brutalist canvas
yellow: "#FFE14D", // marker / highlight
},
},
fontFamily: {
sans: ["var(--font-inter)", "system-ui", "sans-serif"],
display: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
pixel: ["var(--font-tiny5)", "monospace"],
hand: ["var(--font-caveat)", "cursive"],
mono: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
},
letterSpacing: {
wide2: ".08em",
},
boxShadow: {
soft: "0 10px 30px -12px rgba(0,0,0,.35)",
// hard, offset, blur-less neo-brutalist shadows
brutal: "6px 6px 0 0 #000000",
"brutal-sm": "3px 3px 0 0 #000000",
"brutal-lg": "10px 10px 0 0 #000000",
"brutal-blue": "6px 6px 0 0 #0008FF",
"brutal-pink": "6px 6px 0 0 #FF3DBE",
},
borderRadius: {
xl2: "1.25rem",
},
},
},
plugins: [],
};
export default config;