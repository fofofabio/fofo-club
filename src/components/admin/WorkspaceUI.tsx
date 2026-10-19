"use client";

import { createContext, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AppearanceContext = createContext({ theme: "light", toggle: () => {} });

export function WorkspaceAppearance() {
  const { theme, toggle } = useContext(AppearanceContext);
  return <WorkspaceButton onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? "Dark theme" : "Light theme"}</WorkspaceButton>;
}

export function WorkspaceButton({ primary, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" className={`ws-button ${primary ? "ws-primary" : ""} ${className}`} {...props} />;
}

export function Disclosure({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <details className={`ws-disclosure ${className}`}><summary>{title}</summary><div className="ws-disclosure-body">{children}</div></details>;
}

export function Feedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`ws-feedback ${error ? "ws-error" : ""}`} role={error ? "alert" : "status"}><span className={`ws-status ${error ? "ws-status-error" : ""}`} aria-hidden="true" />{children}</div>;
}

export function WorkspaceTable({ label, children }: { label: string; children: ReactNode }) {
  return <div className="ws-table-wrap"><table className="ws-data-table" aria-label={label}>{children}</table></div>;
}

/** Applies to existing detail surfaces too, so all dialogs share keyboard behavior. */
export function useWorkspaceDialogs(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const cleanups = new Map<HTMLElement, () => void>();
    function sync() {
      for (const [dialog, cleanup] of cleanups) {
        if (!dialog.isConnected || dialog.closest("[hidden]")) { cleanup(); cleanups.delete(dialog); }
      }
      container!.querySelectorAll<HTMLElement>('[role="dialog"]').forEach((dialog) => {
        if (cleanups.has(dialog) || dialog.closest("[hidden]")) return;
        const trigger = document.activeElement as HTMLElement | null;
        const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')).filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
        dialog.tabIndex = -1;
        (focusable()[0] ?? dialog).focus();
        function handleKey(event: KeyboardEvent) {
          if (event.key === "Escape") {
            const close = dialog.querySelector<HTMLButtonElement>('button[aria-label^="Close"]');
            if (close) { event.preventDefault(); event.stopImmediatePropagation(); close.click(); }
          }
          if (event.key !== "Tab") return;
          const items = focusable();
          const first = items[0], last = items.at(-1);
          if (!first) { event.preventDefault(); dialog.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        document.addEventListener("keydown", handleKey, true);
        cleanups.set(dialog, () => { document.removeEventListener("keydown", handleKey, true); if (trigger?.isConnected && !trigger.closest("[hidden]")) trigger.focus(); });
      });
    }
    const observer = new MutationObserver(sync);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    sync();
    return () => { observer.disconnect(); cleanups.forEach((cleanup) => cleanup()); };
  }, [root]);
}

export default function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useWorkspaceDialogs(root);
  useEffect(() => {
    const stored = localStorage.getItem("fofo-workspace-theme");
    setTheme(stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light");
  }, []);
  useEffect(() => {
    const receive = (event: Event) => setFeedback((event as CustomEvent<{ message: string; error: boolean }>).detail);
    window.addEventListener("workspace-feedback", receive);
    return () => window.removeEventListener("workspace-feedback", receive);
  }, []);
  useEffect(() => {
    if (!feedback || feedback.error) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  return <AppearanceContext.Provider value={{ theme, toggle: () => { const next = theme === "light" ? "dark" : "light"; setTheme(next); localStorage.setItem("fofo-workspace-theme", next); } }}><div ref={root} className="ws-shell" data-theme={theme}>
    <a href="#workspace-content" className="ws-skip">Skip to working content</a>
    {pathname === "/workspace/login" ? <div className="ws-utility"><Link href="/">← Back to Fofo Club</Link><WorkspaceAppearance /></div> : null}
    {children}
    {feedback ? <div className="ws-toast"><Feedback error={feedback.error}>{feedback.message}<WorkspaceButton onClick={() => setFeedback(null)} aria-label="Dismiss feedback">Dismiss</WorkspaceButton></Feedback></div> : null}
  </div></AppearanceContext.Provider>;
}
