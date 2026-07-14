"use client";

import { useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import clsx from "clsx";

type Props = {
  value: string; // "yyyy-mm-dd" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  /** Show a clear (×) affordance when a date is set. */
  clearable?: boolean;
  className?: string;
};

function formatLabel(value: string) {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

/**
 * Paper & Wire date input: a styled trigger sits on top of a transparent native
 * <input type="date">, so clicking opens the real browser calendar while the
 * ugly `tt.mm.jjjj` field and locale chrome stay hidden.
 */
export default function DateField({
  value,
  onChange,
  placeholder = "date",
  clearable = false,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = Boolean(value);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    // Chrome only opens the calendar via showPicker(); a plain click on a
    // transparent date input just focuses it. Fall back to focus if unsupported.
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  return (
    <div
      onClick={openPicker}
      className={clsx(
        "relative inline-flex cursor-pointer items-center gap-1.5 border-[2.5px] px-3 py-2 font-mono text-[12px] uppercase tracking-wide transition",
        hasValue
          ? "border-black bg-white text-black"
          : "border-black/20 bg-white text-black/50 hover:border-black/50",
        className,
      )}
    >
      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{hasValue ? formatLabel(value) : placeholder}</span>

      {clearable && hasValue ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange("");
          }}
          aria-label="Clear date"
          className="z-10 ml-0.5 text-black/40 transition hover:text-fofo-pink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="date"
        value={value}
        min="2000-01-01"
        max="2099-12-31"
        aria-label={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          const year = parseInt(next.split("-")[0] ?? "0", 10);
          if (!next || (year >= 2000 && year <= 2099)) onChange(next);
        }}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  );
}
