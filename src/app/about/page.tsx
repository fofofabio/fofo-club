import SectionFade from "@/components/Sectionfade";
import Link from "next/link";
import { profile, experience, education, skills } from "@/data/cv";
import PageTransition from "@/components/PageTransition";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <PageTransition>
      <main className="mx-auto max-w-[100vw]">
        {/* INTRO */}
        <SectionFade once threshold={0.2}>
          <section className="mx-auto max-w-5xl px-6 pt-16 pb-10 grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="meta text-fofo-blue/80 mb-3">about</div>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.03] tracking-[-0.01em] max-w-[22ch]">
                i’m fabio. i like to do cool things and have fun, design, code —
                under fofo club.
              </h1>
              <p className="mt-5 text-lg text-black/80 max-w-2xl">
                based in {profile.location}. — {profile.age} years old.
              </p>
            </div>

            {/* portrait */}
            <div className="relative mx-auto md:mx-0">
              <img
                src="/me.png"
                alt="Fabio Unterholzer portrait"
                className="w-40 h-40 md:w-56 md:h-56 rounded-2xl object-cover border border-black/10 shadow-sm"
              />
            </div>
          </section>
        </SectionFade>

        {/* BLUE PANEL */}
        <SectionFade once threshold={0.2}>
          <section className="relative isolate overflow-hidden">
            <div className="absolute inset-0 bg-fofo-blue" />
            <div className="absolute inset-0 grid-bg mix-blend-multiply opacity-30" />
            <div className="relative mx-auto max-w-5xl px-6 py-14 text-white">
              <p className="text-xl md:text-2xl leading-relaxed max-w-3xl">
                fofo club isn’t a portfolio or a brand — it’s something
                personal, something real. i like things that feel light, sharp,
                honest, loud, colorful. i like to create; sometimes the results
                become shirts or tools my friends and i use.
              </p>
            </div>
          </section>
        </SectionFade>

        {/* EXPERIENCE */}
        <SectionFade once threshold={0.15}>
          <section className="relative isolate">
            <div className="absolute inset-0 grid-bg pointer-events-none" />
            <div className="relative mx-auto max-w-5xl px-6 py-12">
              <div className="meta mb-3">cv — experience</div>
              <ul className="space-y-6">
                {experience.map((job, i) => (
                  <li key={i} className="card p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-xl md:text-2xl">
                        {job.role} ·{" "}
                        <span className="text-fofo-blue">{job.company}</span>
                      </h3>
                      <div className="meta">{job.period}</div>
                    </div>
                    <div className="meta mt-1">{job.location}</div>
                    <ul className="mt-3 list-disc pl-5 text-black/80">
                      {job.highlights.map((h, j) => (
                        <li key={j}>{h}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </SectionFade>

        {/* EDUCATION + SKILLS */}
        <SectionFade once threshold={0.15}>
          <section className="mx-auto max-w-5xl px-6 pb-16">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div className="meta mb-3">education</div>
                <ul className="space-y-4">
                  {education.map((e, i) => (
                    <li key={i} className="card p-5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-display text-lg">{e.school}</h4>
                        <div className="meta">{e.period}</div>
                      </div>
                      {e.notes.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-black/80">
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
                <div className="meta mb-3">skills</div>
                <div className="card p-5">
                  <ul className="grid grid-cols-1 gap-2 text-black/80">
                    {skills.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 meta mb-2">contact</div>
                <div className="card p-5 flex flex-wrap items-center gap-4">
                  <Link
                    href="mailto:fabio.unterholzer@outlook.com"
                    className="hover:text-fofo-blue transition"
                  >
                    hi@fofoclub
                  </Link>
                  <span className="text-black/30">·</span>
                  <Link
                    href="https://github.com/fofofabio"
                    className="hover:text-fofo-blue transition"
                  >
                    github
                  </Link>
                  <span className="text-black/30">·</span>
                  <Link
                    href="https://www.linkedin.com/in/fabio-unterholzer"
                    className="hover:text-fofo-blue transition"
                  >
                    linkedin
                  </Link>
                  <span className="text-black/30">·</span>
                  <Link
                    href="/LebenslaufUnterholzer.pdf"
                    className="hover:text-fofo-blue transition"
                    download
                  >
                    download pdf
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </SectionFade>
        <Footer />
      </main>
    </PageTransition>
  );
}
