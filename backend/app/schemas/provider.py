from datetime import time
from pydantic import BaseModel, Field, model_validator


class ProviderProfileIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    logo_url: str | None = None
    cover_url: str | None = None
    short_description: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    region_id: int | None = None
    district_id: int | None = None
    address: str | None = Field(default=None, max_length=300)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    work_days: list[int] | None = None
    work_open: time | None = None
    work_close: time | None = None
    # bog'cha
    ownership: str | None = Field(default=None, pattern="^(state|private)$")
    meal_type: str | None = Field(default=None, max_length=40)
    monthly_price: int | None = Field(default=None, ge=0, le=100_000_000)
    min_age: int | None = Field(default=None, ge=0, le=18)
    max_age: int | None = Field(default=None, ge=0, le=18)
    amenities: list[str] | None = None
    gallery: list[str] | None = None
    # repetitor
    specialty: str | None = Field(default=None, max_length=200)
    education_degree: str | None = Field(default=None, max_length=100)
    education_institution: str | None = Field(default=None, max_length=200)
    experience_years: int | None = Field(default=None, ge=0, le=70)
    teaching_style: str | None = Field(default=None, max_length=3000)
    intro_video_url: str | None = Field(default=None, max_length=500)
    lesson_mode: str | None = Field(default=None, pattern="^(online|offline|both)$")
    service_area: str | None = Field(default=None, max_length=300)
    languages: list[str] | None = None
    hourly_price: int | None = Field(default=None, ge=0, le=100_000_000)

    @model_validator(mode="after")
    def _chk(self):
        if self.work_open and self.work_close and self.work_open >= self.work_close:
            raise ValueError("Ish vaqti noto'g'ri: boshlanish tugashdan oldin bo'lishi kerak")
        if self.work_days and any(d < 1 or d > 7 for d in self.work_days):
            raise ValueError("Ish kunlari 1..7 oralig'ida bo'lishi kerak")
        if self.min_age is not None and self.max_age is not None and self.min_age > self.max_age:
            raise ValueError("Yosh chegarasi noto'g'ri")
        return self


class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    min_age: int = Field(ge=0, le=18)
    max_age: int = Field(ge=0, le=18)
    capacity: int = Field(ge=1, le=200)
    teacher_id: str | None = None
    schedule_text: str | None = Field(default=None, max_length=2000)
    meal_type: str | None = Field(default=None, max_length=60)
    extra_services: list[str] = Field(default_factory=list)
    monthly_price: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _chk(self):
        if self.min_age > self.max_age:
            raise ValueError("Yosh chegarasi noto'g'ri")
        return self


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    min_age: int | None = Field(default=None, ge=0, le=18)
    max_age: int | None = Field(default=None, ge=0, le=18)
    capacity: int | None = Field(default=None, ge=1, le=200)
    teacher_id: str | None = None
    schedule_text: str | None = None
    meal_type: str | None = None
    extra_services: list[str] | None = None
    monthly_price: int | None = Field(default=None, ge=0)


class StaffIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    position: str = Field(default="Tarbiyachi", max_length=100)
    phone: str | None = Field(default=None, max_length=20)
    experience_years: int | None = Field(default=None, ge=0, le=70)
    photo_url: str | None = None


class SubjectsIn(BaseModel):
    subjects: list[str] = Field(max_length=30)


class ServiceIn(BaseModel):
    subject: str = Field(min_length=2, max_length=100)
    education_level: str = Field(max_length=60)
    grades: list[str] = Field(default_factory=list)
    duration_minutes: int = Field(ge=15, le=300)
    format: str = Field(pattern="^(individual|group)$")
    mode: str = Field(pattern="^(online|offline)$")
    price: int = Field(ge=0, le=100_000_000)
    language: str = Field(default="uz", max_length=10)
    description: str | None = Field(default=None, max_length=2000)


class ScheduleWindow(BaseModel):
    weekday: int = Field(ge=1, le=7)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def _chk(self):
        if self.start_time >= self.end_time:
            raise ValueError("Boshlanish vaqti tugashdan oldin bo'lishi kerak")
        return self


class ScheduleIn(BaseModel):
    windows: list[ScheduleWindow] = Field(max_length=100)

    @model_validator(mode="after")
    def _no_overlap(self):
        by_day: dict[int, list] = {}
        for w in self.windows:
            by_day.setdefault(w.weekday, []).append(w)
        for ws in by_day.values():
            ws.sort(key=lambda w: w.start_time)
            for a, b in zip(ws, ws[1:]):
                if b.start_time < a.end_time:
                    raise ValueError("Bo'sh vaqt oynalari ustma-ust tushmasligi kerak")
        return self


class DocumentIn(BaseModel):
    doc_type: str = Field(pattern="^(license|diploma|certificate|id|other)$")
    title: str = Field(default="", max_length=200)
    file_id: str
