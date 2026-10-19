import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

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

  return <main id="workspace-content" className="ws-login"><AdminLoginForm /></main>;
}
