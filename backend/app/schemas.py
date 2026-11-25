from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class Gender(str, Enum):
    female = "Female"
    male = "Male"
    other = "Other"


class Ward(str, Enum):
    general = "General Ward"
    icu = "ICU"
    pediatric = "Pediatrics"
    maternity = "Maternity"
    surgical = "Surgical Ward"
    private = "Private Room"


class Department(str, Enum):
    cardiology = "Cardiology"
    neurology = "Neurology"
    orthopedics = "Orthopedics"
    pediatrics = "Pediatrics"
    general_medicine = "General Medicine"
    surgery = "Surgery"
    oncology = "Oncology"
    gynecology = "Gynecology"


class Doctor(str, Enum):
    sharma = "Dr. Ananya Sharma"
    mehta = "Dr. Rohan Mehta"
    rao = "Dr. Priya Rao"
    kapoor = "Dr. Arjun Kapoor"
    nair = "Dr. Meera Nair"
    das = "Dr. Kunal Das"


PatientName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, pattern=r"^[A-Za-z]+(?: [A-Za-z]+)*$")]


class PatientFields(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="forbid")

    name: PatientName
    age: int = Field(strict=True, ge=0, le=120)
    gender: Gender
    ward: Ward
    department: Department
    doctor: Doctor
    admission_date: date

    @field_validator("admission_date")
    @classmethod
    def admission_not_in_future(cls, value: date) -> date:
        if value > datetime.now(timezone(timedelta(hours=5, minutes=30))).date():
            raise ValueError("Admission date cannot be in the future")
        return value


class PatientCreate(PatientFields):
    pass


class PatientUpdate(PatientFields):
    pass


class Patient(PatientFields):
    id: UUID
    status: str = "Admitted"
    created_at: str | None = None
    updated_at: str | None = None


class PatientStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str = Field(pattern=r"^(Admitted|Discharged)$")


class PatientList(BaseModel):
    items: list[Patient]
    total: int


class Options(BaseModel):
    genders: list[str]
    wards: list[str]
    departments: list[str]
    doctors: list[str]

