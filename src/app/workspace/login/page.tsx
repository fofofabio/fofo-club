import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import PageTransition from "@/components/PageTransition";

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
  const session = await auth();

  if (session?.user?.id) {
    redirect("/workspace");
  }

  return (
    <PageTransition>
      <main className="relative isolate min-h-[calc(100dvh-6rem)] overflow-hidden bg-fofo-paper px-6 py-12">
        <div className="pointer-events-none absolute inset-0 nb-dots opacity-70" />

        <div className="relative mx-auto flex min-h-[60dvh] max-w-md items-start justify-center pt-[12vh]">
          <AdminLoginForm />
        </div>
      </main>
    </PageTransition>
  );
}
