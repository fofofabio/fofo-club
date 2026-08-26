"""Read-only audit helper for the bank and PayPal exports.

The bank ledger is treated as the cash source of truth. PayPal rows are used to
understand merchant activity, but matching funding credits are not counted as
income. The script prints aggregate JSON and never writes source data.
"""

from __future__ import annotations

import csv
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


def money(value: str) -> float:
    value = (value or "0").strip().replace("\u00a0", "")
    if "," in value and "." in value:
        if value.rfind(",") < value.rfind("."):
            value = value.replace(",", "")
        else:
            value = value.replace(".", "").replace(",", ".")
    elif "," in value:
        value = value.replace(",", ".")
    return round(float(value), 2)


def clean_merchant(value: str) -> str:
    text = re.sub(r"\s+", " ", (value or "").strip())
    text = re.sub(r"^(PAYPAL \*|PP\*)", "", text, flags=re.I)
    return text or "Unknown"


def read_bank(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-16", newline="") as handle:
        rows = list(csv.DictReader(handle))

    parsed = []
    for row in rows:
        description = row.get("Booking details", "")
        partner = row.get("Partner Name", "")
        merchant = partner
        paypal_match = re.search(r"PAYPAL \*([^\d]{2,45}?)(?:\s{2,}|\s+\d{5,})", description, re.I)
        if paypal_match:
            merchant = paypal_match.group(1)
        if not merchant:
            merchant = description[:80] or row.get("Note", "")[:80]
        parsed.append(
            {
                "date": datetime.strptime(row["Booking Date"], "%d.%m.%Y"),
                "amount": money(row["Amount"]),
                "merchant": clean_merchant(merchant),
                "description": description,
                "note": row.get("Note", ""),
            }
        )
    return parsed


def read_paypal(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    parsed = []
    for row in rows:
        parsed.append(
            {
                "date": datetime.strptime(row["Datum"], "%m/%d/%Y"),
                "amount": money(row["Netto"]),
                "merchant": clean_merchant(row.get("Name", "")),
                "description": row.get("Beschreibung", ""),
                "linked": row.get("Zugehöriger Transaktionscode", ""),
            }
        )
    return parsed


def month_key(date: datetime) -> str:
    return date.strftime("%Y-%m")


def recurring_candidates(rows: list[dict]) -> list[dict]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        if row["amount"] < 0 and row["merchant"] != "Unknown":
            groups[row["merchant"].upper()].append(row)

    candidates = []
    for merchant, items in groups.items():
        dates = sorted({item["date"].date() for item in items})
        active_months = sorted({month_key(item["date"]) for item in items})
        if len(dates) < 3 or len(active_months) < 3:
            continue
        intervals = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]
        monthly_like = [days for days in intervals if 24 <= days <= 38]
        amounts = [abs(item["amount"]) for item in items]
        median_amount = statistics.median(amounts)
        stable = median_amount > 0 and statistics.median(
            [abs(amount - median_amount) / median_amount for amount in amounts]
        ) <= 0.15
        if len(monthly_like) >= 2 and stable:
            candidates.append(
                {
                    "merchant": merchant.title(),
                    "occurrences": len(items),
                    "months": len(active_months),
                    "medianAmount": round(median_amount, 2),
                    "lastSeen": max(dates).isoformat(),
                    "medianIntervalDays": round(statistics.median(intervals), 1),
                }
            )
    return sorted(candidates, key=lambda item: (-item["medianAmount"], item["merchant"]))


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: analyze-finance-exports.py BANK.csv PAYPAL.csv")

    bank = read_bank(Path(sys.argv[1]))
    paypal = read_paypal(Path(sys.argv[2]))
    bank_monthly: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "spend": 0.0})
    for row in bank:
        bucket = bank_monthly[month_key(row["date"])]
        if row["amount"] >= 0:
            bucket["income"] += row["amount"]
        else:
            bucket["spend"] += abs(row["amount"])

    paypal_types = Counter(row["description"] for row in paypal)
    paypal_real_spend = [
        row
        for row in paypal
        if row["amount"] < 0
        and "Gutschrift auf Kreditkarte" not in row["description"]
        and "Bankgutschrift" not in row["description"]
    ]

    bank_merchants = Counter()
    bank_income_sources = Counter()
    bank_income_dates: dict[str, list[dict]] = defaultdict(list)
    for row in bank:
        if row["amount"] < 0:
            bank_merchants[row["merchant"].upper()] += abs(row["amount"])
        elif row["amount"] > 0:
            bank_income_sources[row["merchant"].upper()] += row["amount"]
            bank_income_dates[row["merchant"].upper()].append(row)

    recurring_income = []
    for merchant, items in bank_income_dates.items():
        months = {month_key(item["date"]) for item in items}
        late_month = [item for item in items if 24 <= item["date"].day <= 31]
        if len(months) < 3 or len(late_month) < 3:
            continue
        recurring_income.append({
            "merchant": merchant.title(),
            "occurrences": len(items),
            "months": len(months),
            "medianAmount": round(statistics.median(item["amount"] for item in late_month), 2),
            "usualDays": sorted({item["date"].day for item in late_month}),
            "lastSeen": max(item["date"] for item in items).date().isoformat(),
        })

    output = {
        "bank": {
            "rows": len(bank),
            "range": [min(row["date"] for row in bank).date().isoformat(), max(row["date"] for row in bank).date().isoformat()],
            "income": round(sum(max(0, row["amount"]) for row in bank), 2),
            "spend": round(sum(abs(min(0, row["amount"])) for row in bank), 2),
            "monthly": {
                key: {name: round(value, 2) for name, value in values.items()}
                for key, values in sorted(bank_monthly.items())
            },
            "topMerchants": [
                {"merchant": merchant.title(), "spend": round(total, 2)}
                for merchant, total in bank_merchants.most_common(25)
            ],
            "topIncomeSources": [
                {"merchant": merchant.title(), "income": round(total, 2)}
                for merchant, total in bank_income_sources.most_common(20)
            ],
            "recurringIncomeCandidates": sorted(
                recurring_income,
                key=lambda item: (-item["medianAmount"], item["merchant"]),
            ),
            "recurringCandidates": recurring_candidates(bank),
        },
        "paypal": {
            "rows": len(paypal),
            "range": [min(row["date"] for row in paypal).date().isoformat(), max(row["date"] for row in paypal).date().isoformat()],
            "rawNet": round(sum(row["amount"] for row in paypal), 2),
            "purchaseSpend": round(sum(abs(row["amount"]) for row in paypal_real_spend), 2),
            "types": paypal_types.most_common(),
            "recurringCandidates": recurring_candidates(paypal_real_spend),
        },
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
