import RouteSpark from "@/components/RouteSpark";
import { headers } from "next/headers";
import PaceGrid from "@/components/Pacegrid";
import clsx from "clsx";

async function absUrl(path: string) {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) throw new Error("Cannot resolve host for absolute URL");
    return `${proto}://${host}${path}`;
}

function metersToKm(n: unknown) {
    const m = Number(n);
    if (!Number.isFinite(m) || m <= 0) return "0";
    const km = m / 1000;
    return km >= 10
        ? Math.round(km).toString()
        : km.toFixed(2).replace(/\.?0+$/, "");
}
function secondsToHMM(n: unknown) {
    const s = Number(n);
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60)
        .toString()
        .padStart(2, "0");
    return h ? `${h}:${m.toString().padStart(2, "0")}` : `${m}:${sec}`;
}
function paceFromMs(n: unknown) {
    const ms = Number(n);
    if (!Number.isFinite(ms) || ms <= 0) return "-:--";
    const minPerKm = 1000 / (60 * ms);
    const min = Math.floor(minPerKm);
    const sec = Math.round((minPerKm - min) * 60)
        .toString()
        .padStart(2, "0");
    return `${min}:${sec}/km`;
}

export const revalidate = 600;

export default async function FunPage() {
    const url = await absUrl("/api/strava"); // <-- await here too
    const res = await fetch(url, { cache: "no-store" });
    const { activities, error } = await res.json();

    // 2) If error or empty, show a helpful debug block instead of a blank page
    if (error || activities.length === 0) {
        return (
            <main className="page-padding">
                <p className="meta text-fofo-blue">strava</p>
                <div className="mt-2 text-sm">
                    <p>{error ? `error: ${error}` : "no activities found"}</p>
                    <p className="mt-2 opacity-60">
                        Tip: open <code>/api/strava</code> in the browser and
                        check the JSON has an
                        <code> activities: []</code> array (and that activities
                        aren’t all private).
                    </p>
                </div>
            </main>
        );
    }

    // 3) Normal render
    return (
        <main className="mx-auto max-w-5xl px-6 pb-24 fc-section-variant">
            <PaceGrid activities={activities} />
        </main>
    );
}
