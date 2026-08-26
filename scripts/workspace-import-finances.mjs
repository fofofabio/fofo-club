import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

import { loadEnvLocal } from "./load-env-local.mjs";

const CATEGORIES = {
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  dining: "Dining",
  shopping: "Shopping",
  transport: "Transport",
  health: "Health",
  personalCare: "Personal Care",
  entertainment: "Entertainment",
  sports: "Sports",
  travel: "Travel",
  pets: "Pets",
  insurance: "Insurance",
  debt: "Debt",
  subscriptions: "Subscriptions",
  cash: "Cash",
  fees: "Fees",
  transfers: "Transfers",
  refunds: "Refunds",
  income: "Income",
  other: "Other",
};

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    values[argv[index]?.replace(/^--/, "")] = argv[index + 1];
  }
  if (!values.user || !values.bank || !values.paypal) {
    throw new Error(
      "Usage: node scripts/workspace-import-finances.mjs --user EMAIL --bank BANK.csv --paypal PAYPAL.csv",
    );
  }
  return values;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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

  const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "")) ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function parseMoneyToCents(raw) {
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

function isoBankDate(raw) {
  const [day, month, year] = raw.split(".");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isoPaypalDate(raw) {
  const [month, day, year] = raw.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function dateDiffDays(a, b) {
  return Math.abs((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

function plusDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function clean(value) {
  return String(value || "").replace(/\uFFFD/g, "").replace(/\s+/g, " ").trim();
}

function titleCase(value) {
  return value
    .toLocaleLowerCase("de-AT")
    .replace(/(^|[\s/+-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("de-AT"));
}

function canonicalMerchant(raw) {
  const source = clean(raw).replace(/^(PAYPAL \*|PP\*)/i, "").trim();
  const upper = source.toUpperCase();
  if (upper.includes("OPENAI") || upper.includes("CHATGPT")) return "OpenAI · ChatGPT";
  if (upper.includes("NETFLIX")) return "Netflix";
  if (upper.includes("ZWIFT")) return "Zwift";
  if (upper.includes("CRUNCHYROLL")) return "Crunchyroll";
  if (upper.includes("DISCORD")) return "Discord";
  if (upper.includes("DPLAY") || upper.includes("DISCOVERY")) return "Discovery+";
  if (upper.includes("GOOGLE ONE")) return "Google One";
  if (upper.includes("YOUTUBE")) return "YouTube Premium";
  if (upper.includes("SPUSU")) return "Spusu";
  if (upper.includes("FOODORA")) return "Foodora";
  if (upper.includes("HSREPLAY")) return "HSReplay";
  if (upper.includes("BATTLE.NET") || upper.includes("BLIZZARD") || upper.includes("GLOBAL COLLECT")) {
    return "Blizzard / World of Warcraft";
  }
  if (upper.includes("APPLE SERVICES") || upper.includes("ITUNESAPPST")) return "Apple iCloud";
  if (upper.includes("MICROSOFT PAYMENTS")) return "Microsoft";
  if (upper.includes("ONE MOBILITY")) return "One Mobility";
  if (upper.includes("ENERGIE STEIERMARK")) return "Energie Steiermark";
  if (upper.includes("OERAG")) return "OERAG";
  return titleCase(source || "Unknown").slice(0, 100);
}

const subscriptionTerms = [
  "OPENAI", "CHATGPT", "NETFLIX", "ZWIFT", "CRUNCHYROLL", "DISCORD",
  "DPLAY", "DISCOVERY", "GOOGLE ONE", "YOUTUBE", "SPUSU",
  "HSREPLAY", "BATTLE.NET", "BLIZZARD", "GLOBAL COLLECT",
  "APPLE SERVICES", "ITUNESAPPST", "MICROSOFT PAYMENTS",
];

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function classify({ merchant, details, note, reference, amountCents }) {
  const text = `${merchant} ${details} ${note} ${reference}`.toUpperCase();
  if (amountCents > 0) {
    if (includesAny(text, ["RÜCK", "RUECK", "STORNO", "REFUND", "GUTSCHRIFT"])) return CATEGORIES.refunds;
    if (includesAny(text, ["EIGENÜBERTRAG", "EIGENUEBERTRAG", "UMBUCHUNG"])) return CATEGORIES.transfers;
    return CATEGORIES.income;
  }
  if (text.includes("FOODORA") && Math.abs(amountCents) >= 950 && Math.abs(amountCents) <= 1_050) {
    return CATEGORIES.subscriptions;
  }
  if (includesAny(text, [
    "CASHPRESSO", "KÄRNTNER SPARKASSE", "KAERNTNER SPARKASSE",
    "KREDITRATE", "DARLEHEN", "KREDITRÜCKZAHLUNG", "KREDITRUECKZAHLUNG",
  ])) return CATEGORIES.debt;
  if (includesAny(text, [
    "ZURICH VERSICH", "VERSICHERUNG", "UNIQA", "GENERALI", "ALLIANZ",
  ])) return CATEGORIES.insurance;
  if (includesAny(text, [
    ...subscriptionTerms,
    "APPLE.COM/BILL", "APPLE COM BILL", "AMZNPRIME", "AMAZON PRIME",
    "WORLD4YOU", "MIDJOURNEY", "MICROSOFT", "GOOGLE ONE",
  ])) return CATEGORIES.subscriptions;
  if (includesAny(text, [
    "OERAG", "ÖRAG", "MIETE", "HAUSVERWALT", "IMMOBILIEN", "WOHNUNG",
  ])) return CATEGORIES.housing;
  if (includesAny(text, [
    "ENERGIE", "STROM", "GAS ", "WASSER", "MAGENTA", "A1 TELEKOM",
    "GIS ", "ORF-BEITRAG", "DREI.AT", "HUTCHISON DREI", "HUTCHISON DREI AUSTRIA",
  ])) return CATEGORIES.utilities;
  if (includesAny(text, [
    "SPAR ", "SPAR.", "BILLA", "HOFER", "LIDL", "PENNY", "M-PREIS", "MPREIS",
    "ADEG", "UNIMARKT", "INTERSPAR", "PANDA ASIA SHOP", "E-KIOSK", "SUPERMERCAT",
    "REFORMHAUS", "BIOBOX", "REWE ", "TGTG", "TOO GOOD TO GO", "FAIRMENT", "SP HOLY",
    "KON. COOP", "JUICEBOXTM", "AUTOMATENSHOP",
  ])) return CATEGORIES.groceries;
  if (includesAny(text, [
    "BIKE24", "ROSE BIKES", "PRO KIT CLUB", "VIENNA CITY MARATHON", "CARINTHIA200",
    "DECATHLON", "NIKE ", "MALOJA", "STRAVA", "RUNNINGGRAZ", "RUNNINGRAZ",
    "LEICHTATHLETIK", "SKILIFT", "AUSTER SPORT", "GIGASPORT", "BLUE TOMATO",
    "SSF ", "RADSERVICE", "RADAKTIV", "MOVEPRO", "LA PRIMAFIT", "AUTOMAT GARTNERKOFEL",
    "ANNA MACELA", "PB-SHOP",
  ])) return CATEGORIES.sports;
  if (includesAny(text, [
    "PARKHOTEL", "HOTEL STADT WIEN", " HOTEL ", "HOTEL ", "PENSION ", "AIRBNB",
    "BOOKING.COM",
  ])) return CATEGORIES.travel;
  if (includesAny(text, [
    "FOODORA", "DELIVERY HERO", "VELOFOOD", "WOLT", "MCDONALD", "BURGER KING",
    "RESTAUR", "CAFE", "CAFÉ", "PIZZA", "KEBAB", "LIEFERANDO", "STARBUCKS",
    "MARTIN AUER", "BAECKEREI", "BÄCKEREI", "BACKEREI", "BACKWERK", "KFC", "SUBWAY",
    "ICHIGO", "GINKO", "GLORIOUS BASTARDS", "HIMALAYA", "CASA MEXICO", "EISPERLE",
    "NOONBAR", "MUNCHNER STUBN", "MÜNCHNER STUBN", "EAT ASIA", "BOMBAY", "DISCO VOLANTE",
    "VALPIANO", "ASIA PAVILLION", "TRIBEKA", "SCHNITZELWELT", "MAX & BENITO",
    "BOWLS POTS", "WTM GASTRO", "GREENHOUSE", "LA PAUSA", "YOKOS", "NOVOSEL",
    "SURACE EISSALON", "ANKERSNACK", "SELECTA BETRIEBSVERPFL", "PETTINGER AUTOMATEN",
    "GLENN SEELAND", "KULTURHAUSKELLER", "PLATZHIRSCH AM MARKT", "MAYKAY",
    "SUMUP *MIHO", "SUMUP *HHB HAPPINESS", "SUMUP *EVA COFFEE", "LAUSUNDMAUS",
    "REST GROSSE MAUER", "EASTSIDE GRILL", "CONTINUUM", "GRUENDLALM", "GRÜNDLALM",
    "SUMUP *VONK", "JGS SNACK SHOP", "SNACK & DRINK", "SCHNEEMANN", "OKAY ", "DE* TIPPIE",
    "NYX*GRAESSLE",
  ])) return CATEGORIES.dining;
  if (includesAny(text, [
    "FELL SALON", "FELL-SALON", "FRISEUR", "BARBER", "KOSMETIK", "BIPA",
  ])) return CATEGORIES.personalCare;
  if (includesAny(text, [
    "APOTHEKE", "ARZT", "ZAHN", "KRANKEN", "PHARMA", "SANITÄT", "SANITAET",
  ])) return CATEGORIES.health;
  if (includesAny(text, [
    "STEAM", "NINTENDO", "PLAYSTATION", "RIOT GAMES", "KINO", "CINEPLEXX", "CINEMAPLEXX",
    "TICKETMASTER", "SEE TICKETS", "OETICKET", "WEEZEVENT", "CSFLOAT", "SKINPORT",
    "INSTANT GAMING", "G2A COM", "XSOLLA", "TEBEX", "GOOGLE PLAY APPS", "K4G LTD",
    "ANNEHOF", "ANNENHOF", "NONSTOPKINO", "KIZ ROYAL",
  ])) return CATEGORIES.entertainment;
  if (includesAny(text, [
    "AMAZON", "AMZN ", "ALIEXPRESS", "ALIPAY", "ZALANDO", "IKEA", "REFURBED",
    "MEDIA MARKT", "MEDIAMARKT", "H&M", "HM AT", "HM - WEEKDAY", "WEEKDAY", "C&A",
    "DM-FIL", "MÜLLER", "MUELLER", "ALTERNATE", "OBI ", "RAUCH HAUSHALTSWAREN",
    "TEDI ", "TIGER STORES", "XXXLUTZ", "BUTLERS", "ACTION ", "ZARA", "ABOUT YOU",
    "DECKERS EUROPE", "UNIQLO", "MORAWA", "LIBRO", "NIKE AT", "SIEBDRUCKVERSAND",
    "NOTHING", "MANUFACTUM", "TEMU", "WILLHABEN", "PRESS & BOOKS", "MUR DESIGN",
    "S' FACHL", "SUNNI KREATIVSTUDIO", "BLUMEN ", "FLOWERPOWER", "KITSCH BITCH",
    "HUMANA PEOPLE", "STORER HANDELS", "BFR HANDELS", "TUTTOBERNY", "TRIKOMP NEWTON",
    "GERICKE KG", "AMTMANN HANDELS", "FEUERWEHRWAGNER",
    "SP DROOL", "JOBEA", "TRAFIK WINKLER", "TABAK TRAFIK",
  ])) return CATEGORIES.shopping;
  if (includesAny(text, [
    "ÖBB", "OEBB", "OBB ", "ONE MOBILITY", "WIENER LINIEN", "HOLDING GRAZ", "GRAZ MOBIL",
    "GRAZMOBIL", "STRASSENBAHN", "UBER", "BOLT", "SHELL", "OMV", "BP ", "JET ", "AVANTI",
    "ENI ", "TURMOEL", "SPRITKONIG", "TANKSTELLE", "PARKEN", "PARCHEGGI", "ASFINAG",
    "AZM ZAPRESIC", "BRESSANONE", "ONE 536", "ONE- 536",
  ])) return CATEGORIES.transport;
  if (includesAny(text, ["TIERARZT", "TIERKLINIK", "FRESSNAPF", "ZOO & CO", "PET SHOP"])) return CATEGORIES.pets;
  if (includesAny(text, [
    "BARGELD", "GELDAUTOMAT", "ATM ", "SB-AUSZAHLUNG", "BANKOMAT", "AUTOMAT 0",
  ])) return CATEGORIES.cash;
  if (includesAny(text, [
    "KONTOFÜHR", "KONTOFUEHR", "KSV-AUSKUNFT", "ENTGELT", "GEBÜHR", "GEBUEHR",
    "SOLLZINSEN", "ABLEBENSRISIKOPROVISION", "BMI ABTEILUNG", "BMF ", "POST EC-",
    "POST 8016", "POST FA 8016", "KONTO GESCHLOSSEN",
  ])) return CATEGORIES.fees;
  if (includesAny(text, [
    "EIGENÜBERTRAG", "EIGENUEBERTRAG", "UMBUCHUNG", "SPARKONTO", "VERRECHNUNGSKONTO",
    "GEORGE-TRANSFER", "GEORGE-ÜBERWEISUNG", "GEORGE-UEBERWEISUNG", "ÜBERWEISUNG", "UEBERWEISUNG",
    "T. STRASSNIG", "T. STRAßNIG", "D. MELCHER", "DANIELA UNTERHOLZER", "MARLENE OTZELBERGER",
    "DARIO MARIA MELCHER", "MAG. BENJAMIN ZUPANCIC", "GABRIEL PETER GOLLMANN", "FABIO UNTERHOLZER",
    "PAYPAL *47702", "XIAOZHUANGDV42", "PAYPAL *X.", "RWP ", "KILIAN TRUMMER",
  ])) return CATEGORIES.transfers;
  return CATEGORIES.other;
}

function bookingLabel(row, provider) {
  const text = clean(row["Booking details"]).toUpperCase();
  if (provider === "paypal") return "PayPal purchase";
  if (text.includes("E-COMM")) return "Card purchase";
  if (row["Mandate ID"] || row["Creditor ID"]) return "Direct debit";
  if (row["Partner IBAN"]) return "Bank transfer";
  return "Account movement";
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function detectSubscriptions(transactions, dataEnd) {
  const groups = new Map();
  for (const transaction of transactions) {
    if (transaction.category !== CATEGORIES.subscriptions || transaction.amountCents >= 0) continue;
    const key = transaction.merchant === "Foodora"
      ? "foodora-pro"
      : transaction.merchant.toLocaleLowerCase("de-AT").replace(/[^a-z0-9]+/g, "-");
    const items = groups.get(key) ?? [];
    items.push(transaction);
    groups.set(key, items);
  }

  const subscriptions = [];
  for (const [key, items] of groups) {
    const dates = [...new Set(items.map((item) => item.bookedOn))].sort();
    const months = new Set(dates.map((date) => date.slice(0, 7)));
    if (dates.length < 3 || months.size < 3) continue;
    const intervals = dates.slice(1).map((date, index) => dateDiffDays(date, dates[index]));
    const monthlyIntervals = intervals.filter((days) => days >= 24 && days <= 40);
    if (monthlyIntervals.length < 2) continue;
    const amounts = items.map((item) => Math.abs(item.amountCents));
    const amountCents = median(amounts);
    const deviation = median(amounts.map((amount) => Math.abs(amount - amountCents) / Math.max(1, amountCents)));
    if (deviation > 0.2) continue;
    const interval = Math.round(median(intervals));
    const lastChargeOn = dates.at(-1);
    let nextChargeOn = plusDays(lastChargeOn, Math.min(40, Math.max(24, interval)));
    while (nextChargeOn <= dataEnd) nextChargeOn = plusDays(nextChargeOn, 30);
    const active = dateDiffDays(lastChargeOn, dataEnd) <= 75;
    subscriptions.push({
      key,
      name: items[0].merchant === "Foodora" ? "Foodora Pro" : items[0].merchant,
      amountCents,
      cadence: "monthly",
      lastChargeOn,
      nextChargeOn: active ? nextChargeOn : null,
      status: active ? "active" : "cancelled",
      confidence: dates.length >= 6 && monthlyIntervals.length >= 4 ? "high" : "medium",
      occurrences: dates.length,
    });
  }
  return subscriptions;
}

function detectedMonthlyExpenses(transactions) {
  const seeds = [
    { key: "rent-oerag", name: "Rent", match: "OERAG", category: CATEGORIES.housing },
    { key: "energy-steiermark", name: "Electricity", match: "Energie Steiermark", category: CATEGORIES.utilities },
    { key: "one-mobility", name: "Public transport pass", match: "One Mobility", category: CATEGORIES.transport },
  ];
  return seeds.flatMap((seed) => {
    const matches = transactions.filter(
      (transaction) => transaction.amountCents < 0 && transaction.merchant === seed.match,
    );
    if (matches.length < 3) return [];
    const latest = [...matches].sort((a, b) => b.bookedOn.localeCompare(a.bookedOn))[0];
    return [{ ...seed, amountCents: median(matches.map((item) => Math.abs(item.amountCents))), dueDay: Number(latest.bookedOn.slice(8, 10)) }];
  });
}

await loadEnvLocal();
const args = parseArgs(process.argv.slice(2));
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const bankText = await readFile(args.bank, "utf16le");
const paypalText = await readFile(args.paypal, "utf8");
const bankRows = parseCsv(bankText);
const paypalRows = parseCsv(paypalText);

const paypalPurchases = paypalRows
  .map((row, index) => ({
    index,
    date: isoPaypalDate(row.Datum),
    amountCents: parseMoneyToCents(row.Netto),
    merchant: canonicalMerchant(row.Name),
    description: clean(row.Beschreibung),
    used: false,
  }))
  .filter((row) => row.amountCents < 0 && /Zahlung|Handyzahlung/i.test(row.description) && !/Gutschrift|Währungsumrechnung/i.test(row.description));

const referenceOccurrences = new Map();
const transactions = bankRows.map((row, index) => {
  const bookedOn = isoBankDate(row["Booking Date"]);
  const amountCents = parseMoneyToCents(row.Amount);
  const bankTextValue = `${row["Partner Name"]} ${row["Booking details"]}`;
  const isPaypal = /PAYPAL/i.test(bankTextValue);
  const isPaypalPayLater = /SPAETER ZAHLEN|SPÄTER ZAHLEN/i.test(bankTextValue);
  let matchedPaypal = null;
  if (isPaypal && amountCents < 0) {
    const maximumMatchDays = isPaypalPayLater ? 45 : 5;
    matchedPaypal = paypalPurchases
      .filter((item) => (
        !item.used &&
        item.amountCents === amountCents &&
        Date.parse(`${item.date}T00:00:00Z`) <= Date.parse(`${bookedOn}T00:00:00Z`) &&
        dateDiffDays(item.date, bookedOn) <= maximumMatchDays &&
        (!isPaypalPayLater || !item.merchant.toUpperCase().includes("PAYPAL EUROPE"))
      ))
      .sort((a, b) => dateDiffDays(a.date, bookedOn) - dateDiffDays(b.date, bookedOn))[0] ?? null;
    if (matchedPaypal) matchedPaypal.used = true;
  }

  let merchant = matchedPaypal?.merchant ?? canonicalMerchant(row["Partner Name"]);
  if (merchant === "Unknown") {
    const paypalName = clean(row["Booking details"]).match(/PAYPAL \*([^\d]{2,45}?)(?:\s{2,}|\s+\d{5,}|$)/i)?.[1];
    merchant = canonicalMerchant(paypalName || row["Booking details"] || row.Note);
  }
  const provider = matchedPaypal ? "paypal" : "bank";
  const rawReference = clean(row["Booking Reference"]);
  const occurrence = rawReference ? (referenceOccurrences.get(rawReference) ?? 0) : 0;
  if (rawReference) referenceOccurrences.set(rawReference, occurrence + 1);
  const reference = rawReference
    ? `${rawReference}${occurrence ? `#${occurrence + 1}` : ""}`
    : createHash("sha256").update(`${bookedOn}|${amountCents}|${merchant}|${index}`).digest("hex");
  const category = classify({
    merchant,
    details: row["Booking details"],
    note: row.Note,
    reference: row["Payment Reference"],
    amountCents,
  });
  return {
    source: "bank",
    sourceReference: reference,
    bookedOn,
    merchant,
    description: bookingLabel(row, provider),
    amountCents,
    currency: clean(row.Currency) || "EUR",
    category,
    provider,
  };
}).filter((transaction) => transaction.amountCents !== 0);

const dataEnd = transactions.map((item) => item.bookedOn).sort().at(-1);
const subscriptions = detectSubscriptions(transactions, dataEnd);
const expenses = detectedMonthlyExpenses(transactions);
const sourceTotalCents = transactions.reduce((total, item) => total + item.amountCents, 0);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("begin");
  const userResult = await client.query(
    "select id, name from workspace_users where lower(email) = lower($1)",
    [args.user],
  );
  if (userResult.rowCount !== 1) throw new Error(`No unique workspace user found for ${args.user}.`);
  const userId = userResult.rows[0].id;

  // Bank exports contain statement notices and quarterly closing markers with a
  // zero amount. They are not financial movements and should not appear in the ledger.
  await client.query(
    "delete from workspace_finance_transactions where user_id = $1 and source = 'bank' and amount_cents = 0",
    [userId],
  );

  for (const item of transactions) {
    await client.query(
      `
        insert into workspace_finance_transactions
          (user_id, source, source_reference, booked_on, merchant, description, amount_cents, currency, category, provider)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (user_id, source, source_reference) do update set
          booked_on = excluded.booked_on,
          merchant = excluded.merchant,
          description = excluded.description,
          amount_cents = excluded.amount_cents,
          currency = excluded.currency,
          category = excluded.category,
          provider = excluded.provider
      `,
      [userId, item.source, item.sourceReference, item.bookedOn, item.merchant, item.description, item.amountCents, item.currency, item.category, item.provider],
    );
  }

  for (const item of subscriptions) {
    await client.query(
      `
        insert into workspace_finance_subscriptions
          (user_id, merchant_key, name, amount_cents, cadence, last_charge_on, next_charge_on, status, confidence, occurrences)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (user_id, merchant_key) do update set
          name = excluded.name,
          amount_cents = excluded.amount_cents,
          cadence = excluded.cadence,
          last_charge_on = excluded.last_charge_on,
          next_charge_on = excluded.next_charge_on,
          confidence = excluded.confidence,
          occurrences = excluded.occurrences,
          updated_at = now()
      `,
      [userId, item.key, item.name, item.amountCents, item.cadence, item.lastChargeOn, item.nextChargeOn, item.status, item.confidence, item.occurrences],
    );
  }

  for (const item of expenses) {
    await client.query(
      `
        insert into workspace_finance_monthly_expenses
          (user_id, name, amount_cents, category, due_day, import_key)
        values ($1,$2,$3,$4,$5,$6)
        on conflict (user_id, import_key) where import_key is not null do nothing
      `,
      [userId, item.name, item.amountCents, item.category, item.dueDay, item.key],
    );
  }

  const reconciliation = await client.query(
    `select count(*)::int as rows, coalesce(sum(amount_cents), 0)::bigint as total_cents
     from workspace_finance_transactions where user_id = $1 and source = 'bank'`,
    [userId],
  );
  if (Number(reconciliation.rows[0].total_cents) !== sourceTotalCents || reconciliation.rows[0].rows !== transactions.length) {
    throw new Error(
      `Reconciliation failed: source ${transactions.length}/${sourceTotalCents}, database ${reconciliation.rows[0].rows}/${reconciliation.rows[0].total_cents}`,
    );
  }
  await client.query("commit");
  console.log(JSON.stringify({
    user: userResult.rows[0].name,
    transactions: transactions.length,
    sourceTotalCents,
    paypalPurchases: paypalPurchases.length,
    paypalMatches: paypalPurchases.filter((item) => item.used).length,
    subscriptions: subscriptions.length,
    monthlyExpenses: expenses.length,
    dataEnd,
    reconciled: true,
  }, null, 2));
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
