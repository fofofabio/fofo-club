import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import WorkspaceDesk from "@/components/admin/WorkspaceDesk";
import { workspaceTasksPath } from "@/lib/workspaceLinks";


export const metadata: Metadata = {
  title: "Workspace | Fofo Club",
  description: "Private workspace and personal workflows for Fofo Club.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ view?: string; project?: string }> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) {
    const returnPath = params.view === "tasks" ? workspaceTasksPath(typeof params.project === "string" ? params.project : null) : "/workspace";
    redirect(returnPath === "/workspace" ? "/workspace/login" : `/workspace/login?callbackUrl=${encodeURIComponent(returnPath)}`);
  }

  const displayName =
    session.user.name ||
    session.user.email?.split("@")[0] ||
    "there";

  return <WorkspaceDesk key={session.user.id} displayName={displayName} userId={session.user.id} />;
}
