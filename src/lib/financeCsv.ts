// Browser-side reading of a bank CSV export, for the read-only export check in Finances.
// Mirrors the parsing in scripts/workspace-import-finances.mjs (CSV, dates, amounts and
// booking-reference ids). Keep the two in step if the bank's export format changes.

export type BankExportRow = {
  bookedOn: string;
  amountCents: number;
  /** The id the importer stores, or null when the row has no booking reference. */
  reference: string | null;
};

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.replace(/^﻿/, "")) ?? [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

export function parseMoneyToCents(raw: string) {
  let value = String(raw || "0").trim().replace(/\s/g, "");
  if (value.includes(",") && value.includes(".")) {
    value = value.lastIndexOf(",") < value.lastIndexOf(".")
      ? value.replaceAll(",", "")
      : value.replaceAll(".", "").replace(",", ".");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }
  return Math.round(Number(value) * 100);
}

function isoBankDate(raw: string) {
  const [day, month, year] = raw.split(".");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function clean(value: string | undefined) {
  return String(value || "").replace(/�/g, "").replace(/\s+/g, " ").trim();
}

/** Decode the export: the bank writes UTF-16 LE with a BOM; fall back to UTF-8. */
export function decodeExport(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes.length > 3 && bytes[1] === 0 && bytes[3] === 0);
  return new TextDecoder(utf16 ? "utf-16le" : "utf-8").decode(buffer);
}

export const BANK_COLUMNS = ["Booking Date", "Amount", "Booking Reference"] as const;

export function readBankExport(text: string): { rows: BankExportRow[]; missingColumns: string[] } {
  const records = parseCsv(text);
  const headers = records[0] ? Object.keys(records[0]) : [];
  const missingColumns = BANK_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length) return { rows: [], missingColumns };

  const occurrences = new Map<string, number>();
  const rows: BankExportRow[] = [];
  for (const record of records) {
    const bookedOn = isoBankDate(clean(record["Booking Date"]));
    const amountCents = parseMoneyToCents(record.Amount);
    if (!bookedOn || !Number.isFinite(amountCents)) continue;
    // Same rule as the importer: repeated references get a #n suffix, in file order.
    const raw = clean(record["Booking Reference"]);
    const seen = raw ? (occurrences.get(raw) ?? 0) : 0;
    if (raw) occurrences.set(raw, seen + 1);
    if (amountCents === 0) continue;
    rows.push({ bookedOn, amountCents, reference: raw ? `${raw}${seen ? `#${seen + 1}` : ""}` : null });
  }
  return { rows, missingColumns: [] };
}
