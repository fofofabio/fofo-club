import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import AdminLoginForm from "./AdminLoginForm";
import { safeWorkspaceReturnPath } from "@/lib/workspaceLinks";

export const metadata: Metadata = {
  title: "Workspace Login | Fofo Club",
  description: "Private workspace access for Fofo Club.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspaceLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const returnPath = safeWorkspaceReturnPath(params.callbackUrl);

  if (session?.user?.id) {
    redirect(returnPath);
  }

  return <main id="workspace-content" className="ws-login"><AdminLoginForm returnPath={returnPath} /></main>;
}
