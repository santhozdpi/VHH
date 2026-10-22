# PharmaIntel — PSP Opportunity Monitor

Enterprise pharmaceutical intelligence web application for marketing and business development teams at healthcare technology companies. PharmaIntel monitors official US FDA drug approval actions, calculates a transparent rule-based **Patient Support Program (PSP) Opportunity Score**, links every claim to official FDA/DailyMed sources, and manages internal qualification workflows.

---

## 1. Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express (`server.ts`)
- **AI Assistant:** Server-side `@google/genai` SDK (`gemini-3.8-flash`) with verified database grounding and deterministic fallback
- **FDA Data Source:** Official US FDA `openFDA` Drugs@FDA API (`https://api.fda.gov/drug/drugsfda.json`) + verified FDA Prescribing Information cross-reference layer
- **Persistence:** Atomic JSON-backed relational store (`./data/pharmaintel-store.json`) + SQL schema (`src/db/schema.sql`) compatible with PostgreSQL and SQLite

---

## 2. Prerequisites & Installation

- **Node.js:** v20.x or v22.x+
- **npm:** v10+

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variable template
cp .env.example .env
```

---

## 3. Environment Variables (`.env`)

Configure server-side credentials in `.env` or your cloud provider's Secret Manager. **Never expose API keys in frontend code.**

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional (Recommended) | Server-side Google Gemini API key for the AI Assistant (`gemini-3.8-flash`). Falls back to the deterministic Verified Data Engine if unset. |
| `OPENFDA_API_KEY` | Optional | Official openFDA API key for higher rate limits (`https://open.fda.gov/apis/authentication/`). Works without a key at standard public tier limits. |
| `DATABASE_URL` | Optional | Path to local persistent store or PostgreSQL connection string. |
| `CRM_PROVIDER` | Optional | `'none'` (default), `'salesforce'`, or `'hubspot'`. Keep `'none'` until CRM credentials are provisioned. |
| `CRM_API_ENDPOINT` | Optional | Salesforce or HubSpot instance URL. |
| `CRM_CLIENT_ID` / `CRM_CLIENT_SECRET` | Optional | Server-side OAuth credentials for CRM sync. |
| `EMAIL_PROVIDER` | Optional | `'none'` (default), `'sendgrid'`, `'ses'`, or `'smtp'`. Real email sending is disabled until configured. |
| `EMAIL_API_KEY` / `EMAIL_FROM_ADDRESS` | Optional | Server-side email provider credentials. |

---

## 4. Running Locally & Running Automated Tests

```bash
# Start full-stack Express + Vite server on http://localhost:3000
npm run dev

# Run TypeScript typecheck
npm run lint

# Run automated unit & database persistence tests (node:test via tsx)
npm test

# Build production bundle
npm run build
```

---

## 5. Backend API Endpoints

- `GET /api/health` — System health, record count, and integration status
- `GET /api/drugs` — Query normalized FDA approval records with search, company, applicationType, scoreTier, status, date range, and sort parameters
- `GET /api/drugs/pending` — Retrieve verified FDA Tentative Approvals (`submission_status: "TA"`) and regulatory disclosure notice
- `GET /api/drugs/:id` — Retrieve full drug record, 5-dimension PSP score breakdown, official sources, and internal workflow history
- `POST /api/drugs/refresh` — Trigger live server-side synchronization with `https://api.fda.gov/drug/drugsfda.json`
- `GET /api/opportunities` — Retrieve PSP Opportunity Pipeline records
- `POST /api/opportunities` — Save a drug record into the active PSP Opportunity Pipeline
- `PATCH /api/opportunities/:id` — Update pipeline status, assigned owner, follow-up date, or internal notes
- `POST /api/opportunities/:id/approve` — Save internal marketing team approval decision (`Approved Internally`)
- `POST /api/opportunities/:id/reject` — Mark opportunity as `Disqualified` with reason
- `POST /api/opportunities/:id/outreach-draft` — Generate an evidence-backed B2B outreach draft
- `POST /api/opportunities/:id/outreach-send` — Enforces sending safeguards (blocks unconfigured or unverified sends)
- `POST /api/opportunities/:id/crm-sync` — Enforces CRM safeguards (blocks sync when CRM is unconfigured)
- `GET /api/companies` — Aggregated pharmaceutical sponsor summaries
- `GET /api/reports/summary` — Executive metrics, tier distribution, missing-data audit, refresh history, and audit logs
- `GET /api/settings/integrations` & `PATCH /api/settings/integrations` — View and update platform settings
- `POST /api/settings/test-connection` — Test openFDA, CRM, or Email readiness
- `POST /api/assistant/chat` — Server-side Gemini AI Assistant grounded in verified database records

---

## 6. Deployment (GitHub & Google Cloud Run)

> **Important:** GitHub Pages only hosts static files and **cannot** run the Node.js/Express backend or protect server-side API keys. Deploy PharmaIntel to **Google Cloud Run** or another Node.js container host.

```bash
# Build production frontend assets
npm run build

# Deploy to Google Cloud Run
gcloud run deploy pharmaintel-psp-monitor \
  --source . \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,CRM_PROVIDER=none,EMAIL_PROVIDER=none" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest"
```

### Configuring Scheduled Daily FDA Refresh in Production
After deploying to Cloud Run, create a **Google Cloud Scheduler** job targeting `POST https://<your-cloud-run-url>/api/drugs/refresh` on schedule `0 6 * * *` (daily at 06:00 UTC).

---

## 7. Current Limitations & Unimplemented External Integrations

- **CRM Integration (Salesforce / HubSpot):** Modular settings UI and backend validation endpoints are implemented, but live external CRM record creation is intentionally **disabled** until organization-specific CRM OAuth credentials (`CRM_CLIENT_ID`, `CRM_CLIENT_SECRET`) are provisioned. Internal approvals save locally and report `"CRM not connected — internal review saved."`
- **Automated Email Sending:** Evidence-backed outreach draft generation and Copy-to-Clipboard are fully functional. Live email transmission (`POST /api/opportunities/:id/outreach-send`) is **disabled** until an email provider (`EMAIL_API_KEY`) and verified recipient address are configured.
- **Confidential Pending NDA/BLA Submissions:** Because the US FDA does not publicly disclose confidential unapproved NDA/BLA filings via openFDA prior to action, the *Waiting for FDA Approval* page displays verified FDA Tentative Approvals (`TA`) and clearly documents this regulatory limitation rather than guessing pending drugs.

---

## 8. Manual Testing Checklist

1. Open **Dashboard** and verify all 7 KPI cards reflect actual stored database counts.
2. Navigate to **Drug Approval Monitor → FDA Approved**, filter by `BLA` or `Original Approvals (New Launch)`, and click **Refresh FDA Data**.
3. Click any drug row (e.g., **NIKTIMVO** `BLA761390` or **WINREVAIR** `BLA761363`) to inspect the 5-dimension **PSP Opportunity Score** breakdown and click an official `accessdata.fda.gov` source link.
4. Click **Approve Opportunity**, add qualification notes in the modal, confirm, and verify the status becomes `Approved Internally` with notice `"CRM not connected — internal review saved."`
5. Click **Prepare Outreach Draft**, inspect the evidence-backed email draft, click **Copy Draft to Clipboard**, and verify that clicking **Send Email (Disabled)** is safely blocked.
6. Open the right-side **PharmaIntel AI Assistant** and click a suggested prompt (e.g., *"Compare the top five opportunities"*).
