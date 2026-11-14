"use client";

import { useState } from "react";
import { decodeExport, readBankExport, BANK_COLUMNS } from "@/lib/financeCsv";

type CheckResult = {
  fileName: string;
  rows: number;
  start: string;
  end: string;
  withReference: number;
  alreadyImported: number;
  withoutReference: number;
  ledger: { start: string | null; end: string | null; rows: number };
};

function dateLabel(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

// Read-only: the file is parsed in the browser and only its booking references are sent,
// to learn which are already in the ledger. Nothing is imported or stored.
export default function FinanceExportCheck() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function check(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { rows, missingColumns } = readBankExport(decodeExport(await file.arrayBuffer()));
      if (missingColumns.length) throw new Error(`This does not look like the bank CSV export: missing ${missingColumns.join(", ")}. Expected columns include ${BANK_COLUMNS.join(", ")}.`);
      if (!rows.length) throw new Error("No bookings found in this file.");
      const references = rows.flatMap((row) => (row.reference ? [row.reference] : []));
      const response = await fetch("/api/workspace/finance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The check failed. Try again.");
      const dates = rows.map((row) => row.bookedOn).sort();
      setResult({
        fileName: file.name,
        rows: rows.length,
        start: dates[0],
        end: dates[dates.length - 1],
        withReference: references.length,
        alreadyImported: (body.existing as string[]).length,
        withoutReference: rows.length - references.length,
        ledger: body.ledger,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  const fullHistory = result ? !result.ledger.start || result.start <= result.ledger.start : false;
  const newRows = result ? result.withReference - result.alreadyImported : 0;
  const newerThanLedger = result && result.ledger.end ? result.end > result.ledger.end : false;

  return <div className="ws-export-check">
    <p>Pick the bank CSV export to see what an import would add. The file is read in this browser and only booking references are compared with the ledger. Nothing is imported.</p>
    <label className="ws-export-pick">
      <span>{busy ? "Checking…" : "Choose bank CSV"}</span>
      <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void check(file); }} />
    </label>
    {error ? <p className="ws-export-error" role="alert">{error}</p> : null}
    {result ? <div className="ws-export-result" role="status">
      <dl>
        <div><dt>File</dt><dd>{result.fileName} · {result.rows.toLocaleString("de-AT")} bookings · {dateLabel(result.start)} – {dateLabel(result.end)}</dd></div>
        <div><dt>Ledger</dt><dd>{result.ledger.rows.toLocaleString("de-AT")} bank bookings · {dateLabel(result.ledger.start)} – {dateLabel(result.ledger.end)}</dd></div>
        <div><dt>New</dt><dd><strong>{newRows.toLocaleString("de-AT")}</strong> bookings not in the ledger yet{newerThanLedger ? `, up to ${dateLabel(result.end)}` : ""}</dd></div>
        <div><dt>Known</dt><dd>{result.alreadyImported.toLocaleString("de-AT")} already imported</dd></div>
        {result.withoutReference ? <div><dt>No ref</dt><dd>{result.withoutReference.toLocaleString("de-AT")} without a booking reference (matched by position)</dd></div> : null}
      </dl>
      {fullHistory
        ? <p className="ws-export-verdict" data-tone="ok">Full history export: the import can take this file as it is.</p>
        : <p className="ws-export-verdict" data-tone="warn">This file starts {dateLabel(result.start)}, after the ledger&apos;s first booking ({dateLabel(result.ledger.start)}). The importer checks that the file and the ledger hold the same bookings, so it would refuse a partial export. Export the full history instead{result.withoutReference ? ", also because bookings without a reference are matched by their position in the file" : ""}.</p>}
      <p className="ws-export-next">To import: <code>npm run import:finances -- --user &lt;email&gt; --bank &lt;bank.csv&gt; --paypal &lt;paypal.csv&gt; --dry-run</code>, then run it again without <code>--dry-run</code>.</p>
    </div> : null}
  </div>;
}
