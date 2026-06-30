# Project Overview

This repository contains a full-stack React application for managing and auditing a housing loan portfolio for Sanjay Kumar Pandey, agent code `LU-GPH0020`, at the Gorakhpur area office.

The app lets a user search customer loan records, inspect disbursement status, manage a pending-disbursement worklist, import Excel data, calculate EMI schedules, and generate Gemini AI-backed audit and customer follow-up drafts.

## How to Run

Prerequisites:

- Node.js
- A Gemini API key for AI features

Setup:

```bash
npm install
```

Create a local environment file, usually `.env.local`, and set:

```bash
GEMINI_API_KEY="your_api_key_here"
```

Start the development server:

```bash
npm run dev
```

The Express server listens on:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run build   # Build frontend and bundled server into dist/
npm run start   # Run the production build
npm run lint    # Type-check with TypeScript
npm run clean   # Remove dist/
```

## Main Technology

- React 19 for the user interface
- TypeScript for typed data models
- Vite for frontend development and build tooling
- Express for the server and API routes
- Gemini API via `@google/genai` for AI audit and follow-up generation
- Tailwind CSS for styling
- Recharts for EMI and repayment charts
- `xlsx` for spreadsheet import
- `lucide-react` for icons

## File and Folder Guide

```text
.
├── README.md
├── PROJECT_OVERVIEW.md
├── package.json
├── package-lock.json
├── server.ts
├── vite.config.ts
├── tsconfig.json
├── metadata.json
├── index.html
├── .env.example
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── data.ts
    ├── types.ts
    ├── index.css
    └── components/
        ├── AIAnalyst.tsx
        ├── CustomerDetail.tsx
        ├── DataImporter.tsx
        ├── EMICalculator.tsx
        ├── Header.tsx
        ├── MetricsOverview.tsx
        └── WorklistManager.tsx
```

## Important Files

### `server.ts`

Runs the Express server. In development it mounts Vite middleware, and in production it serves the built app from `dist/`.

API routes:

- `GET /api/health`: basic health check.
- `POST /api/audit`: sends portfolio summary, stalled loans, and pending loans to Gemini and returns a markdown audit report.
- `POST /api/draft-followup`: sends customer and loan context to Gemini and returns draft email, SMS or WhatsApp text, and recommended call actions.

The server requires `GEMINI_API_KEY` before Gemini-backed endpoints can work.

### `src/App.tsx`

The main React application shell. It controls:

- Customer data loading from built-in data or browser `localStorage`
- Top-level tabs: Customers, Worklist, and AI Auditor
- Search and filters for customer name, address, occupation, loan number, app number, status, year, and occupation
- Import modal state
- Active customer selection

It also adds Gorakhpur locality addresses to built-in customer records.

### `src/data.ts`

Contains the built-in portfolio dataset and global portfolio stats.

Key export:

- `GLOBAL_STATS`: agent, office, total customer, loan, transaction, and disbursement summary.
- `CUSTOMERS`: typed customer and loan records used as the initial data source.

### `src/types.ts`

Defines the shared TypeScript models:

- `Disbursement`
- `Loan`
- `Customer`
- `FollowUpNote`

Use this file when changing the shape of customer, loan, or disbursement records.

### `src/main.tsx`

React entry point. It mounts `App` into the `index.html` root element and imports global CSS.

### `src/index.css`

Global stylesheet and Tailwind CSS entry point. This controls the app-wide visual base and utility styling.

### `vite.config.ts`

Vite configuration. It enables React, Tailwind CSS, an `@` alias to the project root, and conditional HMR/file watching behavior.

### `metadata.json`

AI Studio metadata describing the app name, description, permissions, and server-side Gemini capability.

### `.env.example`

Documents the environment variables expected by the app:

- `GEMINI_API_KEY`
- `APP_URL`

## Component Guide

### `src/components/Header.tsx`

Top navigation and portfolio identity bar. Shows the agent name/code, office information, tab buttons, worklist count, customer count, and total disbursed value.

### `src/components/MetricsOverview.tsx`

Displays high-level metrics for the currently filtered customer list:

- Approved limit
- Released funds
- Locked capital
- Active accounts
- Tranche history

### `src/components/CustomerDetail.tsx`

Shows the selected customer's loan profile. It includes:

- Loan-level details
- Disbursement history
- Customer timeline
- Local follow-up notes
- EMI calculator tab
- AI follow-up draft generation through `/api/draft-followup`

### `src/components/WorklistManager.tsx`

Creates a worklist of loans that are not fully disbursed and still have pending release amounts. It supports:

- Buckets by loan age: fresh, warm, stale, and cold
- Search
- Sorting by age, pending amount, and customer name
- Local follow-up notes
- CSV export for audit work

### `src/components/AIAnalyst.tsx`

Builds a portfolio audit payload and calls `/api/audit`. It separates:

- Stalled or zero-payout loans
- Pending or partially disbursed loans
- Total sanctioned, disbursed, and pending values

Generated audit reports are cached in browser `localStorage`.

### `src/components/DataImporter.tsx`

Imports spreadsheet data using `xlsx`. It can auto-map common column names, preview generated customer records, and either append to or replace current customer data.

Expected spreadsheet concepts include:

- Customer name
- Occupation
- Address
- Loan or app number
- Scheme
- Sanction date
- Sanctioned amount
- Total disbursed
- ROI
- Status
- Purpose

### `src/components/EMICalculator.tsx`

Interactive EMI and amortization tool. It calculates:

- Monthly EMI
- Total payable
- Total interest
- Monthly repayment schedule
- Yearly repayment schedule

It can show repayment data as charts or an amortization table.

## Data Flow

1. The app starts with `CUSTOMERS` from `src/data.ts`.
2. `App.tsx` augments those records with Gorakhpur addresses.
3. If `localStorage.gcp_imported_customers` exists, imported customers replace the built-in starting data.
4. Search and filters narrow the customer list in the Customers tab.
5. Customer selection passes a `Customer` object into `CustomerDetail`.
6. Worklist and AI tabs derive their loan lists from the current customer dataset.
7. Gemini features call server routes, not the Gemini API directly from the browser.

## Browser Storage

The app uses browser `localStorage` for client-side persistence:

- `gcp_imported_customers`: imported customer dataset
- `gcp_loan_notes`: follow-up notes keyed by loan and customer
- `gcp_audit_report`: cached AI audit markdown

Clearing browser site data will remove these saved values.

## AI Features

AI functionality is server-side:

- The browser sends portfolio or customer/loan context to Express.
- Express reads `GEMINI_API_KEY`.
- Express calls Gemini through `@google/genai`.
- The server returns generated markdown to the UI.

If the API key is missing or invalid, AI audit and follow-up generation will fail, but the rest of the dashboard can still run.

## Build Output

Production build output is written to `dist/`.

The build command does two things:

1. `vite build` creates the frontend production assets.
2. `esbuild server.ts` bundles the server into `dist/server.cjs`.

The production start command runs:

```bash
node dist/server.cjs
```

## Notes for Future Changes

- Keep shared data shape changes in `src/types.ts` first, then update data, importer, and UI components.
- Update `DataImporter.tsx` when adding new spreadsheet-supported fields.
- Update `server.ts` when adding new AI or backend endpoints.
- Be careful with `localStorage` key changes because existing browser data depends on the current names.
- Run `npm run lint` after TypeScript or data model changes.
