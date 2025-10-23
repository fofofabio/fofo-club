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
},
},
fontFamily: {
sans: ["var(--font-inter)", "system-ui", "sans-serif"],
display: ["var(--font-grotesk)", "var(--font-inter)", "sans-serif"],
pixel: ["var(--font-tiny5)", "monospace"],
},
letterSpacing: {
wide2: ".08em",
},
boxShadow: {
soft: "0 10px 30px -12px rgba(0,0,0,.35)",
},
borderRadius: {
xl2: "1.25rem",
},
},
},
plugins: [],
};
export default config;