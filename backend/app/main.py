import os
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .database import get_supabase
from .schemas import Department, Doctor, Gender, Options, Patient, PatientCreate, PatientList, PatientStatusUpdate, PatientUpdate, Ward

app = FastAPI(title="Patient Admission API", version="1.0.0", description="Patient admission management API backed by Supabase.")
origins = [item.strip() for item in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["*"])
TABLE = "patients"

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    labels = {
        "name": ("Name is required.", "Name must contain letters only, with spaces between name parts."),
        "age": ("Age is required.", "Age must be a whole number from 0 to 120."),
        "gender": ("Gender is required. Choose an available option.", "Choose a valid gender from the available options."),
        "ward": ("Ward is required. Choose an available option.", "Choose a valid ward from the available options."),
        "department": ("Department is required. Choose an available option.", "Choose a valid department from the available options."),
        "doctor": ("Doctor is required. Choose an available option.", "Choose a valid doctor from the available options."),
        "admission_date": ("Admission date is required.", "Admission date must be valid and cannot be in the future."),
        "status": ("Status must be Admitted or Discharged.", "Status must be Admitted or Discharged."),
    }
    messages = []
    for error in exc.errors():
        field = str(error["loc"][-1]) if error.get("loc") else "request"
        missing = error["type"] == "missing"
        if field in labels:
            message = labels[field][0 if missing else 1]
        else:
            message = f"Invalid value for {field}."
        if message not in messages:
            messages.append(message)
    return JSONResponse(status_code=422, content={"detail": " ".join(messages)})


def execute_query(query):
    try:
        return query.execute()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Supabase request failed. Check database connectivity and confirm supabase/schema.sql has been applied.",
        ) from exc

def require_row(data):
    if not data:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        return Patient.model_validate(data[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Patient record returned by database is invalid") from exc


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/health/ready")
def ready():
    execute_query(get_supabase().table(TABLE).select("id").limit(1))
    return {"status": "ready", "database": "connected"}


@app.get("/api/options", response_model=Options)
def options():
    return Options(genders=[x.value for x in Gender], wards=[x.value for x in Ward], departments=[x.value for x in Department], doctors=[x.value for x in Doctor])


@app.get("/api/patients", response_model=PatientList)
def list_patients(search: str | None = Query(default=None, max_length=80), ward: Ward | None = None, department: Department | None = None, doctor: Doctor | None = None, status: str | None = Query(default=None, pattern="^(Admitted|Discharged)$"), limit: int = Query(default=500, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    query = get_supabase().table(TABLE).select("*", count="exact").order("created_at", desc=True)
    if search and search.strip():
        query = query.ilike("name", f"%{search.strip()}%")
    if ward: query = query.eq("ward", ward.value)
    if department: query = query.eq("department", department.value)
    if doctor: query = query.eq("doctor", doctor.value)
    if status: query = query.eq("status", status)
    result = execute_query(query.range(offset, offset + limit - 1))
    items = [Patient.model_validate(row) for row in (result.data or [])]
    return PatientList(items=items, total=result.count or 0)


@app.post("/api/patients", response_model=Patient, status_code=201)
def create_patient(payload: PatientCreate):
    try:
        result = execute_query(get_supabase().table(TABLE).insert({**payload.model_dump(mode="json"), "status": "Admitted"}))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not save patient. Check the Supabase connection and try again.") from exc
    return require_row(result.data)


@app.put("/api/patients/{patient_id}", response_model=Patient)
def update_patient(patient_id: UUID, payload: PatientUpdate):
    result = execute_query(get_supabase().table(TABLE).update(payload.model_dump(mode="json")).eq("id", str(patient_id)))
    return require_row(result.data)


@app.patch("/api/patients/{patient_id}/status", response_model=Patient)
def update_status(patient_id: UUID, payload: PatientStatusUpdate):
    result = execute_query(get_supabase().table(TABLE).update({"status": payload.status}).eq("id", str(patient_id)))
    return require_row(result.data)


@app.delete("/api/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: UUID):
    result = execute_query(get_supabase().table(TABLE).delete().eq("id", str(patient_id)))
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return Response(status_code=204)


