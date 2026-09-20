# Nortex Travel Settlement

Take-home prototype for Nortex Industries. One real trip (Chaitanya Reddy, Bengaluru, Jun 2026) is ingested from the assignment pack, policy-checked, and sent through Manager → HoD → Finance.

**Repo:** https://github.com/sirisenagandla-vamshi/nortex-travel-settlement

## Stack

- Frontend: React, Vite, TypeScript, Tailwind, React Router
- Backend: NestJS, TypeScript, JWT
- Database: PostgreSQL (Prisma ORM)

## Prerequisites

- Node 20+
- PostgreSQL 14+ running locally

Create the database:

```sql
CREATE DATABASE nortex_reimburse;
```

If your Postgres user is not `postgres` / `postgres`, edit `backend/.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nortex_reimburse?schema=public"
JWT_SECRET="nortex-takehome-secret"
PORT=3000
```

## Run

Terminal 1 — API:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

Terminal 2 — UI:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo logins

Password is the employee code.

| Person | Email | Password | Role |
|---|---|---|---|
| Chaitanya Reddy | chaitanya.reddy@nortexindustries.com | NX-4471 | Employee |
| Suresh Iyer | suresh.iyer@nortexindustries.com | NX-2210 | Reporting Manager |
| Meera Krishnan | meera.krishnan@nortexindustries.com | NX-1108 | Head of Department |
| Ravi Menon | ravi.menon@nortexindustries.com | NX-3305 | Finance |

## Walkthrough

1. Sign in as Chaitanya. Open **Inbox** — 15 mails classified (flights excluded, laundry flagged, Uber duplicate dropped, Deepa’s cab rejected).
2. Open **Settlement**. Review auto-drafted lines and submit.
3. Switch to Suresh → **Approvals** → approve.
4. Switch to Meera → approve (claim is above ₹25,000).
5. Switch to Ravi → verify and mark paid. Net payable is reimbursable total minus the ₹20,000 advance.

## Tests

```bash
cd backend
npm test
```

Policy engine and inbox classifier are unit-tested without the database.

## Note

See [NOTE.md](NOTE.md) for problem understanding, assumptions, and what was left out.
