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
      <main className="relative isolate overflow-hidden py-8 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,8,255,0.14),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(125,211,252,0.2),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(190,242,100,0.14),_transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

        <div className="page-shell-wide relative">
          <header className="mb-6 flex flex-col gap-5 rounded-[32px] border border-black/10 bg-white/75 px-5 py-5 shadow-lg shadow-black/5 backdrop-blur md:flex-row md:items-end md:justify-between md:px-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-black text-white">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="meta text-fofo-blue">PRIVATE WORKSPACE</p>
                  <h1 className="mt-1 font-display text-4xl tracking-tight text-black md:text-5xl">
                    Workspace
                  </h1>
                </div>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65 md:text-base">
                Have a nice day, {displayName}.
              </p>
            </div>

            <form action={logoutAdminAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-black/70 transition hover:-translate-y-0.5 hover:border-black/20 hover:text-black"
              >
                <ShieldOff className="h-4 w-4" />
                Lock
              </button>
            </form>
          </header>

          <WorkspaceTabs />
        </div>
      </main>
    </PageTransition>
  );
}
