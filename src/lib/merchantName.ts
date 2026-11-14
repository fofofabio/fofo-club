// Bank and PayPal exports carry the merchant's registered company name
// ("Amazon Eu S.a R.l., Niederlassung Deutschland"). For display we drop a
// branch note and trailing legal-form words so the ledger reads like a receipt.
// Applied at read time so rows imported before the rule existed are cleaned too.

const LEGAL_FORMS = [
  "single member soci[eé]t[eé] anonyme",
  "soci[eé]t[eé] anonyme",
  "gmbh\\s*\\W?\\s*co\\.?\\s*kg",
  // Exports cut long names short: "Wiener Linien Gmbh & C".
  "gmbh\\s*&\\s*c",
  "handels\\s*gmbh",
  "(?:versicherungs-)?aktiengesellschaft",
  "s\\.?\\s?[aà]\\.?\\s?r\\.?\\s?l\\.?",
  "s\\.c\\.a\\.?",
  "et cie",
  "gmbh",
  "ag",
  "kg",
  "og",
  "e\\.\\s?u\\.",
  "se",
  "s\\.a\\.",
  "b\\.v\\.",
  "n\\.v\\.",
  "ltd\\.?",
  "limited",
  "inc\\.?",
  "llc",
  "plc",
  "payments?",
  "eu",
  "europe",
];

// A legal form at the very end, optionally after a comma ("Riot Games, Limited").
const LEGAL_TAIL = new RegExp(`,?\\s+(?:${LEGAL_FORMS.join("|")})\\s*$`, "i");
// A branch note after a comma ("…, Niederlassung Deutschland").
const BRANCH_TAIL = /,\s*(?:niederlassung|zweigniederlassung|branch)\b.*$/i;

// Card-terminal providers prefix the shop: "Sumup *eisperle Gmbh" is the shop Eisperle.
const TERMINAL_PREFIX = /^(?:sumup|sq|zettle|izettle)\s*\*\s*(?=\S)/i;

export function displayMerchant(raw: string) {
  const original = raw.trim();
  let name = original.replace(BRANCH_TAIL, "").trim();
  if (TERMINAL_PREFIX.test(name)) {
    name = name.replace(TERMINAL_PREFIX, "");
    name = name.charAt(0).toLocaleUpperCase("de-AT") + name.slice(1);
  }
  for (let i = 0; i < 6; i += 1) {
    const next = name.replace(LEGAL_TAIL, "").trim();
    if (next === name || !next) break;
    name = next;
  }
  return name || original;
}
