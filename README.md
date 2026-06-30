# 🏠 Housing Loan Portfolio Manager

A full-stack React + TypeScript web application for managing and auditing a housing loan portfolio. Built for **Sanjay Kumar Pandey** (Agent Code: `LU-GPH0020`) at the **Gorakhpur Area Office**.

---

## ✨ Features

- 🔍 **Customer Search & Filtering** — search by name, address, occupation, loan number, status, year, and more
- 📋 **Loan Details View** — inspect disbursement history, loan timelines, and follow-up notes per customer
- ✅ **Worklist Manager** — track pending-disbursement loans, bucketed by age (fresh / warm / stale / cold), with CSV export
- 📊 **EMI Calculator** — compute monthly EMI, total interest, and amortization schedules with charts
- 🤖 **AI Auditor** — Gemini AI-backed portfolio audit reports and customer follow-up drafts (email, SMS, WhatsApp)
- 📥 **Excel Importer** — import customer loan data from `.xlsx` spreadsheets with smart column auto-mapping
- 💾 **Local Persistence** — saves imported data, notes, and audit reports in browser `localStorage`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Language | TypeScript |
| Frontend Tooling | Vite 6 |
| Styling | Tailwind CSS 4 |
| Backend Server | Express |
| AI Integration | Google Gemini API (`@google/genai`) |
| Charts | Recharts |
| Spreadsheet Import | `xlsx` |
| Icons | `lucide-react` |
| Animations | `motion` |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) *(only required for AI features)*

### Installation

```bash
npm install
```

### Environment Setup

Copy the example environment file and fill in your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

> **Note:** If `GEMINI_API_KEY` is missing, the app still runs — only the AI Auditor and Follow-up Draft features will be unavailable.

### Running Locally

```bash
npm run dev
```

Opens at: **http://localhost:3000**

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Express + Vite HMR) |
| `npm run build` | Build frontend assets and bundle server for production |
| `npm run start` | Run the production build |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm run clean` | Remove the `dist/` output folder |

---

## 📁 Project Structure

```
completionist/
├── index.html              # HTML entry point
├── server.ts               # Express backend server + API routes
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Project dependencies and scripts
├── metadata.json           # AI Studio app metadata
├── .env.example            # Required environment variable reference
├── PROJECT_OVERVIEW.md     # Detailed internal developer notes
│
└── src/
    ├── main.tsx            # React entry point (mounts App)
    ├── App.tsx             # Root application shell, tabs, routing
    ├── data.ts             # Built-in loan portfolio dataset
    ├── types.ts            # Shared TypeScript interfaces
    ├── index.css           # Global styles + Tailwind entry
    │
    └── components/
        ├── Header.tsx          # Top navigation & portfolio identity bar
        ├── MetricsOverview.tsx # Portfolio-level summary metrics
        ├── CustomerDetail.tsx  # Individual customer loan profile view
        ├── WorklistManager.tsx # Pending-disbursement loan worklist
        ├── AIAnalyst.tsx       # AI-powered portfolio audit
        ├── DataImporter.tsx    # Excel spreadsheet data importer
        └── EMICalculator.tsx   # EMI & amortization calculator
```

---

## 🔌 API Endpoints

The Express server exposes the following routes:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Basic health check |
| `POST` | `/api/audit` | Generate AI portfolio audit report |
| `POST` | `/api/draft-followup` | Generate AI customer follow-up draft |

Both AI endpoints require a valid `GEMINI_API_KEY` in the environment.

---

## 🧩 Component Reference

### `Header.tsx`
Top navigation bar showing agent name/code, office details, tab switching (Customers / Worklist / AI Auditor), worklist count, customer count, and total disbursed value.

### `MetricsOverview.tsx`
Summary cards for the currently filtered customer list:
- Approved limit, released funds, locked capital
- Active accounts and tranche history

### `CustomerDetail.tsx`
Full profile view for a selected customer, including:
- Loan info, disbursement history, and customer timeline
- Local follow-up notes
- EMI calculator tab
- AI-generated follow-up drafts via `/api/draft-followup`

### `WorklistManager.tsx`
Tracks loans with pending disbursements. Features:
- Age-based bucketing: **fresh** / **warm** / **stale** / **cold**
- Search, sorting (by age, amount, name)
- Local follow-up notes
- CSV export for audit work

### `AIAnalyst.tsx`
Sends portfolio context to `/api/audit` and displays an AI-generated markdown audit report. Cached in `localStorage` between sessions.

### `DataImporter.tsx`
Imports `.xlsx` spreadsheet files. Auto-maps common column names and previews records before importing. Can append to or replace existing data.

### `EMICalculator.tsx`
Interactive EMI calculator with:
- Monthly EMI, total payable, total interest
- Month-by-month and year-by-year repayment schedules
- Chart and table views

---

## 🗂️ Data Models (`src/types.ts`)

```ts
Customer        // Top-level customer record with agent info and loan list
Loan            // Individual loan with sanction details and disbursements
Disbursement    // A single tranche/payout event on a loan
FollowUpNote    // A local user note linked to a customer and loan
```

---

## 💽 Browser Storage

The app uses `localStorage` for client-side persistence:

| Key | Contents |
|---|---|
| `gcp_imported_customers` | Imported customer dataset (replaces built-in data) |
| `gcp_loan_notes` | Follow-up notes keyed by loan and customer |
| `gcp_audit_report` | Cached AI audit markdown report |

> Clearing browser site data will remove all saved values.

---

## 📦 Production Build

```bash
npm run build
npm run start
```

`npm run build` does two things:
1. **Vite** compiles the React frontend into `dist/`
2. **esbuild** bundles `server.ts` into `dist/server.cjs`

The production server then serves static assets and handles API requests from a single Node.js process.

---

## 🧑‍💻 Development Notes

- Add new data fields in `src/types.ts` first, then update `data.ts`, `DataImporter.tsx`, and UI components.
- Add new AI/backend features in `server.ts`.
- Be careful renaming `localStorage` keys — existing browser data depends on current key names.
- Run `npm run lint` after any TypeScript or data model changes.
