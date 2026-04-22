import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Workspace Login | Fofo Club",
  description: "Private workspace access for Fofo Club.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  redirect("/workspace/login");
}
