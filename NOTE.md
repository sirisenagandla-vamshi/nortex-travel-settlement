# Note — Nortex travel settlement take-home

## What I understood the problem to be

Nortex already has travel requests, advances, and receipts. The expensive part is the blank settlement form: 25 minutes of copying from a messy inbox, then chasing Finance. The pack is the spec. The Loom shows a polished generic reimbursement product; I used it for the workflow shape (request → approval → advance → settlement → finance → payout), not as something to clone.

## Assumptions

- The emails never issued a Travel Request ID, so the app stamps **TR-2026-0616**.
- Travel approval and the ₹20,000 advance already happened (mails 01–03). The employee lands on a **draft settlement**, which is the 25-minute hole.
- Receipt PNGs were transcribed, not OCR’d. Hotel GST is prorated so laundry/minibar tax is disallowed too.
- Approval routing uses the **reimbursable** total after policy, which still sits in the RM + HoD band.
- Demo passwords equal employee codes so a reviewer can switch roles in seconds.

## What I built

- Deterministic classification of the 15 `.eml` files (include / exclude / duplicate / noise / other person / context).
- Auto-drafted lines: four cabs, split hotel folio, Spice Terrace entertainment.
- Policy engine: lodging cap, meal cap, entertainment HoD pre-approval, non-reimbursable extras shown not omitted, 3-vs-4 night gap, 60% advance rule, approval matrix, advance netting.
- JWT roles: employee, reporting manager, HoD, finance. Approve / return / reject. Finance verify then 10th/25th-style payout.
- Unit tests on the rules a reviewer can argue with.

## What I deliberately left out

- Workflow designer, category builder, SSO, org-wide charts (the last two minutes of the Loom).
- Live Gmail, OCR, real bank credit, email notifications.
- International travel / MD path — the seeded trip does not need it.
- A second employee’s claim. One trip, fully working, is the point.

## Where it breaks

- A new email format (different Uber layout) will not parse until a rule is added. That is intentional: every line is explainable.
- Toggling lines after submit is locked; a returned claim can be edited and resubmitted against the same TR ID.
- If the reporting chain in `employee_master.csv` is incomplete, submit cannot resolve HoD.
- Amounts are integer paise. Display rounding is Indian grouping, not accounting software.
- Postgres must be running; there is no SQLite fallback.
