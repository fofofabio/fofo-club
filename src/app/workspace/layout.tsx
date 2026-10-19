import WorkspaceFrame from "@/components/admin/WorkspaceUI";
import "./workspace.css";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
