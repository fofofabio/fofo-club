"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import SectionFade from "@/components/Sectionfade";
import Footer from "@/components/Footer";

type CellState = "empty" | "correct" | "present" | "absent";

const WORDS: string[] = [
  "ABOUT","OTHER","WHICH","THEIR","THERE","FIRST","WOULD","THESE","THING","POINT",
  "RIGHT","PLACE","SMALL","SOUND","GREAT","AGAIN","STILL","EVERY","FOUND","THREE",
  "UNDER","WATER","AFTER","WHERE","HOUSE","WORLD","HEART","LIGHT","NIGHT","RIGHT",
  "APPLE","GRAPE","MANGO","LEMON","PEACH","BERRY","STONE","CHAIR","TABLE","PLANT",
  "SWEET","BRAVE","CRANE","SLATE","ROUTE","CLOUD","WINDY","STORM","RAINY","SUNNY"
];

function getDayIndexUTC(): number {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epoch = Date.UTC(2024, 0, 1);
  const days = Math.floor((utc - epoch) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

function pickTodayWord(): string {
  const idx = getDayIndexUTC() % WORDS.length;
  return WORDS[idx];
}

function evaluateGuess(solution: string, guess: string): CellState[] {
  const res: CellState[] = Array(5).fill("absent");
  const sol = solution.split("");
  const g = guess.split("");
  const counts: Record<string, number> = {};
  for (let i = 0; i < 5; i++) {
    if (g[i] === sol[i]) {
      res[i] = "correct";
    } else {
      counts[sol[i]] = (counts[sol[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === "correct") continue;
    const ch = g[i];
    if (counts[ch] > 0) {
      res[i] = "present";
      counts[ch]--;
    } else {
      res[i] = "absent";
    }
  }
  return res;
}

function classForState(state: CellState): string {
  switch (state) {
    case "correct":
      return "bg-green-500 text-white border-green-500";
    case "present":
      return "bg-amber-500 text-white border-amber-500";
    case "absent":
      return "bg-black/20 text-white border-black/20";
    default:
      return "bg-white/80 text-black border-black/10";
  }
}

export default function WordlePage() {
  const solution = useMemo(() => pickTodayWord(), []);
  const [rows, setRows] = useState<string[]>(Array(6).fill(""));
  const [evaluations, setEvaluations] = useState<CellState[][]>([]);
  const [current, setCurrent] = useState<string>("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState<string>("");
  const [revealRow, setRevealRow] = useState<number | null>(null);
  const [winRow, setWinRow] = useState<number | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [allowed, setAllowed] = useState<Set<string> | null>(null);

  // load allowed words (cached), fallback to a small local list
  useEffect(() => {
    const key = "wordle-allowed-v1";
    const cached = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (cached) {
      try {
        const arr: string[] = JSON.parse(cached);
        setAllowed(new Set(arr.map((w) => w.toUpperCase())));
      } catch {}
    }
    const urls = [
      "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words",
      "https://raw.githubusercontent.com/tabatkins/wordle-list/main/words.txt",
    ];
    (async () => {
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const text = await res.text();
          const words = text.split(/\s+/).filter(Boolean).map((w) => w.trim().toUpperCase());
          if (words.length > 1000) {
            setAllowed(new Set(words));
            try { window.localStorage.setItem(key, JSON.stringify(words)); } catch {}
            return;
          }
        } catch {}
      }
      // fallback if fetch fails: small embedded set
      const fallback = [
        "ABOUT","OTHER","WHICH","THEIR","THERE","FIRST","WOULD","THESE","THING","POINT",
        "RIGHT","PLACE","SMALL","SOUND","GREAT","AGAIN","STILL","EVERY","FOUND","THREE",
        "UNDER","WATER","AFTER","WHERE","HOUSE","WORLD","HEART","LIGHT","NIGHT","APPLE",
        "GRAPE","MANGO","LEMON","PEACH","BERRY","STONE","CHAIR","TABLE","PLANT","CLOUD",
        "ROUTE","CRANE","SLATE","WINDY","STORM","RAINY","SUNNY"
      ];
      setAllowed(new Set(fallback));
    })();
  }, []);

  const allGuesses = [...evaluations.map((_, i) => rows[i]), status === "playing" ? current : undefined]
    .filter(Boolean) as string[];

  const keyStates = useMemo(() => {
    const map = new Map<string, CellState>();
    evaluations.forEach((evalRow, r) => {
      for (let i = 0; i < 5; i++) {
        const ch = rows[r][i];
        const st = evalRow[i];
        const prev = map.get(ch);
        const rank = { empty: 0, absent: 1, present: 2, correct: 3 } as const;
        if (!prev || rank[st] > rank[prev]) map.set(ch, st);
      }
    });
    return map;
  }, [evaluations, rows]);

  const submit = useCallback(() => {
    if (status !== "playing") return;
    if (current.length !== 5) {
      setMessage("Not enough letters");
      setShakeRow(evaluations.length);
      setTimeout(() => setShakeRow(null), 600);
      return;
    }
    const guess = current.toUpperCase();
    if (!/^[A-Z]{5}$/.test(guess)) {
      setMessage("Invalid guess");
      setShakeRow(evaluations.length);
      setTimeout(() => setShakeRow(null), 600);
      return;
    }
    if (allowed && !allowed.has(guess)) {
      setMessage("Not in word list");
      setShakeRow(evaluations.length);
      setTimeout(() => setShakeRow(null), 600);
      return;
    }
    const evalRow = evaluateGuess(solution, guess);
    const newRows = rows.slice();
    const rowIndex = evaluations.length;
    newRows[rowIndex] = guess;
    setRows(newRows);
    const newEvals = [...evaluations, evalRow];
    setEvaluations(newEvals);
    setCurrent("");
    // trigger reveal animation for this row
    setRevealRow(rowIndex);
    // clear flag after sequence finishes
    setTimeout(() => {
      setRevealRow(null);
      if (guess === solution) {
        setWinRow(rowIndex);
        setTimeout(() => setWinRow(null), 1000);
      }
    }, 5 * 140 + 400);
    if (guess === solution) {
      setStatus("won");
      setMessage("Nice! You got it.");
    } else if (newEvals.length === 6) {
      setStatus("lost");
      setMessage(`The word was ${solution}.`);
    } else {
      setMessage("");
    }
  }, [current, evaluations, rows, solution, status]);

  const onKey = useCallback((k: string) => {
    if (status !== "playing") return;
    if (k === "ENTER") {
      submit();
      return;
    }
    if (k === "BACKSPACE" || k === "DEL") {
      setCurrent((c) => c.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(k) && current.length < 5) {
      setCurrent((c) => (c + k).slice(0, 5));
    }
  }, [current.length, status, submit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === "ENTER" || key === "BACKSPACE" || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        onKey(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col">
        <main className="relative isolate mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 sm:py-14 flex-1">
          <SectionFade once threshold={0.12}>
            <header className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="meta text-fofo-blue">TOOLS • WORDLE</p>
                <h1 className="mt-1 font-semibold leading-tight tracking-tight text-3xl sm:text-4xl">
                  Wordle
                </h1>
              </div>
              <Link
                href="/tools"
                aria-label="Back to tools"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-fofo-blue text-white shadow-sm transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fofo-blue/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            </header>

            {message && (
              <div className="mb-3 text-center text-sm text-black/70">{message}</div>
            )}

            <div className="mx-auto w-full max-w-[min(92vw,24rem)]">
              {/* Board */}
              <div className="flex flex-col gap-1.5 sm:gap-2.5">
                {Array.from({ length: 6 }).map((_, r) => {
                  const isCurrentRow = r === evaluations.length && status === "playing";
                  const baseGuess = r < evaluations.length ? rows[r] : rows[r];
                  const guess = isCurrentRow ? current.toUpperCase().padEnd(5, " ") : (baseGuess || "".padEnd(5, " "));
                  const evalRowStates: CellState[] = r < evaluations.length ? evaluations[r] : Array(5).fill("empty");
                  const isRevealSequence = revealRow === r && r === evaluations.length - 1;

                  return (
                    <motion.div
                      key={`row-${r}-${guess}`}
                      className="grid grid-cols-5 gap-1.5 sm:gap-2.5"
                      initial={false}
                      animate={shakeRow === r ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      {Array.from({ length: 5 }).map((__, c) => {
                        const ch = guess[c] ?? "";
                        const st = evalRowStates[c];
                        const revealed = r < evaluations.length; // tile has evaluation assigned
                        const colorClass = revealed ? classForState(st) : "bg-white/80 text-black border-black/10";
                        const delay = isRevealSequence ? c * 0.14 : 0;
                        const pulse = winRow === r;

                        return (
                          <motion.div
                            key={`${r}-${c}-${revealed ? "rev" : "pre"}-${ch}`}
                            initial={revealed ? { rotateX: 90 } : ch.trim() ? { scale: 0.9 } : {}}
                            animate={revealed ? { rotateX: 0, scale: pulse ? [1, 1.12, 1] : 1 } : { scale: 1 }}
                            transition={revealed
                              ? {
                                  duration: 0.28,
                                  delay,
                                  scale: pulse ? { delay: 0.05 * c, duration: 0.35 } : undefined,
                                }
                              : { type: "spring", stiffness: 500, damping: 28, mass: 0.2 }}
                            className={`aspect-square rounded-md border text-center text-lg sm:text-2xl font-semibold grid place-items-center ${colorClass}`}
                            style={{ transformOrigin: "center", backfaceVisibility: "hidden" }}
                          >
                            <span>{ch}</span>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </div>

              {/* On-screen keyboard */}
              <div className="mt-6 select-none" style={{ touchAction: 'manipulation' }}>
                {[[..."QWERTYUIOP"],[..."ASDFGHJKL"],["ENTER",..."ZXCVBNM".split(""),"DEL"]].map((row, idx) => (
                  <div key={idx} className="mt-1.5 flex justify-center gap-1 sm:gap-1.5 text-sm sm:text-base">
                    {row.map((k) => {
                      const state = keyStates.get(k);
                      const color = state ? classForState(state) : "bg-white/80 text-black border-black/10";
                      const width = k.length > 1 ? "w-16 sm:w-20" : "w-8 sm:w-9";
                      return (
                        <button
                          key={k}
                          onClick={() => onKey(k)}
                          className={`h-9 sm:h-10 ${width} inline-flex items-center justify-center rounded-md border shadow-sm transition active:scale-[0.98] leading-none ${color}`}
                          aria-label={k}
                        >
                          {k}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {status !== "playing" && (
                <div className="mt-6 text-center text-black/70">See you tomorrow!</div>
              )}
            </div>
          </SectionFade>
        </main>
      </div>
    </PageTransition>
  );
}
