import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Shield, ShieldOff } from "lucide-react";

import { auth } from "@/auth";
import PageTransition from "@/components/PageTransition";
import WorkspaceTabs from "@/components/admin/WorkspaceTabs";

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
          <header className="mb-6 flex flex-col gap-5 border-[2.5px] border-black bg-white px-5 py-5 shadow-brutal md:flex-row md:items-end md:justify-between md:px-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center border-[2.5px] border-black bg-black text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fofo-blue">
                    // private workspace
                  </span>
                  <h1 className="font-display text-4xl font-bold tracking-tight text-black md:text-5xl">
                    workspace
                  </h1>
                </div>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65 md:text-base">
                have a nice day, {displayName}.
              </p>
            </div>

            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 border-[2.5px] border-black bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-black shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white"
              >
                <ShieldOff className="h-4 w-4" />
                lock
              </button>
            </form>
          </header>

          <WorkspaceTabs />
        </div>
      </main>
    </PageTransition>
  );
}
