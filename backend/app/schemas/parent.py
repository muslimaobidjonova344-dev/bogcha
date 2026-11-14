from datetime import date
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import ORM


class ChildIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    birth_date: date
    education_level: str | None = Field(default=None, max_length=60)
    interests: list[str] = Field(default_factory=list, max_length=20)
    parent_note: str | None = Field(default=None, max_length=1000)
    extra_info: str | None = Field(default=None, max_length=2000)

    @field_validator("birth_date")
    @classmethod
    def _bd(cls, v):
        today = date.today()
        if v > today or (today.year - v.year) > 25:
            raise ValueError("Tug'ilgan sana noto'g'ri")
        return v


class ChildUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_name: str | None = Field(default=None, min_length=1, max_length=80)
    birth_date: date | None = None
    education_level: str | None = None
    interests: list[str] | None = None
    parent_note: str | None = None
    extra_info: str | None = None


class ChildOut(ORM):
    id: str
    first_name: str
    last_name: str
    birth_date: date
    education_level: str | None
    interests: list
    parent_note: str | None
    extra_info: str | None
    age: int | None = None
    age_text: str | None = None


class ParentProfileIn(BaseModel):
    region_id: int | None = None
    district_id: int | None = None
    address: str | None = Field(default=None, max_length=300)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
