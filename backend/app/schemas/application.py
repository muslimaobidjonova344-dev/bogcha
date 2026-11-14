from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator


class KgApplicationIn(BaseModel):
    child_id: str
    provider_id: str
    group_id: str
    parent_note: str | None = Field(default=None, max_length=1500)
    desired_start_date: date | None = None


class TutorRequestIn(BaseModel):
    child_id: str
    provider_id: str
    service_id: str
    grade: str | None = Field(default=None, max_length=30)
    desired_slot_start: datetime | None = None
    parent_note: str | None = Field(default=None, max_length=1500)


class StatusIn(BaseModel):
    status: str = Field(pattern="^(UNDER_REVIEW|MORE_INFO_REQUIRED|INTERVIEW_SCHEDULED|ACCEPTED|REJECTED)$")
    note: str | None = Field(default=None, max_length=2000)
    interview_at: datetime | None = None


class NoteIn(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


class CancelIn(BaseModel):
    note: str | None = Field(default=None, max_length=1000)
