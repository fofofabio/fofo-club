"use client";

import FcLink from "@/components/FcLink";
import { profile, experience, education, projects, skills } from "@/data/cv";

/**
 * /cv — the CV as a page, in the site's own Paper & Wire voice.
 * Screen: full neo-brutalist attitude (marker, brutal shadows, blue panel).
 * Print: Ctrl+P (or the button) yields a clean single-page A4 PDF — site
 * chrome is hidden and the loud bits calm down via @media print.
 */
export default function CvPage() {
  return (
    <main className="relative mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <style>{`
        @media print {
          header, #fofo-logofly, .fc-key { display: none !important; }
          html, body { background: #fff !important; height: auto !important; min-height: 0 !important; }
          @page { size: A4; margin: 8mm; }
          a { color: inherit; text-decoration: none; }
          main h1 { font-size: 26px !important; }
          main h2 { font-size: 14px !important; }
          main h3 { font-size: 13px !important; }
          main ul { font-size: 12px !important; line-height: 1.3 !important; margin-top: 2px !important; }
          main .meta { font-size: 9px !important; }
          main section { margin-top: 10px !important; }
          main section > ul { margin-top: 6px !important; }
          main section > ul > li,
          main section > div > ul > li {
            padding: 6px 10px !important;
            margin-top: 6px !important;
          }
          main ul.list-disc > li { padding: 0 !important; margin-top: 0 !important; }
          main section > div[class*="inline-block"] { padding: 2px 8px !important; font-size: 10px !important; }
        }
      `}</style>

      <div className="absolute inset-0 grid-bg pointer-events-none print:hidden" aria-hidden />

      {/* header */}
      <section className="relative border-[2.5px] border-black bg-white p-6 shadow-brutal print:border-0 print:p-0 print:shadow-none">
        <span className="fc-src" aria-hidden>{`<cv/>`}</span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-4xl md:text-5xl leading-none tracking-[-0.01em]">
              <span className="nb-mark">{profile.name}</span>
            </h1>
            <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.12em] text-black/70">
              {profile.location} · IT project management &amp; software
            </p>
            <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.12em] text-black/70">
              {profile.languages}
            </p>
          </div>
          <div className="font-mono text-[12px] leading-relaxed text-right">
            <div>
              <a className="text-fofo-blue" href={`mailto:${profile.email}`}>{profile.email}</a>
            </div>
            <div>
              <a className="text-fofo-blue" href={profile.github}>github.com/fofofabio</a>
            </div>
            <div>
              <a className="text-fofo-blue" href={profile.linkedin}>linkedin/fabio-unterholzer</a>
            </div>
            <div>
              <a className="text-fofo-blue" href="https://fofoclub.at">fofoclub.at</a>
            </div>
          </div>
        </div>
        <span
          className="font-hand text-xl text-black/60 absolute -bottom-4 right-6 -rotate-2 print:hidden"
          aria-hidden
        >
          the website is the CV →
        </span>
      </section>

      {/* experience — blue panel header */}
      <section className="relative mt-8 print:mt-5">
        <div className="inline-block border-[2.5px] border-black bg-fofo-blue px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-white shadow-brutal-sm -rotate-1 print:rotate-0 print:shadow-none">
          cv · experience
        </div>
        <ul className="mt-4 space-y-4 print:space-y-3">
          {experience.map((job, i) => (
            <li
              key={i}
              className="border-[2.5px] border-black bg-white p-4 shadow-brutal-sm transition-transform hover:-translate-y-0.5 print:border-black/40 print:shadow-none"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg md:text-xl">
                  {job.role} · <span className="text-fofo-blue">{job.company}</span>
                </h2>
                <div className="meta">{job.period} · {job.location}</div>
              </div>
              <ul className="mt-1.5 list-disc pl-5 text-[15px] text-black/80">
                {job.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* projects */}
      <section className="relative mt-8 print:mt-5">
        <div className="inline-block border-[2.5px] border-black bg-fofo-yellow px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-black shadow-brutal-sm rotate-1 print:rotate-0 print:shadow-none">
          projects
        </div>
        <ul className="mt-4 space-y-4 print:space-y-3">
          {projects.map((p, i) => (
            <li
              key={i}
              className={`border-[2.5px] border-black bg-white p-4 shadow-brutal-sm transition-transform hover:-translate-y-0.5 print:border-black/40 print:shadow-none ${
                "printHidden" in p && p.printHidden ? "print:hidden" : ""
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg md:text-xl text-fofo-blue">{p.name}</h2>
                <div className="meta">{p.period}</div>
              </div>
              <ul className="mt-1.5 list-disc pl-5 text-[15px] text-black/80">
                {p.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* education + skills */}
      <section className="relative mt-8 grid gap-6 md:grid-cols-2 print:mt-5 print:grid-cols-2">
        <div>
          <div className="inline-block border-[2.5px] border-black bg-white px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] shadow-brutal-sm -rotate-1 print:rotate-0 print:shadow-none">
            education
          </div>
          <ul className="mt-4 space-y-3">
            {education.map((e, i) => (
              <li key={i} className="border-[2.5px] border-black bg-white p-4 shadow-brutal-sm print:border-black/40 print:shadow-none">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base">{e.school}</h3>
                  <div className="meta">{e.period}</div>
                </div>
                {e.notes.length > 0 && (
                  <ul className="mt-1.5 list-disc pl-5 text-[14px] text-black/80">
                    {e.notes.map((n, k) => (
                      <li key={k}>{n}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="inline-block border-[2.5px] border-black bg-fofo-pink px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-white shadow-brutal-sm rotate-1 print:rotate-0 print:shadow-none">
            skills
          </div>
          <ul className="mt-4 space-y-2 border-[2.5px] border-black bg-white p-4 text-[14px] text-black/80 shadow-brutal-sm print:border-black/40 print:shadow-none">
            {skills.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* footer chrome — screen only */}
      <section className="relative mt-10 flex flex-wrap items-center justify-between gap-4 border-t-[2.5px] border-black pt-5 print:hidden">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/50">
          rendered live from src/data/cv.ts
        </div>
        <div className="flex items-center gap-4">
          <FcLink href="/about">about</FcLink>
          <button
            onClick={() => window.print()}
            className="border-[2px] border-black bg-fofo-blue px-3 py-1.5 font-sans text-[13px] font-semibold uppercase tracking-wide text-white transition-all hover:-translate-y-0.5 hover:shadow-brutal-sm"
          >
            print / save pdf
          </button>
        </div>
      </section>
    </main>
  );
}
