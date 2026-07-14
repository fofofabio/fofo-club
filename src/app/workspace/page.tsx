import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shield, ShieldOff } from "lucide-react";

import { auth } from "@/auth";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import WorkspaceDesk from "@/components/admin/WorkspaceDesk";

import { logoutAdminAction } from "./actions";

export const metadata: Metadata = {
  title: "Workspace | Fofo Club",
  description: "Private workspace and personal workflows for Fofo Club.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/workspace/login");
  }

  const displayName =
    session.user.name ||
    session.user.email?.split("@")[0] ||
    "there";

  return (
    <PageTransition>
      <main className="relative isolate overflow-hidden bg-fofo-paper py-8 pb-16">
        <div className="pointer-events-none absolute inset-0 nb-dots opacity-60" />

        <div className="page-shell-wide relative">
          {/* rotated sticker — the human hand on the machine room */}
          <div
            aria-hidden
            className="nb-sticker absolute -top-10 left-6 z-10 hidden -rotate-[4deg] bg-fofo-pink text-[13px] lg:block"
          >
            the messy bit
            <br />
            nobody else sees
          </div>

          <SectionFade once threshold={0.15} baseClass="fc-stamp" inClass="fc-stamp-in">
          <header className="mb-6 flex items-center justify-between gap-4 border-[2.5px] border-black bg-white px-4 py-3 shadow-brutal md:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border-[2px] border-black bg-black text-white">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h1 className="font-display text-2xl font-bold lowercase tracking-tight text-black md:text-3xl">
                  workspace
                </h1>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fofo-blue">
                  // private
                </span>
                <span className="hidden text-sm text-black/45 sm:inline">
                  have a nice day, {displayName}.
                </span>
              </div>
            </div>

            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 border-[2px] border-black bg-white px-3 py-1.5 font-mono text-[12px] uppercase tracking-wide text-black shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white"
              >
                <ShieldOff className="h-4 w-4" />
                lock
              </button>
            </form>
          </header>
          </SectionFade>

          <WorkspaceDesk />
        </div>
      </main>
    </PageTransition>
  );
}
