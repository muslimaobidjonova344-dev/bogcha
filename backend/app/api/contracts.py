from datetime import date, datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import client_ip, get_current_user, require_roles
from app.core.errors import AppError, Forbidden, NotFound
from app.core.security import now_utc
from app.models import Application, Child, Contract, Provider, TutorService, User
from app.services import contracts as svc
from app.services.audit import audit
from app.services.notify import notify

router = APIRouter(tags=["contracts"])


class ContractIn(BaseModel):
    start_date: date
    months: int = Field(default=12, ge=1, le=36)
    price: int | None = Field(default=None, ge=1000, le=100_000_000)
    sign_name: str = Field(min_length=3, max_length=150)


class SignIn(BaseModel):
    full_name: str = Field(min_length=3, max_length=150)


def _provider_of(db: Session, user: User) -> Provider | None:
    return db.query(Provider).filter(Provider.owner_user_id == user.id, Provider.deleted_at.is_(None)).first()


def _out(db: Session, c: Contract) -> dict:
    prov = db.get(Provider, c.provider_id)
    parent = db.get(User, c.parent_user_id)
    child = db.get(Child, c.child_id)
    app = db.query(Application).filter(Application.id == c.application_id).first()
    return {"id": c.id, "number": c.number, "status": c.status, "kind": c.kind, "price": c.price, "price_unit": c.price_unit,
            "start_date": c.start_date, "end_date": c.end_date, "terms": c.terms, "created_at": c.created_at,
            "application_id": c.application_id, "application_number": app.number if app else None,
            "provider": {"id": prov.id, "name": prov.name, "address": prov.address, "phone": prov.phone, "email": prov.email},
            "parent": {"full_name": parent.full_name, "phone": parent.phone, "email": parent.email},
            "child": {"full_name": f"{child.first_name} {child.last_name}", "birth_date": child.birth_date},
            "provider_signed_at": c.provider_signed_at, "provider_signed_name": c.provider_signed_name,
            "parent_signed_at": c.parent_signed_at, "parent_signed_name": c.parent_signed_name}


def _mine(db: Session, user: User, cid: str) -> tuple[Contract, str]:
    c = db.get(Contract, cid)
    if not c:
        raise NotFound("Shartnoma topilmadi")
    if user.role == "parent" and c.parent_user_id == user.id:
        return c, "parent"
    if user.role in ("kindergarten_admin", "tutor"):
        p = _provider_of(db, user)
        if p and p.id == c.provider_id:
            return c, "provider"
    if user.role == "super_admin":
        return c, "admin"
    raise NotFound("Shartnoma topilmadi")


@router.post("/me/provider/applications/{aid}/contract", status_code=201)
def create_contract(aid: str, data: ContractIn, user: User = Depends(require_roles("kindergarten_admin", "tutor")), db: Session = Depends(get_db)):
    prov = _provider_of(db, user)
    app = db.get(Application, aid)
    if not prov or not app or app.provider_id != prov.id:
        raise NotFound("Ariza topilmadi")
    if app.status != "ACCEPTED":
        raise AppError("Shartnoma faqat qabul qilingan ariza uchun tuziladi", 409, "not_accepted")
    if db.query(Contract).filter(Contract.application_id == app.id).first():
        raise AppError("Bu ariza uchun shartnoma allaqachon tuzilgan", 409, "exists")
    child = db.get(Child, app.child_id)
    parent = db.get(User, app.parent_user_id)
    unit = "month" if app.type == "kindergarten" else "lesson"
    price = data.price
    if price is None:
        if app.type == "kindergarten":
            price = prov.monthly_price or 0
        else:
            sv = db.get(TutorService, app.service_id) if app.service_id else None
            price = (sv.price if sv else None) or prov.hourly_price or 0
    if price < 1000:
        raise AppError("Narxni kiriting", 422, "price_required")
    end = svc.add_months(data.start_date, data.months)
    number = svc.new_number(lambda n: db.query(Contract).filter(Contract.number == n).first() is not None)
    c = Contract(number=number, application_id=app.id, provider_id=prov.id, parent_user_id=parent.id, child_id=child.id, kind=app.type,
                 price=price, price_unit=unit, start_date=data.start_date, end_date=end, status="sent",
                 terms=svc.build_terms(app.type, prov, parent, child, price, unit, data.start_date, end, app.subject),
                 provider_signed_at=now_utc(), provider_signed_name=data.sign_name.strip())
    db.add(c)
    audit(db, user.id, "contract.create", "contract", c.id, {"number": number})
    notify(db, parent.id, "contract_sent", "Shartnoma imzolashga tayyor", f"{prov.name}: {number}", f"/parent/contracts/{c.id}", send_email=True)
    db.commit()
    return _out(db, c)


@router.get("/contracts")
def list_contracts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Contract)
    if user.role == "parent":
        q = q.filter(Contract.parent_user_id == user.id)
    elif user.role in ("kindergarten_admin", "tutor"):
        p = _provider_of(db, user)
        if not p:
            return {"items": []}
        q = q.filter(Contract.provider_id == p.id)
    elif user.role != "super_admin":
        raise Forbidden("Ruxsat yo'q")
    return {"items": [_out(db, c) for c in q.order_by(Contract.created_at.desc()).limit(200)]}


@router.get("/contracts/by-application/{aid}")
def by_application(aid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.application_id == aid).first()
    if not c:
        return {"contract": None}
    _mine(db, user, c.id)
    return {"contract": _out(db, c)}


@router.get("/contracts/{cid}")
def get_contract(cid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c, _ = _mine(db, user, cid)
    return _out(db, c)


@router.post("/contracts/{cid}/sign")
def sign_contract(cid: str, data: SignIn, user: User = Depends(require_roles("parent")), db: Session = Depends(get_db)):
    c, who = _mine(db, user, cid)
    if c.status != "sent" or c.parent_signed_at:
        raise AppError("Shartnoma imzolash holatida emas", 409, "bad_state")
    if data.full_name.strip().lower() != user.full_name.strip().lower():
        raise AppError("Imzo uchun profildagi to'liq ism-familiyangizni aynan kiriting", 422, "name_mismatch")
    c.parent_signed_at = now_utc()
    c.parent_signed_name = data.full_name.strip()
    c.status = "active"
    prov = db.get(Provider, c.provider_id)
    notify(db, prov.owner_user_id, "contract_signed", "Shartnoma imzolandi", f"{c.number}: ota-ona imzoladi", f"/provider/contracts/{c.id}")
    audit(db, user.id, "contract.sign", "contract", c.id)
    db.commit()
    return _out(db, c)


@router.post("/contracts/{cid}/cancel")
def cancel_contract(cid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c, who = _mine(db, user, cid)
    if who == "admin" or c.status == "cancelled":
        raise AppError("Bekor qilib bo'lmaydi", 409, "bad_state")
    c.status = "cancelled"
    other = c.parent_user_id if who == "provider" else db.get(Provider, c.provider_id).owner_user_id
    notify(db, other, "contract_cancelled", "Shartnoma bekor qilindi", c.number, None)
    audit(db, user.id, "contract.cancel", "contract", c.id)
    db.commit()
    return _out(db, c)
