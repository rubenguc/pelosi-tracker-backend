# Pelosi Tracker

This repository contains an automated tracking system for financial transactions made by US politicians (e.g., Nancy Pelosi, Donald Trump).
The system synchronizes data via a scheduled Cron Job, stores transactions in a Cloudflare D1 database, and dispatches real-time alerts through a Telegram Bot and a REST API for the frontend.

## 🌐 External Data Sources & URL Patterns
House Clerk Financial Disclosures Index
- Index ZIP Endpoint: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YYYY}FD.zip

- Internal XML File Name: {YYYY}FD.xml (extracted from the ZIP archive).

- PDF Document Direct URL: https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{YYYY}/{DocID}.pdf

## 🛠️ Tech Stack & Tools
- Runtime Target: Cloudflare Workers (workerd - V8 Isolates).
- Package Manager: pnpm (mandatory; do not use npm or yarn).
- Backend Web Framework: Hono (hono).
- Database: Cloudflare D1 (Native Edge SQLite) interacting via env.DB.
- Data Parser: fast-xml-parser to process the official House Clerk XML files.
- Telegram Bot: Webhook/Bot API handled inside the Worker via direct calls to https://api.telegram.org/bot/.
- Deployment & Infra: wrangler CLI via pnpm wrangler.

### 📐 Strict Code Rules & Conventions

#### 1. Execution Environment & Compatibility (V8 Isolates)
- **DO NOT** use Node.js-exclusive APIs (e.g., `fs`, `path`, `child_process`).
- **DO NOT** use Bun-exclusive APIs in production code.
- Use only **Web Standard APIs** (`fetch`, `Request`, `Response`, `Headers`, `URL`, `Crypto`).

#### 2. House Clerk Index Processing
- Data Source: ALWAYS download and process the XML file ({YYYY}FD.xml) from https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YYYY}FD.zip. NEVER process the plain .txt file.
- **Transaction Filtering:** Strictly filter by `P` (Periodic Transaction Reports). Ignore types `W`, `FD`, `A`, or non-relevant candidate filings to minimize unneeded database operations.
- Use `fast-xml-parser` to safely transform XML data into JSON objects.

#### 3. Database Management (Cloudflare D1)
- Use prepared statements with `env.DB.prepare(...)` and bound parameters to prevent SQL injection.
- Use `INSERT OR IGNORE` based on `DocID` or unique transaction IDs to prevent duplicate entries.
- Maintain the `notified INTEGER DEFAULT 0` column to coordinate Telegram alert dispatches.

#### 4. Endpoints & Hono Router
- The entire API must be mounted on Hono.
- Validate the `X-Telegram-Bot-Api-Secret-Token` header on the `/telegram` route to ensure requests originate exclusively from Telegram.
- Keep API responses lightweight by returning plain JSON.

#### 5. Cron Job / Synchronizer
- The main Cron Job handler resides in the `scheduled` event exported in `src/index.ts`.
- Synchronization must be **idempotent**: executing the Cron Job multiple times must not trigger duplicate database entries or repeated Telegram notifications.


## 🧱 Feature-First Architecture Convention

The project follows a **Feature-First Architecture** pattern. Code is organized primarily by business domains/features rather than technical layers (e.g., placing controllers or queries in flat global folders).
DON't use barrel file to export all the files

### Directory Structure Guidelines

```text
src/
├── features/
│   ├── house-clerk/       # Everything related to House Clerk disclosures
│   │   ├── services/      # ZIP downloading & XML parsing
│   │   ├── types.ts       # Specific House Clerk types
│   │
│   ├── sec-edgar/         # Everything related to SEC EDGAR Form 4 (Trump Media, etc.)
│   │   ├── services/
│   │
│   └── telegram-bot/      # Telegram Webhook, command handlers & dispatchers
│       ├── handlers/
│
├── shared/                # Domain-agnostic utilities (HTTP clients
```

### Feature Boundaries & Encapsulation Rules
- Public API via index.ts: Each feature folder MUST expose its functionality through its root index.ts. Internal implementation files inside a feature folder should not be directly imported by other features.
- Feature Isolation: Features must remain as decoupled as possible. Avoid direct cross-imports between parallel features unless routed through shared modules or explicit domain services.
- shared/ Module Scope: Reserve the shared/ directory strictly for domain-agnostic helpers (e.g., base HTTP fetching utilities, generic data transformers) that do not hold business logic.
