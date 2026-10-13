# TrackSelavu

**செலவைக் குறைப்பதைவிட வருமானத்தைப் பெருக்குவது சிறந்தது.**
*(It is better to grow your income than to cut your expenses.)*

TrackSelavu is an **offline-first** daily expense, income, and budget tracker built for individuals in India. It runs entirely in the browser as an installable Progressive Web App (PWA) — there is no backend server, no cloud database, and no login. All financial data is stored on-device in IndexedDB and never leaves the device unless you explicitly export a backup.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Angular 18 (standalone components, no NgModules) |
| UI | Angular Material (custom deep-teal / warm-orange theme, light + dark) |
| Local database | IndexedDB via the [`idb`](https://www.npmjs.com/package/idb) wrapper |
| Charts | Chart.js |
| Installability / offline | `@angular/service-worker` (PWA) |
| Fonts / icons | Self-hosted Roboto + Material Icons (no CDN calls, works fully offline) |
| Currency | `Intl.NumberFormat('en-IN', ...)` for ₹ / Indian lakh-crore grouping |
| Testing | Karma + Jasmine |

Money is always stored as **integer paise** (`amountPaise`), never as a floating-point rupee value, to avoid rounding errors.

## Getting Started

```bash
npm install
npm start          # ng serve, http://localhost:4200
```

### Production build

```bash
npm run build       # outputs to dist/tracselavu, service worker enabled
```

Serve the `dist/tracselavu/browser` folder with any static file server (or `npx http-server dist/tracselavu/browser`) to test installability and offline behavior — the Angular dev server does not register the service worker.

### Running tests

Unit tests run in a real, Chromium-based browser via Karma (no DOM/IndexedDB mocking required — tests that exercise storage use a real, ephemeral IndexedDB instance in the test browser).

```bash
npm test
```

If Google Chrome isn't installed but Microsoft Edge (Chromium) is, point Karma at it:

```bash
# Windows (bash/git-bash)
export CHROME_BIN="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
npm test -- --watch=false --browsers=ChromeHeadless
```

Test coverage includes:
- **Calculations**: currency/paise conversion and formatting, date-range math (week/month boundaries, previous-period comparisons).
- **Reports**: income/expense totals, category breakdowns, largest transactions, highest-spending day — all exercised against fake in-memory data services.
- **Budgets**: spend/remaining/percent-used/warning/exceeded logic, category-scoped vs. overall budgets, transfer exclusion.
- **Database operations**: real IndexedDB create/read/update/delete for transactions and categories, category delete-protection and reassignment, backup-file validation.
- **SMS parsing**: debit, credit, refund, reversal, failed-payment, promotional, OTP, balance-alert, and card-reminder message samples.

## Project Structure

```
src/app/
  core/
    models/       Plain TypeScript interfaces for every stored entity
    services/      DbService (IndexedDB schema + migrations) and all CRUD/business-logic services
    sms/            Framework-free SMS parser + the SmsImportService that stores/reviews/approves records
    utils/          Pure helpers: currency, local-date-safe date ranges, id generation, hashing
  features/        One folder per screen (dashboard, transactions, categories, budgets, reports,
                    charts, sms-import, backup-restore, settings) — all standalone, lazy-routed
  shared/          Reusable UI bits: confirm dialog, toast service, Chart.js canvas wrapper, labels
```

`core/sms/sms-parser.ts` has **zero Angular/IndexedDB/UI dependencies** on purpose — it can be reused verbatim inside a future native Android SMS-reading module without pulling in the web app.

## Data Model (IndexedDB stores)

- `transactions` — indexed by date, type, category, source, and timestamp
- `categories` — income/expense categories with icon, color, active flag
- `budgets` — overall or per-category, monthly or weekly, computed live against transactions (no need to "roll over" a budget record every month)
- `accounts` — lightweight bank/card/wallet records, auto-created from SMS account suffixes
- `sms_imports` — raw SMS text + parsed fields + review status, deduplicated by bank reference number or a text fingerprint
- `settings` — single key/value table (theme, SMS auto-save rules, learned merchant→category rules, app-lock, last backup time)

Schema changes are versioned in `DbService` (`upgrade()` callback, gated by `if (oldVersion < N)` blocks) so future releases can add stores/indexes without destroying existing user data.

## Feature Notes

- **Budgets** are evaluated live against the current month/week's transactions rather than being "created" per period, so changing a limit immediately applies going forward without back-filling records.
- **Refunds, transfers, and credit-card bill payments** are tracked with a `classification` field distinct from plain income/expense, and are excluded from headline income/expense totals to avoid double-counting (see `ReportsService`).
- **Backup & Restore** exports/imports a single versioned JSON file (`TrackSelavu_Backup_YYYY-MM-DD.json`). Restores run inside one IndexedDB transaction, so a failure (corrupt file, interrupted restore) leaves existing data completely untouched. "Merge" skips transactions/SMS records that already exist (by id / reference / fingerprint); "Replace" requires an extra confirmation before wiping existing data.
- **CSV export** is available separately for transactions only, for opening in Excel/Sheets.
- **App Lock** is a PIN gate on opening the app — it is explicitly *not* encryption. The Settings screen and this README both call that out, per the requirement to never overstate what a PIN screen protects against.

## SMS Import — Platform Limits (Important)

A browser-based Angular PWA **cannot** read a phone's SMS inbox directly — there is no web API for that, by design, for user privacy and security.

- **On the web / Windows (this app, as built):** SMS import works via **paste** (paste one or more messages, separated by a blank line) or **file import** (upload a `.txt` file of messages). This ships today and requires no extra permissions.
- **On Android, for automatic inbox reading:** this requires a **native Android component** — either a fully native app or a [Capacitor](https://capacitorjs.com/) wrapper around this same Angular app with a native SMS-reading plugin. That plugin would need:
  - The Android `READ_SMS` / `RECEIVE_SMS` runtime permissions, requested with a clear in-app explanation of why they're needed.
  - Compliance with Google Play's SMS/Call Log permission policy (apps must generally be a user's **default SMS or Assistant app**, or qualify for a narrow policy exception, to retain this permission).
  - A thin native bridge that hands raw SMS text to the exact same `parseSms()` function already in `core/sms/sms-parser.ts` — no parsing logic would need to be duplicated or rewritten.

This is why SMS parsing was deliberately built as a **pure, dependency-free module**: the paste/file-import path and a future native-Android inbox path can both feed it without any changes to the parser itself. Until that native module exists, paste/file import is the supported way to bring SMS transactions into TrackSelavu.

## Data Privacy & Safety

- All data stays in this browser's IndexedDB by default. No analytics, no third-party trackers, no network calls for normal operation.
- Browser storage is **not encrypted at rest**. Treat it like any other local file: if the device is shared or compromised, the data is readable. App Lock adds a PIN screen, not encryption.
- Clearing site data, uninstalling the PWA, or losing the device erases all records unless you have exported a backup. Use **Backup & Restore** regularly.
