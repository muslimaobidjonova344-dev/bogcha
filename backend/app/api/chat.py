from datetime import datetime
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, get_db
from app.core.deps import get_current_user, require_verified
from app.core.errors import AppError, Forbidden, NotFound
from app.core.security import decode_access_token, now_utc
from app.models import (Application, Conversation, ConversationMember, Message, Notification, Provider, UploadedFile, User, UserSession)
from app.services.notify import notify
from app.services.realtime import hub

router = APIRouter(tags=["chat"])


class StartIn(BaseModel):
    provider_id: str


class MessageIn(BaseModel):
    kind: str = Field(default="text", pattern="^(text|image|document)$")
    body: str | None = Field(default=None, max_length=4000)
    file_id: str | None = None

    @model_validator(mode="after")
    def _chk(self):
        if self.kind == "text" and not (self.body and self.body.strip()):
            raise ValueError("Xabar bo'sh bo'lmasligi kerak")
        if self.kind != "text" and not self.file_id:
            raise ValueError("Fayl tanlanmagan")
        return self


def _member(db: Session, user: User, cid: str) -> Conversation:
    conv = db.get(Conversation, cid)
    if not conv or not db.query(ConversationMember).filter(ConversationMember.conversation_id == cid, ConversationMember.user_id == user.id).first():
        raise NotFound("Suhbat topilmadi")
    return conv


def _msg_out(m: Message, db: Session) -> dict:
    f = db.get(UploadedFile, m.file_id) if m.file_id else None
    return {"id": m.id, "conversation_id": m.conversation_id, "sender_id": m.sender_id, "kind": m.kind,
            "body": None if m.hidden else m.body, "hidden": m.hidden,
            "file": {"id": f.id, "filename": f.filename, "content_type": f.content_type, "size": f.size} if f and not m.hidden else None,
            "created_at": m.created_at, "read_at": m.read_at}


@router.post("/conversations", status_code=201)
def start_conversation(data: StartIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    if user.role != "parent":
        raise Forbidden("Suhbatni ota-ona boshlaydi")
    prov = db.get(Provider, data.provider_id)
    if not prov or prov.deleted_at or prov.verification_status != "approved":
        raise NotFound("Muassasa topilmadi")
    conv = db.query(Conversation).filter(Conversation.parent_user_id == user.id, Conversation.provider_id == prov.id).first()
    if not conv:
        conv = Conversation(parent_user_id=user.id, provider_id=prov.id)
        db.add(conv)
        db.flush()
        db.add(ConversationMember(conversation_id=conv.id, user_id=user.id))
        db.add(ConversationMember(conversation_id=conv.id, user_id=prov.owner_user_id))
        db.commit()
    return {"id": conv.id}


@router.get("/conversations")
def conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == user.id)]
    convs = db.query(Conversation).filter(Conversation.id.in_(ids or [""])).order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc()).all()
    out = []
    for c in convs:
        prov = db.get(Provider, c.provider_id)
        other = db.get(User, c.parent_user_id) if user.id != c.parent_user_id else None
        last = db.query(Message).filter(Message.conversation_id == c.id, Message.hidden.is_(False)).order_by(Message.created_at.desc()).first()
        unread = db.query(Message).filter(Message.conversation_id == c.id, Message.sender_id != user.id, Message.read_at.is_(None), Message.hidden.is_(False)).count()
        title = prov.name if user.id == c.parent_user_id else (other.full_name if other else "Ota-ona")
        out.append({"id": c.id, "title": title, "provider_id": prov.id, "provider_type": prov.type,
                    "last_message": ({"kind": last.kind, "body": last.body, "created_at": last.created_at, "sender_id": last.sender_id} if last else None),
                    "unread_count": unread, "last_message_at": c.last_message_at})
    return out


@router.get("/conversations/{cid}/messages")
def messages(cid: str, before: datetime | None = None, limit: int = Query(40, ge=1, le=100),
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _member(db, user, cid)
    q = db.query(Message).filter(Message.conversation_id == cid)
    if before:
        q = q.filter(Message.created_at < before)
    rows = q.order_by(Message.created_at.desc()).limit(limit).all()
    return [_msg_out(m, db) for m in reversed(rows)]


@router.post("/conversations/{cid}/messages", status_code=201)
def send_message(cid: str, data: MessageIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = _member(db, user, cid)
    if data.file_id:
        f = db.get(UploadedFile, data.file_id)
        if not f or f.owner_id != user.id:
            raise AppError("Fayl topilmadi", 422, "validation")
        if data.kind == "image" and not f.content_type.startswith("image/"):
            raise AppError("Fayl rasm emas", 422, "validation")
    m = Message(conversation_id=cid, sender_id=user.id, kind=data.kind, body=(data.body or "").strip() or None, file_id=data.file_id)
    db.add(m)
    conv.last_message_at = now_utc()
    db.flush()
    other_id = next(x.user_id for x in db.query(ConversationMember).filter(ConversationMember.conversation_id == cid) if x.user_id != user.id)
    link = f"/messages/{cid}"
    exists = db.query(Notification).filter(Notification.user_id == other_id, Notification.type == "new_message",
                                           Notification.link == link, Notification.read_at.is_(None)).first()
    if not exists:  # har xabar uchun emas, o'qilmagan suhbat uchun bitta bildirishnoma
        notify(db, other_id, "new_message", "Yangi xabar", f"{user.full_name}: {(m.body or 'fayl')[:100]}", link)
    out = _msg_out(m, db)
    db.commit()
    hub.publish(other_id, {"type": "message", "message": jsonable(out)})
    hub.publish(user.id, {"type": "message", "message": jsonable(out)})
    return out


def jsonable(d: dict) -> dict:
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in d.items()}


@router.post("/conversations/{cid}/read")
def mark_read(cid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _member(db, user, cid)
    now = now_utc()
    db.query(Message).filter(Message.conversation_id == cid, Message.sender_id != user.id, Message.read_at.is_(None)).update({"read_at": now})
    db.query(Notification).filter(Notification.user_id == user.id, Notification.type == "new_message",
                                  Notification.link == f"/messages/{cid}", Notification.read_at.is_(None)).update({"read_at": now})
    db.commit()
    for m in db.query(ConversationMember).filter(ConversationMember.conversation_id == cid, ConversationMember.user_id != user.id):
        hub.publish(m.user_id, {"type": "read", "conversation_id": cid})
    return {"ok": True}


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    token = ws.cookies.get("access_token") or ws.query_params.get("token")
    data = decode_access_token(token) if token else None
    if not data:
        await ws.close(code=4401)
        return
    db = SessionLocal()
    try:
        s = db.get(UserSession, data["sid"])
        u = db.get(User, data["sub"])
        ok = s and not s.revoked_at and s.expires_at > now_utc() and u and u.is_active and not u.deleted_at
    finally:
        db.close()
    if not ok:
        await ws.close(code=4401)
        return
    await ws.accept()
    await hub.connect(data["sub"], ws)
    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(data["sub"], ws)
