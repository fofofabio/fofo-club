/**
 * Parses a Postgres timestamptz rendered as text ("2026-11-14 10:00:00.123456+01").
 * Chrome accepts that shape but Safari does not, so normalise it to ISO 8601 first:
 * "T" separator, at most millisecond precision and a "+01:00" style offset.
 */
export function parsePgTimestamp(value: string) {
  const iso = value
    .trim()
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
}
