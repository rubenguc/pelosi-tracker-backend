# Pelosi Tracker

A Cloudflare Workers service that tracks stock trades disclosed by U.S.
politicians through the House of Representatives' Periodic Transaction
Reports (PTRs).

The service discovers new filings from the House disclosure site,
downloads and parses the corresponding PDFs, and exposes the resulting
trades through a REST API.

---

## Features

- **Automated discovery** of new PTR filings via Cron Triggers (4x/day).
- **ZIP caching** using `Last-Modified` to skip downloads when nothing changed.
- **PDF parsing** with `unpdf`, handling multi-page layouts and split cells.
- **Queue-based processing** for reliable, retryable PDF parsing.
- **Standardized API** with a consistent success/error envelope.
- **Structured logging** with Pino, level controlled per environment.
- **D1 (SQLite)** for storage, with batched writes to respect the
  100-variable limit per query.

---

## Architecture

### Overview

Three Cloudflare services work together:

- **Cron Triggers** fire the discovery step four times a day.
- **Queues** buffer one job per new filing so PDF parsing is retryable.
- **D1** stores politicians, filings, trades, and sync metadata.

### Flow

1. **Cron fires** → `discoverNewFilings()` runs.
2. **Discovery** checks the House ZIP's `Last-Modified` header. If it
   matches the cached value, the run exits early. Otherwise it
   downloads and unzips the file.
3. **XML parsing** keeps only `FilingType === 'P'` entries and matches
   them against the `politicians` table by normalized name.
4. **New filings** are inserted into D1 (idempotent) and one message
   per filing is sent to the `pdf-processing` queue.
5. **The queue consumer** downloads each PDF, extracts its text,
   parses the trades, and inserts them into D1.
6. **Each run** is recorded in `sync_runs` with its status and the
   number of new filings.


## Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Framework | Hono |
| ORM | Drizzle |
| Database | Cloudflare D1 (SQLite) |
| Queue | Cloudflare Queues |
| PDF parsing | unpdf |
| ZIP handling | fflate |
| Logging | Pino |
| Language | TypeScript |


## Local setup

### Requirements

- Node.js 20+
- npm or pnpm
- A Cloudflare account (only for production deploy)

### Install

```bash
git clone <repo-url>
cd politician-trades-sync
npm install
```

### Database
```bash
# Generate migration files from the schema
npx drizzle-kit generate

# Apply migrations to the local D1 database
npx wrangler d1 migrations apply mi-db-local --local
```

### Run
```bash
npm run dev
```
The API is available at http://localhost:8787.


## API

### Response envelope

Every response uses the same shape.

On success:

```json
{
  "ok": true,
  "data": { }
}
```

On error:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Politician not found"
  }
}
```

### Examples:

/politicians
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "S001172",
        "fullname": "Adrian Smith",
        "lastSync": "2026-09-27T14:56:53.547Z",
        "isAvailableInBot": false
      },
      {
        "id": "W000812",
        "fullname": "Ann Wagner",
        "lastSync": "2026-09-27T14:56:56.056Z",
        "isAvailableInBot": false
      },
      {
        "id": "M001232",
        "fullname": "April McClain Delaney",
        "lastSync": "2026-09-27T14:56:33.662Z",
        "isAvailableInBot": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 3,
      "total": 69,
      "totalPages": 23,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```


## How the sync works

The pipeline has two phases that run independently. Discovery runs on a
cron schedule; processing runs as jobs arrive on the queue.

### Phase 1 — Discovery

Triggered by the cron. Steps:

1. Read the cached `Last-Modified` from `sync_state`.
2. Send a `HEAD` request to the House ZIP.
3. If the header matches the cache, exit early with zero new filings.
4. Otherwise, download and unzip the ZIP.
5. Parse the XML, keeping only `FilingType === 'P'` entries.
6. Match members against the `politicians` table by normalized name.
7. Insert new filings into `filings` (idempotent via `ON CONFLICT DO NOTHING`).
8. Enqueue one job per new filing to the `pdf-processing` queue.
9. Record the run in `sync_runs` with its status and new filing count.

### Phase 2 — Processing

Triggered by the queue consumer. Steps:

1. Download the PDF from the filing URL.
2. Extract text with `unpdf`.
3. Parse the text with `parsePoliticianReport()`.
4. Insert the resulting trades into `trades` (batched to stay under
   D1's 100-variable limit per query).
5. Mark the filing as parsed.
6. Update the politician's `last_sync`.

On failure, the message is retried up to 3 times. If it still fails,
it is dropped (or sent to a Dead Letter Queue if configured).



## License

MIT — see [LICENSE](./LICENSE) for details.
