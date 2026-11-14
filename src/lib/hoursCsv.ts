// Builds the Hours CSV download. Semicolons and decimal commas so Excel with an
// Austrian/German locale opens it straight into columns; Google Sheets and
// Numbers detect the separator on import.

export type HoursCsvRow = { date: string; start: string; end: string; minutes: number; project: string; task: string };

const HEADER = ["Date", "Start", "End", "Hours", "Project", "Task"];

function cell(value: string) {
  // A leading = + - @ would run as a formula in Excel; prefix a quote to keep it text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function hours(minutes: number) {
  return (minutes / 60).toFixed(2).replace(".", ",");
}

export function buildHoursCsv(rows: HoursCsvRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const total = sorted.reduce((sum, row) => sum + row.minutes, 0);
  const lines = [
    HEADER.join(";"),
    ...sorted.map((row) => [row.date, row.start, row.end, hours(row.minutes), cell(row.project), cell(row.task)].join(";")),
    ["Total", "", "", hours(total), "", ""].join(";"),
  ];
  // The BOM tells Excel the file is UTF-8, so umlauts survive.
  return `﻿${lines.join("\r\n")}\r\n`;
}
