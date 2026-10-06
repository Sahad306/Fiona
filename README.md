<div align="center">

# FINORA

**Intelligent Financial Architecture**

A full-stack personal finance management system with AI-driven wealth advisory, transparent financial health scoring, and Bangladesh-first localization.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## Overview

FINORA is a self-hostable personal finance operating system that unifies income and expense tracking, category-wise budgeting, savings-goal management, automated reporting, and AI wealth advisory in a single secure web application.

It is designed to be **practical for emerging-market users** — with first-class support for Bangladeshi payment methods (bKash, Nagad, Rocket), Taka presets, and local expense categories — while remaining **privacy-first** and **free to run** (no mandatory external services).

## Key Features

- **Income & Expense Tracking** — full CRUD, daily/monthly modes, sector splits, tags, recurring flags, and one-click local presets.
- **Category Budgets & Alerts** — per-category and overall monthly caps with configurable alert thresholds (e.g. 80%).
- **Savings Goals** — targets, contributions, withdrawals, progress tracking, and milestone notifications.
- **Financial Health Score (0–100)** — a fully **explainable** score combining savings rate, budget discipline, cash flow, and goal progress, with explicit penalties for overspending.
- **AI Financial Advisor** — natural-language analysis, month-over-month trend insights, and actionable recommendations. Powered by Google Gemini with a Mistral fallback and a **rule-based degraded mode** that works with no API keys at all.
- **Reports** — monthly and YTD reports with charts, frozen snapshots, CSV/JSON export, and print/PDF output.
- **Smart Import** — bulk-paste bKash/Nagad/bank SMS text; AI categorizes each transaction.
- **Responsive UI** — mobile-first layout with a dark, institutional-grade theme.

## Tech Stack

| Layer | Technology |
|---|---|
| Front end | React 19, TypeScript 5.8, Tailwind CSS 4 |
| Charts | Recharts |
| Animation | Motion |
| Icons | lucide-react |
| Back end | Node.js, Express 4 |
| Dev server / build | Vite 6, tsx, esbuild |
| AI | Google Gemini (`@google/genai`), Mistral |
| Storage | File-persisted JSON with atomic writes |
| Security | Node `crypto` — PBKDF2-SHA512, session tokens |

## Architecture

FINORA uses a three-tier architecture:

```
┌─────────────────────────────────────────────┐
│  Presentation  —  React 19 SPA (Vite)        │
└───────────────────────┬─────────────────────┘
                        │ HTTPS / JSON
┌───────────────────────▼─────────────────────┐
│  Application   —  Express REST API           │
│  /api/auth/*  /api/db/*  /api/ai/*  /health  │
└───────────────────────┬─────────────────────┘
                        │ read / write
┌───────────────────────▼─────────────────────┐
│  Data          —  data/finora_db.json        │
└─────────────────────────────────────────────┘
```

External AI providers are called **only from the server**, so API keys never reach the browser.

## Getting Started

### Prerequisites

- **Node.js ≥ 18**
- npm

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd finora---personal-finance-management

# 2. Install dependencies
npm install

# 3. Configure environment (optional)
cp .env.example .env
```

### Environment Variables

All variables are **optional**. FINORA runs fully without any of them — AI features fall back to a rule-based advisor.

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Primary AI provider (Google Gemini). |
| `MISTRAL_API_KEY` | Fallback AI provider. |
| `MISTRAL_MODEL` | Mistral model name (default: `ministral-14b-latest`). |
| `PORT` | Server port (default: `3000`). |
| `CORS_ORIGIN` | Allowed origin (default: `*`). |
| `DEMO_ACCOUNT_PASSWORD` | Shared password for seeded demo accounts. |

### Run Locally

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

You can sign in, register a new account, or use **Explore Preview** to try the app with sample data without registering.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (`tsx server.ts`) with Vite middleware. |
| `npm run build` | Build the client and bundle the server to `dist/`. |
| `npm start` | Run the production server (`node dist/server.cjs`). |
| `npm run lint` | Type-check the project (`tsc --noEmit`). |
| `npm run preview` | Preview the built Vite app. |
| `npm run clean` | Remove the `dist/` and `server.js` artifacts. |

## Project Structure

```
.
├── server.ts                 # Express app: routes, middleware, AI proxy, Vite/static serving
├── server/
│   └── db.ts                 # JSON datastore (users, sessions, userData) with atomic writes
├── src/
│   ├── App.tsx               # Root component, tab routing, auth gate
│   ├── types.ts              # Domain types (Transaction, Budget, SavingsGoal, …)
│   ├── context/
│   │   └── FinanceContext.tsx# Global state, financial summary + health-score engine
│   ├── components/           # Dashboard, IncomeView, ExpensesView, PlanningView,
│   │                         # ReportsAiView, AIAdvisorView, AuthGateway, modals, …
│   └── data/
│       └── defaultData.ts    # Categories, payment methods, local presets
├── data/
│   └── finora_db.json        # Persisted datastore (created at runtime)
├── index.html
├── vite.config.ts
└── render.yaml               # Render deployment blueprint
```

## Security

- Passwords hashed with **PBKDF2-SHA512**, 10,000 iterations, per-user random salt.
- Cryptographically random **session tokens** (32 bytes) with expiry.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, and a restrictive `Permissions-Policy`.
- In-memory **rate limiting** on authentication and AI endpoints.
- Atomic datastore writes (write-temp-then-rename with a Windows copy fallback).

## Deployment

A `render.yaml` blueprint is included for [Render](https://render.com). It builds with `npm run build`, starts with `npm start`, and health-checks `/api/health`.

```bash
# Production build
npm run build
npm start
```

Set `NODE_ENV=production` so the server serves the built static assets from `dist/`.

## Roadmap

- [ ] Migration to SQLite/PostgreSQL for multi-tenant scale
- [ ] Automated test suite (Vitest + Playwright)
- [ ] Recurring-transaction automation and statement import
- [ ] Configurable health-score weights
- [ ] Bangla language support and multi-currency
- [ ] Mobile apps (React Native) over the same API

## License

This project is provided for educational and personal use. Add a license file if you intend to distribute it.

---

<div align="center">
<sub>FINORA — Precision Wealth & Personal Finance Intelligence System</sub>
</div>
