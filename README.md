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
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with the Supabase project URL and **secret** key. Keep the secret key server-side and out of source control. The publishable key and JWKS URL are unused because requests go through FastAPI and this task has no login. For code-based schema setup, copy the PostgreSQL connection URI from Supabase Dashboard > Connect into `DATABASE_URL` in `backend/.env` (this is separate from the API secret key), install requirements with `python -m pip install -r requirements.txt`, then run `python scripts/apply_schema.py` from `backend`. Use the exact URI shown in the dashboard; it contains the database password and must stay in `.env`. The migration uses pg8000 over TLS and sends the complete SQL file to PostgreSQL without splitting function bodies. It does not run automatically on API startup.

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

## Vercel deployment

Deploy the frontend and backend as separate Vercel projects from this repository. The frontend project uses `frontend` as its Root Directory. For the backend project, use `backend` as its Root Directory and select the FastAPI framework preset. `backend/api/index.py` exports the FastAPI app from `app.main`; `backend/vercel.json` selects Vercel's FastAPI framework, and `.python-version` pins the runtime to Python 3.12.

Set these environment variables in the backend Vercel project:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `FRONTEND_ORIGINS` with the deployed frontend origin, without a trailing slash

The Supabase schema has been applied. `DATABASE_URL` is needed only when running `python scripts/apply_schema.py` to apply migrations; it is not needed by the API at runtime.

After the backend deploys, test `https://<backend-domain>/api/health/ready`. Then set `VITE_API_URL` in the frontend Vercel project to the backend origin (for example, `https://<backend-domain>`, without an `/api` suffix) and redeploy the frontend. The published frontend currently has the local API fallback in its bundle until that variable is set for a new Vercel build.

Frontend project URL: <https://d-scribe-rouge.vercel.app/>. Add the working backend URL and screenshots here after the backend deployment.
