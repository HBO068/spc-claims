# SPC Claims Management System
### COE — Shared Planning Center Tangier

A professional internal web application for managing planning claims and deviations using the 5D methodology.

---

## Quick Start (Step by Step)

### Prerequisites
- [Node.js 18+](https://nodejs.org) — download and install
- [VS Code](https://code.visualstudio.com) — already installed

---

### Step 1 — Download & Open the Project

1. Upload this folder to GitHub or copy it to your computer
2. Open VS Code
3. Open a terminal in VS Code: **Terminal → New Terminal**

---

### Step 2 — Install & Start the Backend

```bash
cd spc-claims/backend
npm install
npm run dev
```

You should see: `🚀 SPC Claims API running on http://localhost:3001`

---

### Step 3 — Install & Start the Frontend (new terminal tab)

```bash
cd spc-claims/frontend
npm install
npm run dev
```

You should see: `Local: http://localhost:5173`

---

### Step 4 — Open the App

Open your browser and go to: **http://localhost:5173**

---

## Default Login Credentials

| Planner ID | Password | Role |
|---|---|---|
| ADMIN | Admin@2025 | Manager |
| HBO068 | Spc@2025! | Supervisor |
| AAJ078 | Spc@2025! | Supervisor |
| MYE021 | Spc@2025! | Planner |

> ⚠️ Change all passwords after first login via User Management

---

## System Features

### Claims Management (5D Workflow)
- **D1** — Problem definition with auto-generated Claim ID
- **D2** — Immediate containment (shift alerts D/C/B/A over 3 days)
- **D3** — Root cause analysis with planner accountability
- **D4** — Permanent corrective actions (PCA1–4) per shift
- **D5** — Management verification (manager role only)

### Claim ID Format
`TERMINAL-YYWWDD-COUNT`
Example: `SEGOT-250813-2` = Terminal SEGOT, Year 2025, Week 08, Day 13, 2nd claim that day

### Roles
- **Planner** — View claims, update D3/D4 steps assigned to them
- **Supervisor** — Create claims, manage D2 alerts, assign planners
- **Manager** — Full access + D5 verification + User management + Dashboard

### Dashboard
- KPI cards (total, open, in progress, resolved)
- Claims/Deviation ratio with target indicator (≤2%)
- Weekly trend chart
- Status distribution pie chart
- Claims by terminal
- Recent claims

---

## Deploy Online (Railway — Free)

1. Push this project to GitHub
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click "New Project" → "Deploy from GitHub Repo"
4. Add environment variable: `JWT_SECRET=your_secret_here`
5. Railway will auto-detect Node.js and deploy

For the frontend, deploy separately on [Vercel](https://vercel.com):
1. Push the `frontend` folder to a separate repo (or monorepo)
2. Set `VITE_API_URL` env variable to your Railway backend URL

---

## Project Structure

```
spc-claims/
├── backend/
│   ├── server.js          # Express server entry
│   ├── database.js        # SQLite schema + seed data
│   ├── middleware/auth.js  # JWT authentication
│   ├── routes/
│   │   ├── auth.js        # Login / session
│   │   ├── claims.js      # Full 5D claims CRUD
│   │   └── users.js       # User management
│   └── uploads/           # Photos stored here
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx       # Maritime-themed login
        │   ├── Dashboard.jsx   # KPIs + charts
        │   ├── Claims.jsx      # Filterable claims list
        │   ├── ClaimDetail.jsx # Full 5D workflow tabs
        │   ├── NewClaim.jsx    # D1 entry form
        │   └── Users.jsx       # User management
        ├── components/Layout.jsx  # Sidebar navigation
        ├── context/AuthContext.jsx
        └── utils/api.js
```

---

## Phase 2 — Internal Deviations
The database table `internal_deviations` is already created.
The shift-handover deviation module will be built as Phase 2.
