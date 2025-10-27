"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import RouteSpark from "@/components/RouteSpark";

type Activity = {
  id: number;
  type: string; // "Run" | "Ride" | ...
  distance: number; // m
  moving_time: number; // s
  average_speed: number; // m/s
  start_date: string; // ISO
  map?: string | null;
};

const SHOW = 12; // ⬅️ change this to 9/12/15… to control how many are shown

function isRun(t: string) { return t === "Run" || t === "TrailRun" || t === "Workout"; }
function isRide(t: string) { return ["Ride","VirtualRide","GravelRide","EBikeRide"].includes(t); }
function labelFromType(t: string) { return isRun(t) ? "run" : isRide(t) ? "ride" : t.toLowerCase(); }

function kmLabel(meters: number) {
  const km = meters / 1000;
  return km >= 10 ? Math.round(km).toString() : km.toFixed(2).replace(/\.?0+$/,"");
}
function timeLabel(s: number) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = String(Math.floor(s%60)).padStart(2,"0");
  return h ? `${h}:${String(m).padStart(2,"0")}` : `${m}:${sec}`;
}
function paceFromMs(ms: number) {
  if (!ms) return "-:--/km";
  const mpk = 1000/(60*ms), m = Math.floor(mpk), s = String(Math.round((mpk-m)*60)).padStart(2,"0");
  return `${m}:${s}/km`;
}
function kphFromMs(ms: number) { return (ms*3.6).toFixed(1) + " km/h"; }

export default function PaceGrid({ activities }: { activities: Activity[] }) {
  const [tab, setTab] = useState<"all"|"run"|"ride">("all");

  const filtered = useMemo(() => {
    if (tab === "run")  return activities.filter(a => isRun(a.type));
    if (tab === "ride") return activities.filter(a => isRide(a.type));
    return activities;
  }, [activities, tab]);

  // monthly micro-summary (current month)
  const now = new Date();
  const thisMonth = filtered.filter(a => {
    const d = new Date(a.start_date);
    return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  });
  const totalRunKm = thisMonth.filter(a=>isRun(a.type)).reduce((s,a)=>s+a.distance,0)/1000;
  const totalRideKm = thisMonth.filter(a=>isRide(a.type)).reduce((s,a)=>s+a.distance,0)/1000;

  return (
    <div className="mt-6">
      {/* header row: title + meta + tiny credit */}
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">latest on strava</h1>
        <div className="flex items-center gap-6">
          <span className="meta text-fofo-blue hidden sm:inline">movement log — last {Math.min(SHOW, filtered.length)} sessions</span>
          <span className="meta text-black/40 hidden sm:inline">fabio unterholzer</span>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-4 flex gap-4">
        {["all","run","ride"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={clsx(
              "meta",
              t==="run"  ? "!text-fofo-blue" : t==="ride" ? "!text-fofo-pink" : "text-black/50",
              tab===t ? "opacity-100" : "opacity-60 hover:opacity-100"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* grid */}
      <section className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, SHOW).map((a) => {
          const isR = isRun(a.type);
          const isB = isRide(a.type);
          const label = labelFromType(a.type);
          const color = isR ? "text-fofo-blue" : isB ? "text-fofo-pink" : "text-black";
          const statsRight = isR ? paceFromMs(a.average_speed) : kphFromMs(a.average_speed);
          return (
            <article key={a.id} className="group">
              {/* link overlay */}
              <a
                href={`https://www.strava.com/activities/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="relative block"
                aria-label="Open activity on Strava"
              >
                <RouteSpark
                  polyline={a.map ?? null}
                  variant={isR ? "run" : "ride"}
                  className="aspect-[4/3] w-full rounded-2xl md:rounded-3xl"
                />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs opacity-0 transition-opacity group-hover:opacity-100">
                  <span className={clsx("meta rounded-full bg-white/70 px-2 py-1 backdrop-blur", isR ? "text-fofo-blue" : "!text-fofo-pink")}>
                    open in strava
                  </span>
                </span>
              </a>

              {/* caption line */}
              <div className="mt-2 flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                  <span className={clsx("meta", isR ? "text-fofo-blue" : isB ? "!text-fofo-pink" : "text-black/60")}>{label}</span>
                  <span className="text-sm text-black/70">
                    {kmLabel(a.distance)} km · {timeLabel(a.moving_time)} · {statsRight}
                  </span>
                </div>
                <span className="text-xs text-black/40">
                  {new Date(a.start_date).toLocaleDateString("de-AT")}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {/* micro-summary bar */}
      <p className="meta mt-8 text-center text-black/50">
        this month — <span className="text-fofo-blue">{Math.round(totalRunKm)} km run</span>
        {" · "}
        <span className="!text-fofo-pink">{Math.round(totalRideKm)} km ride</span>
      </p>

      {/* footer credit */}
      <p className="meta mt-2 text-center text-black/30">data via strava api — refreshed every 10 min</p>
    </div>
  );
}
