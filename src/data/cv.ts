// Minimal CV data used by the About page
export const profile = {
  name: "Fabio Unterholzer",
  birthdate: "",
  age: 23,                // computed for 2025-10-24
  location: "Graz, Austria",
  email: "fabio.unterholzer@outlook.com",
  github: "https://github.com/fofofabio",
  linkedin: "https://www.linkedin.com/in/fabio-unterholzer",
  languages: "German (native), English (Cambridge Certificate)",
};

export const experience = [
  {
    company: "LNConsult GmbH",
    role: "Junior IT Project Manager",
    location: "Graz",
    period: "Apr 2025 — present",
    highlights: [
      "Lead developer of EREX, the company's distributed ESL rendering engine (see projects)",
      "ESL template systems & template logic (JavaScript, Python, Node, XML); cross-team delivery and rollouts",
    ],
  },
  {
    company: "Accenture",
    role: "Intern — Conversational AI / Frontend",
    location: "Vienna",
    period: "Jul–Sep 2023 · Apr–Jun 2024",
    highlights: [
      "AI-assisted AWS Lex voicebot (ID & auth), Azure FAQ chatbot",
      "Feedback analysis with embeddings; AEM + React frontends",
    ],
  },
  {
    company: "Mondi",
    role: "Intern — IT Administration",
    location: "Frantschach",
    period: "Jul–Sep 2021 & 2022",
    highlights: ["Domain migration, AAD, SCCM in a small IT team"],
  },
];

export const education = [
  {
    school: "FH JOANNEUM — Information Management, BSc",
    period: "2021 — 2024",
    notes: [
      "Software engineering (Java, Python, Web), DBs (SQL/NoSQL), Cloud (AWS/Azure)",
      "IT management, project mgmt; Thesis: AI in User-Centered Design",
    ],
  },
  {
    school: "BORG Wolfsberg — Matura",
    period: "2016 — 2020",
    notes: [],
  },
];

export const projects = [
  {
    name: "EREX — distributed ESL rendering engine",
    period: "2025 — present",
    highlights: [
      "Designed and built a distributed ESL rendering engine (TypeScript, Fastify, Redis/BullMQ, Playwright, MinIO/S3, Docker) rendering label PNGs in ~200ms end-to-end, with priority queueing, multi-layer caching, and Prometheus observability",
      "Architected a content-plugin system decoupling customer templates, business logic, and data sources from the engine core — zero-code onboarding of new customers",
      "Hardened the pipeline for production: browser page pooling, root-caused rendering stalls and queue deadlocks, validated stability under bursts of 500 concurrent jobs",
      "Built a WYSIWYG template editor with a JSON document model and compiler, plus e-ink color post-processing (chroma-weighted palette quantization with pixel-parity comparison)",
    ],
  },
  {
    name: "fofoclub.at",
    period: "2024 — present",
    highlights: [
      "Personal full-stack site: Next.js 15, React 19, TypeScript, Tailwind, PostgreSQL, Auth.js",
      "Built a custom design system (“Paper & Wire”), an hours-tracking workspace, and interactive tools/games",
    ],
  },
  {
    name: "fofobot (lm-studio-chat)",
    period: "2026",
    printHidden: true,
    highlights: [
      "Fully local AI chat app — no cloud, no API keys: Next.js 16, React 19, Vercel AI SDK, LM Studio, SQLite",
      "Streaming with live tool-call status, thinking mode, conversation branching, and a “code mode” giving the model filesystem + git tools",
    ],
  },
];

export const skills = [
  "JavaScript/TypeScript, Python, C#, Kotlin, Go",
  "React, Next.js, Node.js, Tailwind",
  "SQL (PostgreSQL), Redis, Cloud (Azure, AWS)",
  "Docker, Fastify, BullMQ, Playwright, Prometheus observability",
  "AI tooling: chatbots/voicebots, embeddings, AI-assisted development",
  "Also worked with: Unity, Spring, Django, Angular, Vue.js",
];
