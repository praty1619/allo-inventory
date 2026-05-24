# Allo Inventory — Take-Home Exercise

A Next.js inventory reservation system with race-condition-free stock holding.

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Prisma 5** + **Neon** (hosted Postgres)
- **Redis** (Upstash) — distributed locking
- **Zod** — request validation
- **Tailwind CSS** — styling

## How to Run Locally

### 1. Clone and install
\`\`\`bash
git clone <your-repo-url>
cd allo-inventory
npm install
\`\`\`

### 2. Set up environment variables
Create a `.env` file:
\`\`\`env
DATABASE_URL="postgresql://..."
REDIS_URL="rediss://..."
CRON_SECRET="your-secret"
\`\`\`

### 3. Run migrations and seed
\`\`\`bash
npx prisma migrate dev
npx prisma db seed
\`\`\`

### 4. Start the dev server
\`\`\`bash
npm run dev
\`\`\`

Visit `http://localhost:3000`

## How Expiry Works in Production

Reservations have a 10-minute window. A Vercel Cron Job hits
`/api/cron/expire` every minute. It finds all PENDING reservations
where `expiresAt < now`, marks them as RELEASED, and decrements
the reserved count on the stock — returning units to available inventory.

The cron endpoint is protected by a `CRON_SECRET` bearer token to
prevent unauthorized calls.

## Concurrency — How We Prevent Race Conditions

When two requests try to reserve the last unit simultaneously:

1. Both requests try to acquire a Redis lock using `SET NX EX`
2. Only one succeeds — the other gets a 429 (retry)
3. The winner checks stock, creates the reservation, and increments reserved count atomically in a Prisma transaction
4. The lock is released in a `finally` block so it always cleans up

This guarantees exactly one reservation succeeds for the last unit.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List products with stock per warehouse |
| GET | /api/warehouses | List warehouses |
| POST | /api/reservations | Reserve units (409 if out of stock) |
| GET | /api/reservations/:id | Get reservation details |
| POST | /api/reservations/:id/confirm | Confirm reservation (410 if expired) |
| POST | /api/reservations/:id/release | Release reservation early |
| GET | /api/cron/expire | Cron — release expired reservations |

## Trade-offs & What I'd Do Differently

- **Idempotency keys** — not implemented due to time. Would use Redis to
  store request hash → response for 24h, returning cached response on retry.
- **Quantity selector** — UI currently reserves 1 unit at a time. Would add
  a quantity input with stock validation on the frontend.
- **Optimistic UI** — stock counts don't update in real time on the product
  listing page. Would add polling or WebSockets for live updates.
- **Error boundaries** — would add proper React error boundaries for
  production resilience.

  ## How Expiry Works in Production

Reservations have a 10-minute window. A Vercel Cron Job hits
`/api/cron/expire` once daily (Vercel free tier limitation).

For production, expiry also uses **lazy cleanup** — when a user tries
to confirm an expired reservation, the API checks `expiresAt` and
auto-releases it on the spot, returning a 410. This means expired
reservations are always caught at confirm time regardless of the cron schedule.

With a paid Vercel plan, the cron would run every minute for faster cleanup.