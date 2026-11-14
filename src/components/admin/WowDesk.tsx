"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Coins, Compass, Crosshair, ExternalLink, Flag, Flame, Lock, MapPin, PawPrint, RefreshCw, Shield, Sparkles, Swords, Wrench } from "lucide-react";

import {
  BUFF_RITUAL,
  ENGINEERING_GUIDE_URL,
  ENGINEERING_NOTES,
  ENGINEERING_ROUTE,
  GOLD_CRAFTS,
  GOLD_TIPS,
  LIBRARY_BOOKS_TARGET,
  MILESTONE_GOALS,
  ROTATION_NOTES,
  TALENT_STEPS,
  XP_TO_NEXT_LEVEL,
  ZONE_ROUTE,
  levelFromTotalXp,
  petFamilyFor,
  totalXp,
  type EngineeringStep,
  type Milestone,
  type TalentStep,
} from "@/data/wowHunter";
// type-only: erased at build time, so the server-only module never ships to the client
import type { WowState } from "@/lib/workspaceWow";

type Section = "overview" | "talents" | "engineering" | "zones" | "goals" | "gold";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Compass className="h-4 w-4" /> },
  { id: "talents", label: "Talents", icon: <Swords className="h-4 w-4" /> },
  { id: "engineering", label: "Engineering", icon: <Wrench className="h-4 w-4" /> },
  { id: "zones", label: "Zones", icon: <MapPin className="h-4 w-4" /> },
  { id: "goals", label: "Goals", icon: <Flag className="h-4 w-4" /> },
  { id: "gold", label: "Gold", icon: <Coins className="h-4 w-4" /> },
];

const SECTION_KEY = "fofo-wow-section-v1";
const ENGINEERING_RANKS = [
  { at: 50, label: "Journeyman" },
  { at: 150, label: "Expert" },
  { at: 200, label: "Artisan" },
  { at: 300, label: "Max" },
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

function nameFromSlug(slug: string) {
  if (!slug) return "Your hunter";
  return slug.split("-").filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------

export default function WowDesk() {
  const [state, setState] = useState<WowState | null>(null);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [section, setSection] = useState<Section>("overview");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const saved = readLocal<Section>(SECTION_KEY, "overview");
    if (SECTIONS.some((s) => s.id === saved)) setSection(saved);
    requestJson<{ state: WowState }>("/api/workspace/wow")
      .then((data) => setState(data.state))
      .catch((err: Error) => setError(err.message));
  }, []);

  const update = useCallback((mutate: (current: WowState) => WowState) => {
    setState((current) => {
      if (!current) return current;
      const next = mutate(current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        setSaveState("saving");
        requestJson<{ state: WowState }>("/api/workspace/wow", { method: "PUT", body: JSON.stringify({ state: next }) })
          .then(() => setSaveState("idle"))
          .catch(() => setSaveState("error"));
      }, 500);
      return next;
    });
  }, []);

  function choose(next: Section) {
    setSection(next);
    writeLocal(SECTION_KEY, next);
  }

  function onTabKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = SECTIONS.findIndex((s) => s.id === section);
    const target =
      event.key === "ArrowRight" ? (index + 1) % SECTIONS.length
      : event.key === "ArrowLeft" ? (index - 1 + SECTIONS.length) % SECTIONS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? SECTIONS.length - 1
      : -1;
    if (target < 0) return;
    event.preventDefault();
    const next = SECTIONS[target].id;
    choose(next);
    document.getElementById(`wow-tab-${next}`)?.focus();
  }

  if (!state) {
    return (
      <div className="wow ws-data-surface">
        <div className="wow-panel wow-loading">{error || "Summoning your hunter…"}</div>
      </div>
    );
  }

  const toggleChecked = (id: string) =>
    update((s) => ({ ...s, checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : [...s.checked, id] }));

  return (
    <div className="wow ws-data-surface">
      <Hero state={state} update={update} saveState={saveState} />

      <div className="wow-tabs" role="tablist" aria-label="WoW sections" onKeyDown={onTabKey}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            id={`wow-tab-${s.id}`}
            type="button"
            role="tab"
            className="wow-tab"
            aria-selected={section === s.id}
            aria-controls="wow-panel"
            tabIndex={section === s.id ? 0 : -1}
            onClick={() => choose(s.id)}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      <div id="wow-panel" role="tabpanel" aria-labelledby={`wow-tab-${section}`} className="wow-tabpanel">
        {section === "overview" && <Overview state={state} onJump={choose} />}
        {section === "talents" && <Talents level={state.level} />}
        {section === "engineering" && <Engineering state={state} update={update} />}
        {section === "zones" && <Zones level={state.level} />}
        {section === "goals" && <Goals state={state} update={update} toggleChecked={toggleChecked} />}
        {section === "gold" && <Gold skill={state.engineeringSkill} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero character card
// ---------------------------------------------------------------------------

function LevelRing({ level }: { level: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, level / 60);
  return (
    <div className="wow-ring" aria-label={`Level ${level} of 60`}>
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle cx="55" cy="55" r={r} className="wow-ring-track" />
        <circle
          cx="55" cy="55" r={r}
          className="wow-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform="rotate(-90 55 55)"
        />
      </svg>
      <div className="wow-ring-label">
        <span className="wow-ring-level">{level}</span>
        <span className="wow-ring-caption">level</span>
      </div>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
// When the engineering AH margins below were last checked. Update together with the figures.
const MARGINS_CHECKED_ON = "2026-11-13";
const MARGINS_STALE_DAYS = 14;

// Calendar-time levelling pace over the last two weeks of armory logouts,
// plus when the next milestone level (40, then 60) lands at that pace.
function levelPace(log: WowState["xpLog"]) {
  if (!log || log.length < 2) return null;
  const last = log[log.length - 1];
  const recent = log.filter((e) => Date.parse(last.at) - Date.parse(e.at) <= 14 * DAY_MS);
  const first = recent[0];
  const days = (Date.parse(last.at) - Date.parse(first.at)) / DAY_MS;
  const gained = last.total - first.total;
  if (days < 2 / 24 || gained <= 0) return null;
  const levelsPerDay = (levelFromTotalXp(last.total) - levelFromTotalXp(first.total)) / days;
  const target = levelFromTotalXp(last.total) < 40 ? 40 : 60;
  const remaining = totalXp(target, 0) - last.total;
  const eta = remaining > 0 ? new Date(Date.parse(last.at) + (remaining / (gained / days)) * DAY_MS) : null;
  return { levelsPerDay, target, eta };
}

function formatStamp(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// What an armory sync brought in, in plain words. Empty when nothing changed.
function syncNews(before: WowState, after: WowState): string[] {
  const news: string[] = [];
  // a first sync compares against defaults, not progress
  if (!before.syncedAt) return news;
  if (after.level > before.level) {
    const gained = after.level - before.level;
    news.push(gained === 1 ? `Ding! Level ${after.level}.` : `Ding! Level ${after.level} (+${gained}).`);
    const talents = [...new Set(TALENT_STEPS.filter((t) => t.level > before.level && t.level <= after.level).map((t) => t.talent))];
    if (talents.length) news.push(`Spend your new talent ${gained === 1 ? "point" : "points"}: ${talents.join(", ")}.`);
  }
  if (after.engineeringSkill > before.engineeringSkill) {
    news.push(`Engineering +${after.engineeringSkill - before.engineeringSkill}, now ${after.engineeringSkill}.`);
  }
  if (after.equippedRanged && before.equippedRanged && after.equippedRanged !== before.equippedRanged) {
    news.push(`New weapon equipped: ${after.equippedRanged}.`);
  }
  if (after.petName && after.petName === before.petName && after.petLevel > before.petLevel) {
    news.push(`${after.petName} reached level ${after.petLevel}.`);
  } else if (after.petName && before.petName && after.petName !== before.petName) {
    news.push(`New pet out: ${after.petName}${after.petFamily ? ` (${after.petFamily})` : ""}.`);
  }
  return news;
}

function Hero({ state, update, saveState }: { state: WowState; update: (m: (s: WowState) => WowState) => void; saveState: "idle" | "saving" | "error" }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [news, setNews] = useState<string[]>([]);
  const autoSynced = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const inFlight = useRef(false);

  const sync = useCallback(async (quiet = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);
    if (!quiet) setSyncMessage(null);
    try {
      const before = stateRef.current;
      const data = await requestJson<{ state: WowState }>("/api/workspace/wow/sync", { method: "POST" });
      update(() => data.state);
      const fresh = syncNews(before, data.state);
      // a quiet sync with nothing new keeps whatever banner is already up
      if (fresh.length || !quiet) setNews(fresh);
      setSyncMessage({ text: "Synced from the armory", error: false });
    } catch (err) {
      if (!quiet) setSyncMessage({ text: err instanceof Error ? err.message : "Sync failed", error: true });
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [update]);

  // Refresh quietly on open if the last sync is more than an hour old.
  useEffect(() => {
    if (autoSynced.current || !state.characterSlug) return;
    autoSynced.current = true;
    const age = state.syncedAt ? Date.now() - new Date(state.syncedAt).getTime() : Infinity;
    if (age > 60 * 60 * 1000) void sync(true);
  }, [state.characterSlug, state.syncedAt, sync]);

  // Coming back to the browser after logging out of the game picks up the new
  // armory snapshot; at most once per 10 minutes.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const { characterSlug, syncedAt } = stateRef.current;
      if (!characterSlug) return;
      const age = syncedAt ? Date.now() - new Date(syncedAt).getTime() : Infinity;
      if (age > 10 * 60 * 1000) void sync(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sync]);

  const ticks = useMemo(() => [...new Set([10, 20, 30, 40, 50, 60])], []);
  const nextGate = MILESTONE_GOALS.filter((m) => m.level && m.level > state.level && !goalDone(m, state)).sort((a, b) => (a.level ?? 0) - (b.level ?? 0))[0];
  const xpNeed = XP_TO_NEXT_LEVEL[state.level];
  // only trust the armory XP while it belongs to the level shown
  const xp = xpNeed && state.experienceLevel === state.level && state.experience > 0
    ? { have: state.experience, need: xpNeed, share: Math.min(0.999, state.experience / xpNeed) }
    : null;
  const pace = useMemo(() => levelPace(state.xpLog), [state.xpLog]);

  return (
    <section className="wow-hero">
      <div className="wow-hero-glow" aria-hidden="true" />
      <div className="wow-hero-main">
        <LevelRing level={state.level} />
        <div className="wow-hero-id">
          <p className="wow-eyebrow">WoW Forever · EU · Horde</p>
          <p className="wow-hero-name">{nameFromSlug(state.characterSlug)}</p>
          <p className="wow-hero-sub">
            Troll Hunter · Beast Mastery
            {state.guild && <span className="wow-guild">&lt;{state.guild}&gt;</span>}
          </p>
          <div className="wow-chips">
            {state.equippedRanged && <span className="wow-chip wow-chip-item"><Crosshair className="h-3.5 w-3.5" />{state.equippedRanged}</span>}
            {state.petName && (
              <span className="wow-chip wow-chip-pet" title={state.petLevel && state.petLevel < state.level ? "Your pet is behind you — it gains XP faster while lower level." : undefined}>
                <PawPrint className="h-3.5 w-3.5" />{state.petName}
                <span className="wow-muted">{[state.petFamily, state.petLevel ? `lv ${state.petLevel}` : ""].filter(Boolean).join(" · ")}</span>
              </span>
            )}
            <span className="wow-chip"><Wrench className="h-3.5 w-3.5" />Engineering {state.engineeringSkill}/300</span>
            <span className="wow-chip"><Swords className="h-3.5 w-3.5" />{Math.max(0, state.level - 9)} talent points</span>
            {state.itemLevel > 0 && <span className="wow-chip"><Shield className="h-3.5 w-3.5" />Item level {state.itemLevel}</span>}
          </div>
        </div>
        <div className="wow-hero-sync">
          <button type="button" className="wow-sync-button" onClick={() => sync()} disabled={syncing || !state.characterSlug}>
            <RefreshCw className={syncing ? "h-4 w-4 wow-spin" : "h-4 w-4"} />
            {syncing ? "Syncing…" : "Sync armory"}
          </button>
          <p className={syncMessage?.error ? "wow-sync-note wow-sync-error" : "wow-sync-note"}>
            {syncMessage?.text ?? (state.lastLogin
              ? `Armory as of logout ${formatStamp(state.lastLogin)}`
              : state.syncedAt
                ? `Last sync ${formatStamp(state.syncedAt)}`
                : state.characterSlug ? "Not synced yet" : "Set your character below")}
            {saveState === "saving" && " · saving…"}
            {saveState === "error" && " · save failed"}
          </p>
          <details className="wow-settings">
            <summary>Character settings</summary>
            <div className="wow-settings-body">
              <label className="wow-field">
                <span>Armory name</span>
                <input
                  type="text"
                  value={state.characterSlug}
                  placeholder="name-surname"
                  spellCheck={false}
                  onChange={(e) => { const characterSlug = e.target.value.toLowerCase(); update((s) => ({ ...s, characterSlug })); }}
                />
              </label>
              <label className="wow-field">
                <span>Level</span>
                <NumberInput value={state.level} min={1} max={60} onChange={(level) => update((s) => ({ ...s, level }))} />
              </label>
              <p className="wow-hint">The armory updates on logout, so a fresh ding can lag behind. Override it here.</p>
            </div>
          </details>
        </div>
      </div>

      {news.length > 0 && (
        <div className="wow-news" role="status">
          <Sparkles className="h-4 w-4" />
          <ul>{news.map((n) => <li key={n}>{n}</li>)}</ul>
          <button type="button" onClick={() => setNews([])} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="wow-track" aria-hidden="true">
        <div className="wow-track-bar"><div className="wow-track-fill" style={{ width: `${(Math.min(60, state.level + (xp?.share ?? 0)) / 60) * 100}%` }} /></div>
        <div className="wow-track-ticks">
          {ticks.map((t) => (
            <span key={t} className={t <= state.level ? "wow-tick wow-tick-done" : "wow-tick"} style={{ left: `${(t / 60) * 100}%` }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="wow-hero-foot">
        {nextGate && (
          <p className="wow-hero-next"><Sparkles className="h-4 w-4" />Level {nextGate.level}: {nextGate.label}<span className="wow-muted"> · {nextGate.level! - state.level} to go</span></p>
        )}
        {xp && (
          <p className="wow-hero-xp" title="Measured at your last logout, against the Classic XP table">
            <b>{Math.floor(xp.share * 100)}%</b> to level {state.level + 1}
            <span className="wow-muted"> · {xp.have.toLocaleString("en-GB")} / {xp.need.toLocaleString("en-GB")} XP</span>
            {pace && (
              <span className="wow-pace" title={`Based on ${state.xpLog.length} armory logouts, counting calendar days rather than played time`}>
                {" · "}~{pace.levelsPerDay >= 1 ? pace.levelsPerDay.toFixed(1) : pace.levelsPerDay.toFixed(2)} levels/day
                {pace.eta && <> · level {pace.target} around {pace.eta.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>}
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n)) { setDraft(String(value)); return; }
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function nextTalent(level: number): TalentStep | null {
  return TALENT_STEPS.find((s) => s.level === level + 1) ?? null;
}

function currentEngineeringStep(skill: number) {
  return ENGINEERING_ROUTE.find((s) => skill < s.to) ?? null;
}

function currentZone(level: number) {
  const matches = ZONE_ROUTE.filter((z) => level >= z.from && level < z.to);
  return matches[matches.length - 1] ?? (level >= 60 ? ZONE_ROUTE[ZONE_ROUTE.length - 1] : ZONE_ROUTE[0]);
}

function Overview({ state, onJump }: { state: WowState; onJump: (s: Section) => void }) {
  const talent = nextTalent(state.level);
  const eng = currentEngineeringStep(state.engineeringSkill);
  const zone = currentZone(state.level);
  const goal = MILESTONE_GOALS
    .filter((m) => !goalDone(m, state))
    .sort((a, b) => (a.level ?? state.level) - (b.level ?? state.level))[0];

  return (
    <>
      <div className="wow-now">
        <NowTile label={`At level ${state.level + 1}`} icon={<Swords className="h-4 w-4" />} onClick={() => onJump("talents")}
          title={talent ? `${talent.talent}` : "Build complete"}
          sub={talent ? `${talent.phase} · rank ${talent.rank}/${talent.maxRank}` : "All 51 points placed."} />
        <NowTile label={`Engineering ${state.engineeringSkill}`} icon={<Wrench className="h-4 w-4" />} onClick={() => onJump("engineering")}
          title={eng ? eng.craft : "Engineering maxed"}
          sub={eng ? `${eng.from}–${eng.to} · ${eng.count}× · ${eng.mats}` : "Go make some Rocket Boots."} />
        <NowTile label="Quest here" icon={<MapPin className="h-4 w-4" />} onClick={() => onJump("zones")}
          title={zone.zones}
          sub={zone.note || `Levels ${zone.from}–${zone.to}`} />
        <NowTile label={goal?.level ? `Goal · level ${goal.level}` : "Goal"} icon={<Flag className="h-4 w-4" />} onClick={() => onJump("goals")}
          title={goal ? goal.label : "Every goal done"}
          sub={goal ? goal.detail : "Time to write new ones."} />
      </div>

      <div className="wow-grid-2">
        <div className="wow-stack">
          <Ritual />
          {state.petName && <PetPanel state={state} />}
        </div>
        <section className="wow-panel">
          <PanelHead icon={<Crosshair className="h-4 w-4" />} title="Rotation cheat sheet" />
          <ul className="wow-bullets">
            {ROTATION_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}

function PetPanel({ state }: { state: WowState }) {
  const family = petFamilyFor(state.petFamily);
  const behind = state.petLevel > 0 ? state.level - state.petLevel : 0;
  return (
    <section className="wow-panel">
      <PanelHead icon={<PawPrint className="h-4 w-4" />} title="Your pet" aside={state.petLevel ? `lv ${state.petLevel}` : undefined} />
      <p className="wow-pet-name">
        {state.petName}
        <span className="wow-muted"> · {state.petFamily}{family && family.family !== state.petFamily ? ` (${family.family})` : ""}</span>
      </p>
      {family ? (
        <dl className="wow-pet-facts">
          <div><dt>Eats</dt><dd>{family.diet.join(", ")}</dd></div>
          <div><dt>Learns</dt><dd>{family.abilities.join(", ")}</dd></div>
          {family.note && <div><dt>Notes</dt><dd>{family.note}</dd></div>}
        </dl>
      ) : (
        <p className="wow-lede">Unknown family for this creature; check its beast lore before feeding.</p>
      )}
      <p className={behind > 0 ? "wow-pet-status is-behind" : "wow-pet-status"}>
        {behind > 0
          ? `${behind} level${behind === 1 ? "" : "s"} behind you. Pets earn XP faster while below your level, so keep ${state.petName} out and fed.`
          : `Level with you. Feed ${state.petName} to keep it happy: an unhappy pet deals less damage.`}
      </p>
    </section>
  );
}

function NowTile({ label, title, sub, icon, onClick }: { label: string; title: string; sub: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="wow-now-tile" onClick={onClick}>
      <span className="wow-now-label">{icon}{label}</span>
      <span className="wow-now-title">{title}</span>
      <span className="wow-now-sub">{sub}</span>
    </button>
  );
}

function PanelHead({ icon, title, aside }: { icon: React.ReactNode; title: string; aside?: React.ReactNode }) {
  return (
    <div className="wow-panel-head">
      <span className="wow-panel-icon">{icon}</span>
      <h3 className="wow-panel-title">{title}</h3>
      {aside && <span className="wow-panel-aside">{aside}</span>}
    </div>
  );
}

function Ritual() {
  const key = `fofo-wow-ritual-${todayKey()}`;
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(readLocal<string[]>(key, [])), [key]);
  function toggle(id: string) {
    setDone((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      writeLocal(key, next);
      return next;
    });
  }
  return (
    <section className="wow-panel">
      <PanelHead icon={<Flame className="h-4 w-4" />} title="Before you pull" aside={`${done.length}/${BUFF_RITUAL.length} · resets daily`} />
      <ul className="wow-checklist">
        {BUFF_RITUAL.map((item) => (
          <CheckRow key={item.id} checked={done.includes(item.id)} onToggle={() => toggle(item.id)} label={item.label} detail={item.detail} />
        ))}
      </ul>
    </section>
  );
}

function goalDone(g: Milestone, state: WowState) {
  return state.checked.includes(g.id) || isAutoDone(g, state);
}

function isAutoDone(g: Milestone, state: WowState) {
  return g.autoSkill !== undefined && state.engineeringSkill >= g.autoSkill;
}

function CheckRow({ checked, onToggle, label, detail, locked, meta, auto, children }: { checked: boolean; onToggle: () => void; label: string; detail?: string; locked?: boolean; meta?: string; auto?: boolean; children?: React.ReactNode }) {
  return (
    <li className={`wow-check ${checked ? "is-done" : ""} ${locked ? "is-locked" : ""}`}>
      <button type="button" className="wow-check-box" aria-pressed={checked} disabled={auto} title={auto ? "Done automatically from your armory data" : undefined} aria-label={auto ? `${label} done automatically` : checked ? `Unmark ${label}` : `Mark ${label} done`} onClick={onToggle}>
        {checked ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : null}
      </button>
      <div className="wow-check-body">
        <p className="wow-check-label">{label}{meta && <span className="wow-check-meta">{meta}</span>}</p>
        {detail && !checked && <p className="wow-check-detail">{detail}</p>}
        {children}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Talents: read-only plan driven by level
// ---------------------------------------------------------------------------

type TalentGroup = { talent: string; from: number; to: number; points: number; note?: string };

function groupTalents(steps: TalentStep[]): TalentGroup[] {
  const groups: TalentGroup[] = [];
  for (const step of steps) {
    const last = groups[groups.length - 1];
    if (last && last.talent === step.talent && last.to === step.level - 1) {
      last.to = step.level;
      last.points += 1;
    } else {
      groups.push({ talent: step.talent, from: step.level, to: step.level, points: 1, note: step.note });
    }
  }
  return groups;
}

const TALENT_PHASES = ["Foundations", "Pet Power & Bestial Wrath", "Marksmanship"] as const;

function Talents({ level }: { level: number }) {
  const spent = Math.max(0, Math.min(51, level - 9));

  return (
    <section className="wow-panel">
      <PanelHead icon={<Swords className="h-4 w-4" />} title="Talent plan · 31 BM / 20 MM" aside={`${spent}/51 points spent at level ${level}`} />
      <p className="wow-lede">You get one point per level from 10. The highlighted row is where your next point goes. The build follows Method&apos;s Forever hunter leveling guide.</p>
      <div className="wow-phases">
        {TALENT_PHASES.map((phase) => {
          const steps = TALENT_STEPS.filter((s) => s.phase === phase);
          const groups = groupTalents(steps);
          const first = steps[0].level;
          const last = steps[steps.length - 1].level;
          const phaseDone = level >= last;
          const rows = (
            <ol className="wow-talents">
              {groups.map((g) => {
                const status = level >= g.to ? "done" : level + 1 >= g.from ? "next" : "todo";
                const have = Math.max(0, Math.min(g.points, level - g.from + 1));
                return (
                  <li key={`${g.talent}-${g.from}`} className={`wow-talent is-${status}`}>
                    <span className="wow-talent-level">{g.from === g.to ? g.from : `${g.from}–${g.to}`}</span>
                    <span className="wow-talent-name">
                      {g.talent}
                      {status === "next" && <span className="wow-talent-next">Next point at level {level + 1}</span>}
                      {g.note && status !== "done" && <span className="wow-talent-note">{g.note}</span>}
                    </span>
                    <span className="wow-talent-rank">
                      {status === "done" ? <Check className="h-3.5 w-3.5" /> : status === "next" ? `${have}/${g.points}` : `${g.points} pt${g.points > 1 ? "s" : ""}`}
                    </span>
                  </li>
                );
              })}
            </ol>
          );
          return (
            <div key={phase} className={`wow-phase ${phaseDone ? "is-done" : ""}`}>
              {phaseDone ? (
                <details>
                  <summary className="wow-phase-title">
                    <Check className="h-4 w-4" />{phase}<span className="wow-muted"> · lv {first}–{last} · learned</span>
                  </summary>
                  {rows}
                </details>
              ) : (
                <>
                  <p className="wow-phase-title">{phase}<span className="wow-muted"> · lv {first}–{last}</span></p>
                  {rows}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Engineering
// ---------------------------------------------------------------------------

function Engineering({ state, update }: { state: WowState; update: (m: (s: WowState) => WowState) => void }) {
  const skill = state.engineeringSkill;
  const current = currentEngineeringStep(skill);
  const doneSteps = ENGINEERING_ROUTE.filter((s) => skill >= s.to).length;
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="wow-stack">
      <section className="wow-panel">
        <PanelHead icon={<Wrench className="h-4 w-4" />} title="Engineering 1–300"
          aside={<a className="wow-link" href={ENGINEERING_GUIDE_URL} target="_blank" rel="noreferrer">Full guide <ExternalLink className="h-3.5 w-3.5" /></a>} />
        <div className="wow-skill">
          <div className="wow-skill-top">
            <span className="wow-skill-value">{skill}<span className="wow-muted"> / 300</span></span>
            <label className="wow-field wow-field-inline">
              <span>Adjust</span>
              <NumberInput value={skill} min={0} max={300} onChange={(engineeringSkill) => update((s) => ({ ...s, engineeringSkill }))} />
            </label>
          </div>
          <div className="wow-skill-bar"><div className="wow-skill-fill" style={{ width: `${(skill / 300) * 100}%` }} /></div>
          <div className="wow-skill-marks">
            {ENGINEERING_RANKS.map((r) => (
              <span key={r.at} className={skill >= r.at ? "wow-mark is-done" : "wow-mark"} style={{ left: `${(r.at / 300) * 100}%` }}>{r.label}<b>{r.at}</b></span>
            ))}
          </div>
        </div>

        {current && (
          <div className="wow-current-craft">
            <p className="wow-eyebrow">Craft now · {current.from}–{current.to}</p>
            <p className="wow-current-title">{current.count}× {current.craft}</p>
            <p className="wow-current-mats">{current.mats}</p>
            {current.note && <p className="wow-current-note">{current.note}</p>}
            <div className="wow-step-progress">
              <div className="wow-step-bar"><div style={{ width: `${Math.max(0, Math.min(1, (skill - current.from) / (current.to - current.from))) * 100}%` }} /></div>
              <span>{current.to - skill} skill to {current.to}</span>
            </div>
          </div>
        )}
      </section>

      <section className="wow-panel">
        <PanelHead icon={<Flag className="h-4 w-4" />} title="Route" aside={`${doneSteps}/${ENGINEERING_ROUTE.length} steps`} />
        {doneSteps > 0 && (
          <button type="button" className="wow-fold" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <Check className="h-4 w-4" />
            {doneSteps} steps done (1–{ENGINEERING_ROUTE[doneSteps - 1].to})
            <span>{showDone ? "hide" : "show"}</span>
          </button>
        )}
        <ol className="wow-route">
          {ENGINEERING_ROUTE.map((step) => {
            const status = skill >= step.to ? "done" : step === current ? "next" : "todo";
            if (status === "done" && !showDone) return null;
            return (
              <li key={`${step.from}-${step.craft}`} className={`wow-route-row is-${status}`}>
                <span className="wow-route-range">{step.from}–{step.to}</span>
                <span className="wow-route-craft">
                  <b>{step.count}× {step.craft}</b>
                  <span>{step.mats}</span>
                </span>
                <span className="wow-route-note">{status === "done" ? <Check className="h-4 w-4" /> : step.note}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {skill < 300 && <ShoppingList skill={skill} />}

      <section className="wow-panel">
        <PanelHead icon={<Sparkles className="h-4 w-4" />} title="Worth knowing" />
        <ul className="wow-bullets">{ENGINEERING_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>
    </div>
  );
}

// Parts the route itself produces in earlier steps; they never go on the shopping list.
const CRAFTED_PARTS = /^(Bolts|Rough Powder|Coarse Powder|Heavy Powder|Solid Powder|Bronze Tube|Gizmo|Framework|Casing|Trigger)$/;

type Mat = { name: string; qty: number };

function rawMats(step: EngineeringStep, share: number): Mat[] {
  return step.mats
    .split(/[,·]/)
    .map((part) => part.trim().match(/^(\d+)\s+(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null && !CRAFTED_PARTS.test(m[2]))
    .map((m) => ({ name: m[2], qty: Math.ceil(Number(m[1]) * share) }));
}

function shoppingList(skill: number, target: number): Mat[] {
  const totals = new Map<string, number>();
  for (const step of ENGINEERING_ROUTE) {
    if (step.to <= skill || step.from >= target) continue;
    const span = step.to - step.from;
    const share = span > 0 ? (Math.min(step.to, target) - Math.max(step.from, skill)) / span : 1;
    for (const mat of rawMats(step, share)) totals.set(mat.name, (totals.get(mat.name) ?? 0) + mat.qty);
  }
  return [...totals].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
}

function ShoppingList({ skill }: { skill: number }) {
  const targets = [200, 300].filter((t) => t > skill);
  const [picked, setPicked] = useState(targets[0]);
  const target = targets.includes(picked) ? picked : targets[0];
  const mats = useMemo(() => shoppingList(skill, target), [skill, target]);
  const mined = mats.filter((m) => /Bar|Stone/.test(m.name));
  const other = mats.filter((m) => !/Bar|Stone/.test(m.name));

  return (
    <section className="wow-panel">
      <PanelHead icon={<Coins className="h-4 w-4" />} title="Shopping list"
        aside={targets.length > 1 ? (
          <span className="wow-seg" role="group" aria-label="Target skill">
            {targets.map((t) => (
              <button key={t} type="button" aria-pressed={t === target} onClick={() => setPicked(t)}>{t === 200 ? "To 200" : "To 300"}</button>
            ))}
          </span>
        ) : `${skill} → ${target}`} />
      <p className="wow-lede">Raw materials from {skill} to {target}. Parts the route crafts along the way (bolts, powders, gizmos, casings) are left out.</p>
      <div className="wow-mats">
        {[{ title: "Mine & smelt", items: mined }, { title: "Buy or farm", items: other }].map((col) => col.items.length > 0 && (
          <div key={col.title}>
            <p className="wow-eyebrow">{col.title}</p>
            <ul>{col.items.map((m) => <li key={m.name}><b>{m.qty}</b> {m.name}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="wow-source">Bronze: 1 Copper Bar + 1 Tin Bar makes 2. Steel: 1 Iron Bar + 1 Coal (Mining 165). Other bars smelt 1:1 from ore.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

function Zones({ level }: { level: number }) {
  const here = currentZone(level);
  return (
    <section className="wow-panel">
      <PanelHead icon={<MapPin className="h-4 w-4" />} title="Horde zone route" aside="25–60" />
      <p className="wow-lede">The standard Horde path. Forever retunes some zones, so treat it as a compass, not rails.</p>
      <ol className="wow-timeline">
        {ZONE_ROUTE.map((z) => {
          const status = z === here ? "here" : level >= z.to ? "done" : "todo";
          return (
            <li key={z.zones} className={`wow-stop is-${status}`}>
              <span className="wow-stop-dot" aria-hidden="true" />
              <div>
                <p className="wow-stop-range">Level {z.from}–{z.to}{status === "here" && <span className="wow-here">You are here</span>}</p>
                <p className="wow-stop-zones">{z.zones}</p>
                {z.note && <p className="wow-stop-note">{z.note}</p>}
                {z.dungeons && z.dungeons.length > 0 && (
                  <p className="wow-stop-dungeons"><span>Dungeons</span>{" "}{z.dungeons.join(" · ")}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function Goals({ state, update, toggleChecked }: { state: WowState; update: (m: (s: WowState) => WowState) => void; toggleChecked: (id: string) => void }) {
  const sorted = [...MILESTONE_GOALS].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const isDone = (g: Milestone) => goalDone(g, state);
  const done = sorted.filter(isDone).length;
  const available = sorted.filter((g) => !isDone(g) && (g.level === null || g.level <= state.level));
  const upcoming = sorted.filter((g) => !isDone(g) && g.level !== null && g.level > state.level);
  const finished = sorted.filter(isDone);

  const renderGoal = (g: Milestone, locked = false) => {
    const auto = isAutoDone(g, state);
    return (
    <CheckRow key={g.id} checked={isDone(g)} auto={auto} onToggle={() => toggleChecked(g.id)} label={g.label} detail={g.detail} locked={locked} meta={auto ? `auto · skill ${state.engineeringSkill}` : g.level ? `lv ${g.level}` : undefined}>
      {g.steps && !isDone(g) && (
        <ul className="wow-substeps">
          {g.steps.map((step) => {
            const key = `${g.id}:${step.id}`;
            const on = state.checked.includes(key);
            return (
              <li key={key}>
                <button type="button" className={on ? "is-on" : ""} aria-pressed={on} onClick={() => toggleChecked(key)}>
                  <span aria-hidden="true">{on && <Check className="h-3 w-3" />}</span>
                  {step.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {g.id === "truthseeker" && !isDone(g) && (
        <div className="wow-books">
          <BookOpen className="h-4 w-4" />
          <div className="wow-books-bar"><div style={{ width: `${(state.libraryBooks / LIBRARY_BOOKS_TARGET) * 100}%` }} /></div>
          <label className="wow-field wow-field-inline">
            <NumberInput value={state.libraryBooks} min={0} max={LIBRARY_BOOKS_TARGET} onChange={(libraryBooks) => update((s) => ({ ...s, libraryBooks }))} />
            <span>/ {LIBRARY_BOOKS_TARGET} books</span>
          </label>
        </div>
      )}
    </CheckRow>
    );
  };

  return (
    <div className="wow-grid-2">
      <section className="wow-panel">
        <PanelHead icon={<Flag className="h-4 w-4" />} title="Do these now" aside={`${done}/${sorted.length} done`} />
        {available.length ? <ul className="wow-checklist">{available.map((g) => renderGoal(g))}</ul> : <p className="wow-empty">Nothing open at your level. Go level up.</p>}
      </section>
      <div className="wow-stack">
        <section className="wow-panel">
          <PanelHead icon={<Lock className="h-4 w-4" />} title="Coming up" />
          <ul className="wow-checklist">{upcoming.map((g) => renderGoal(g, true))}</ul>
        </section>
        {finished.length > 0 && (
          <section className="wow-panel">
            <PanelHead icon={<Check className="h-4 w-4" />} title="Done" />
            <ul className="wow-checklist">{finished.map((g) => renderGoal(g))}</ul>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gold
// ---------------------------------------------------------------------------

function Gold({ skill }: { skill: number }) {
  const verdictLabel = { sell: "Sell", later: "Later", skip: "Skip" } as const;
  return (
    <div className="wow-stack">
      <section className="wow-panel">
        <PanelHead icon={<Coins className="h-4 w-4" />} title="Engineering crafts for gold" aside={`your skill: ${skill}`} />
        <MarginsAge />
        <ul className="wow-crafts">
          {GOLD_CRAFTS.map((c) => {
            const canCraft = skill >= c.skill && c.verdict !== "skip";
            const verdict = c.verdict === "later" && canCraft ? "sell" : c.verdict;
            const gap = c.skill - skill;
            return (
              <li key={c.name} className={`wow-craft is-${verdict}`}>
                <span className={`wow-badge is-${verdict}`}>{verdictLabel[verdict]}</span>
                <div className="wow-craft-body">
                  <p className="wow-craft-name">
                    {c.name}
                    <span className="wow-check-meta">skill {c.skill}</span>
                    {canCraft && <span className="wow-ready">You can craft this</span>}
                    {verdict === "later" && <span className="wow-gap">{`${gap} skill to go`}</span>}
                  </p>
                  <p className="wow-check-detail">{c.detail}</p>
                </div>
                <span className="wow-craft-profit">{c.profit}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="wow-panel">
        <PanelHead icon={<Sparkles className="h-4 w-4" />} title="Hunter gold habits" />
        <div className="wow-tips">
          {GOLD_TIPS.map((t) => (
            <div key={t.title} className="wow-tip">
              <p className="wow-tip-title">{t.title}</p>
              <p className="wow-check-detail">{t.detail}</p>
            </div>
          ))}
        </div>
        <p className="wow-source">Sources: timesaver.gg engineering gold analysis (13 Nov) and warcraftmaps.com hunter gold farming (11 Nov).</p>
      </section>
    </div>
  );
}

function MarginsAge() {
  // Read the clock after mount so server and client render the same text.
  const [ageDays, setAgeDays] = useState<number | null>(null);
  useEffect(() => {
    setAgeDays(Math.floor((Date.now() - Date.parse(`${MARGINS_CHECKED_ON}T12:00:00`)) / DAY_MS));
  }, []);
  const checked = new Date(`${MARGINS_CHECKED_ON}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const stale = ageDays !== null && ageDays > MARGINS_STALE_DAYS;
  return <p className="wow-lede">
    Rough AH margins from {checked} (EU where known). Prices move, so check the AH before crafting a stack.
    {stale ? <strong className="wow-stale"> These figures are {Math.floor(ageDays / 7)} weeks old, so treat them as a starting point only.</strong> : null}
  </p>;
}
