"""Shartnoma shartlarini shakllantirish (O'zbekiston amaliyotiga mos umumiy namuna; yuridik maslahat o'rnini bosmaydi)."""
import uuid
from datetime import date
from app.models import Child, Provider, User


def new_number(db_exists) -> str:
    while True:
        n = f"SH-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
        if not db_exists(n):
            return n


def _fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def add_months(d: date, months: int) -> date:
    y, m = divmod(d.month - 1 + months, 12)
    y += d.year + 0
    m += 1
    day = min(d.day, [31, 29 if y % 4 == 0 and (y % 100 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1])
    return date(y, m, day)


def build_terms(kind: str, prov: Provider, parent: User, child: Child, price: int, unit: str, start: date, end: date, subject: str | None = None) -> list[dict]:
    kid = f"{child.first_name} {child.last_name}"
    period = f"{start.strftime('%d.%m.%Y')} dan {end.strftime('%d.%m.%Y')} gacha"
    if kind == "kindergarten":
        subj = f"Ijrochi Buyurtmachining farzandi {kid} ga maktabgacha ta'lim, tarbiya, parvarish va ovqatlanish xizmatlarini ko'rsatadi."
        pay = f"Xizmat narxi oyiga {_fmt(price)} so'mni tashkil etadi. To'lov har oyning 10-sanasigacha oldindan amalga oshiriladi."
        duties = ["bolaning xavfsizligi va sog'lig'ini ta'minlash;", "kun tartibi va guruh dasturiga rioya qilish;", "ota-onani bolaning holati va rivojlanishi haqida xabardor qilish;", "bolani faqat Buyurtmachi yoki ishonchli shaxs(lar)ga topshirish."]
    else:
        subj = f"Ijrochi Buyurtmachining farzandi {kid} ga{(' «' + subject + '» fanidan') if subject else ''} individual/guruh dars xizmatini ko'rsatadi."
        pay = f"Bir dars narxi {_fmt(price)} so'mni tashkil etadi. To'lov oyning boshida yoki kelishilgan tartibda amalga oshiriladi."
        duties = ["darslarni kelishilgan jadval bo'yicha o'tkazish;", "o'quvchining o'zlashtirishi haqida muntazam hisobot berish;", "dars dasturi va maqsadlarini ota-ona bilan kelishish;", "bekor qilingan darsni oldindan ogohlantirib, boshqa vaqtga ko'chirish."]
    return [
        {"title": "1. Shartnoma predmeti", "text": subj},
        {"title": "2. Shartnoma muddati", "text": f"Shartnoma {period} amal qiladi. Muddat tugagach, tomonlar kelishuviga ko'ra yangilanishi mumkin."},
        {"title": "3. To'lov tartibi", "text": pay + " To'lov bank o'tkazmasi yoki naqd pul orqali, kvitansiya/chek bilan tasdiqlanadi."},
        {"title": "4. Ijrochining majburiyatlari", "text": "Ijrochi: " + " ".join(duties)},
        {"title": "5. Buyurtmachining majburiyatlari", "text": "Buyurtmachi: to'lovni o'z vaqtida amalga oshirish; bola haqida to'g'ri va to'liq ma'lumot berish (shu jumladan sog'lig'i va allergiyalari); ichki tartib qoidalarga rioya qilish; kelmaslik haqida oldindan xabar berish."},
        {"title": "6. Maxfiylik", "text": "Tomonlar bola va oila haqidagi shaxsiy ma'lumotlarni uchinchi shaxslarga faqat qonunda belgilangan hollarda va tomonning roziligi bilan beradi. Ma'lumotlar «Shaxsga doir ma'lumotlar to'g'risida»gi qonunga muvofiq qayta ishlanadi."},
        {"title": "7. Shartnomani bekor qilish", "text": "Har bir tomon 14 kun oldin yozma (platforma orqali) ogohlantirib, shartnomani bekor qilishi mumkin. Foydalanilmagan to'lov qismi tomonlar kelishuviga binoan qaytariladi."},
        {"title": "8. Nizolarni hal qilish", "text": "Nizolar avvalo muzokaralar yo'li bilan, kelishuvga erishilmasa O'zbekiston Respublikasi qonunchiligiga muvofiq sud orqali hal qilinadi."},
        {"title": "9. Elektron imzo", "text": "Tomonlar platformada ism-familiyani kiritib tasdiqlashni shartnomani imzolash deb tan oladi. Imzo vaqti va tomonlar ma'lumotlari tizimda saqlanadi."},
    ]
