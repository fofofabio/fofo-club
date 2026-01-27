import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Fofo Club — Privacy",
  description: "Privacy notes for Fofo Club.",
};

export default function PrivacyPage() {
  return (
    <PageTransition>
      <main className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
        <SectionFade once threshold={0.15}>
          <header className="mb-10">
            <p className="meta text-fofo-blue/80">PRIVACY</p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl leading-tight">
              Minimal by design
            </h1>
            <p className="mt-3 max-w-2xl text-black/60">
              Fofo Club does not run analytics, tracking, or ads. This page
              explains the limited data that exists because the site has to
              function.
            </p>
          </header>
        </SectionFade>

        <SectionFade once threshold={0.15}>
          <section className="space-y-6 text-black/70">
            <div className="card p-5">
              <h2 className="font-display text-xl text-black/90">Cookies</h2>
              <p className="mt-2 text-sm">
                No analytics cookies, no marketing cookies, and no tracking
                pixels. Only essential technical cookies may exist if required
                by the framework or hosting platform.
              </p>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl text-black/90">Personal data</h2>
              <p className="mt-2 text-sm">
                No user accounts, no newsletters, no contact forms, and no
                embedded third-party widgets that collect data about you.
              </p>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl text-black/90">Strava data</h2>
              <p className="mt-2 text-sm">
                The training visuals shown on the site come from my own Strava
                account. They are displayed as part of the content and are not
                collected from visitors.
              </p>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl text-black/90">Hosting logs</h2>
              <p className="mt-2 text-sm">
                The site is hosted on Vercel. Like most hosts, basic server logs
                (e.g. IP address, browser type) may be processed for security
                and reliability.
              </p>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-xl text-black/90">Contact</h2>
              <p className="mt-2 text-sm">
                If you have a privacy question, reach out at{" "}
                <a
                  href="mailto:hi@fofoclub.com"
                  className="text-fofo-blue hover:underline"
                >
                  hi@fofoclub.com
                </a>
                .
              </p>
            </div>
          </section>
        </SectionFade>
        <SectionFade once threshold={0.12}>
          <Footer />
        </SectionFade>
      </main>
    </PageTransition>
  );
}
