# Careflow — Patient Admission Management

A responsive patient admission dashboard built for the DScribe Software Engineer Intern Round 1 task. Staff can add, view, edit, search and filter patients, mark them discharged, and delete records with confirmation.

## Stack

- React + Vite frontend
- FastAPI backend with Pydantic request and response models
- Supabase PostgreSQL for persistent patient records

## Features

- Create, list, update, and delete patient records
- Filter by ward, department, doctor, and admission status
- Search by patient name
- Mark admitted patients as discharged
- Validation in the UI and Pydantic, with database constraints on allowed values and numeric ranges
- Mobile, tablet, and desktop layouts
- No login or signup flow, as allowed by the task

## Screenshots

Capture screenshots of the running app before publishing the repository. Suggested views are the patient directory and the add/edit patient form.

## Local setup

### 1. Create the Supabase table

Create a Supabase project, then apply [`supabase/schema.sql`](supabase/schema.sql) in either of these ways. Option A: paste it into the Supabase SQL Editor and run it. Option B: use the code migration below with a PostgreSQL connection URI. This creates the `patients` table, field constraints, indexes, and update timestamp trigger. Records then persist across API restarts.

### 2. Configure the API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with the Supabase project URL and **secret** key. Keep the secret key server-side and out of source control. The publishable key and JWKS URL are unused because requests go through FastAPI and this task has no login. For code-based schema setup, copy the PostgreSQL connection URI from Supabase Dashboard > Connect into `SUPABASE_DB_URL` in `backend/.env` (this is separate from the API secret key), install requirements, then run `python scripts/apply_schema.py` from `backend`. Use the exact URI shown in the dashboard; it contains the database password and must stay in `.env`. The script applies the checked-in schema and does not run automatically on API startup.

Run the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

### 3. Configure and run React

```powershell
cd frontend
npm install
```

Optional: create `frontend/.env` and set the API origin for a deployed backend:

```text
VITE_API_URL=https://your-api.example.com
```

Start the app:

```powershell
npm run dev
```

Open <http://localhost:5173>.

## Validation

- Name: required; English letters, with spaces between name parts
- Age: required whole number from 0 to 120
- Gender, ward, department, doctor: required values from the API-provided lists
- Admission date: required and cannot be later than today in India Standard Time
- Status: `Admitted` or `Discharged`

The API returns clear field errors for invalid requests. The UI also checks the fields before submitting.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/health/ready` | Supabase readiness check |
| `GET` | `/api/options` | Allowed dropdown values |
| `GET` | `/api/patients` | List, search, and filter patients |
| `POST` | `/api/patients` | Add a patient |
| `PUT` | `/api/patients/{id}` | Edit patient details |
| `PATCH` | `/api/patients/{id}/status` | Update admission status |
| `DELETE` | `/api/patients/{id}` | Delete a patient |

Filters accepted by `GET /api/patients`: `search`, `ward`, `department`, `doctor`, and `status`.

## Deployment and submission

Deploy the FastAPI app on a Python-compatible host and the Vite frontend on a static host. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `FRONTEND_ORIGINS` on the backend host; set `VITE_API_URL` on the frontend host. Run the SQL schema once in Supabase. Add the public repository URL, live app URL, and actual screenshots to this README after deployment.

This source workspace has not been published or deployed, so public GitHub and live URLs are not included yet.
