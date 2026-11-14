from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import Forbidden, NotFound
from app.models import (Conversation, ConversationMember, Message, Provider, ProviderDocument, UploadedFile, User)
from app.services import storage

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/public-image", status_code=201)
async def upload_public_image(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logo, muqova, galereya, avatar: ochiq rasm."""
    rec = await storage.save_upload(db, user.id, file, private=False, allow_pdf=False)
    db.commit()
    return {"id": rec.id, "url": storage.public_url(rec)}


@router.post("/private", status_code=201)
async def upload_private(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Hujjat/chat fayli: maxfiy bucket, faqat ruxsatli shaxslar yuklab oladi."""
    rec = await storage.save_upload(db, user.id, file, private=True)
    db.commit()
    return {"id": rec.id, "filename": rec.filename, "content_type": rec.content_type, "size": rec.size}


def _can_read(db: Session, user: User, rec: UploadedFile) -> bool:
    if user.role == "super_admin" or rec.owner_id == user.id:
        return True
    # chat faylini suhbat a'zolari ko'ra oladi
    msg = db.query(Message).filter(Message.file_id == rec.id).first()
    if msg:
        return db.query(ConversationMember).filter(ConversationMember.conversation_id == msg.conversation_id,
                                                   ConversationMember.user_id == user.id).first() is not None
    return False


@router.get("/{fid}/download")
async def download(fid: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.get(UploadedFile, fid)
    if not rec:
        raise NotFound("Fayl topilmadi")
    if rec.is_private and not _can_read(db, user, rec):
        raise Forbidden()
    data = await storage.read_private(rec) if rec.is_private else await storage.read_private(rec)
    return Response(data, media_type=rec.content_type,
                    headers={"Content-Disposition": f'inline; filename="{rec.filename}"', "Cache-Control": "private, no-store"})
