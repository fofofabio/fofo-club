import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import PageTransition from "@/components/PageTransition";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/adminAuth";

import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Workspace Login | Fofo Club",
  description: "Private workspace access for Fofo Club.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspaceLoginPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (await isValidAdminSession(sessionToken)) {
    redirect("/workspace");
  }

  return (
    <PageTransition>
      <main className="relative isolate min-h-[calc(100dvh-6rem)] overflow-hidden px-6 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,8,255,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(134,239,172,0.18),_transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

        <div className="relative mx-auto flex min-h-[70dvh] max-w-xl items-center justify-center">
          <AdminLoginForm />
        </div>
      </main>
    </PageTransition>
  );
}
