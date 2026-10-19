import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import WorkspaceDesk from "@/components/admin/WorkspaceDesk";


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

  return <WorkspaceDesk displayName={displayName} />;
}
