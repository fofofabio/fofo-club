# Workspace finances — product and implementation plan

## Goal

Add a private, calm finance view to `/workspace` that answers four questions
without turning personal money into an accounting application:

1. What came in and went out?
2. Where did the money go?
3. Which recurring subscriptions are still active?
4. What fixed monthly costs do I want to plan and edit?

## Feature plan

### 1. Overview

- Month-to-date income, spending, net cash flow, and savings rate.
- Expected current-month salary when the usual late-month payment has not landed yet.
- Active recurring commitment total, split between subscriptions and fixed costs.
- Comparison against the previous complete month.
- Clear “data through” date so partial months are not mistaken for complete ones.

### 2. Graphs

- Income vs spending by month, with net labels and selectable 1/3/6/12/all-month range.
- Category breakdown for the selected period with accordion transaction details.
- Daily spend rhythm for the selected month.
- Accessible text/labels alongside every visual; charts never carry meaning alone.

### 3. Subscriptions

- Recurring-merchant detection based on repeated dates and stable amounts.
- Merchant, estimated price, cadence, last payment, expected next payment, and confidence.
- Active, paused, or cancelled/ignored state can be corrected manually.
- Household commitments such as rent, energy, banking, and transit are kept out of the
  subscription list and offered as fixed monthly costs instead.

### 4. Monthly plan

- Add, edit, activate/deactivate, and delete fixed monthly expenses.
- Store name, amount, category, due day, and an optional note.
- Show the combined monthly commitment total without double-counting subscriptions.

### 5. Transaction explorer

- Search by merchant or description.
- Filter by category and selected period.
- Show date, merchant, category, source/funding path, and signed amount.
- Keep raw bank identifiers and account numbers out of the browser payload.

### 6. Categorization quality

- Classify recognizable merchants using the original bank memo, payment reference, and
  PayPal enrichment rather than the shortened display label alone.
- Keep debt, insurance, personal care, sports, travel, and pets distinct instead of
  forcing them into `Other`.
- Ignore zero-value statement notices because they are not financial movements.
- Reserve `Other` for entries that genuinely cannot be resolved after the source audit.

## UX plan

- Add **Finances** to the existing sticky Hours / Tasks rail as a true focused view.
- Keep the existing Paper & Wire language: warm paper, thick black rules, offset shadows,
  blue only for live controls, mono metadata, and a small handwritten note.
- Use a dense but readable “statement on a workbench” composition rather than generic
  rounded fintech cards.
- Put the most useful answer first: current-month state and recurring commitments.
- Use progressive disclosure: overview first, then trends, recurring costs, and the ledger.
- Mobile: cards stack, charts remain horizontally legible, and transaction rows collapse to
  merchant/date/amount with secondary metadata below.
- Every mutation has an inline busy/error/success state; destructive deletion requires a
  confirmation step.

## Data and accounting rules

- The bank export is the cash ledger and source of truth.
- PayPal is an enrichment source. Matching PayPal purchases rename otherwise opaque
  bank-funded PayPal rows, but PayPal funding credits are never treated as income.
- Money is stored as integer cents and dates as date-only values.
- Import is idempotent by source transaction reference.
- Transfers are tagged separately and excluded from spending-category charts while still
  remaining visible in the ledger.
- Import stores only fields needed by the product. IBANs, bank account numbers, email
  addresses, mandates, and full PayPal payloads are not persisted.
- All finance tables are scoped by the authenticated workspace user.

## Delivery gates

- Database migration and repeatable import succeed.
- Totals reconcile to the source bank export.
- PayPal enrichment does not change the bank-ledger total.
- TypeScript, ESLint, and production build pass.
- Signed-in browser verification covers loading, range changes, search/filter, subscription
  status editing, monthly-expense create/edit/delete, responsive layout, and no console errors.
