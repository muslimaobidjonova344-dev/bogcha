from html import escape


def render_button_email(name: str, title: str, text: str, button: str, link: str, minutes: int | None) -> str:
    expiry = (f'<p style="color:#666;font-size:13px">Havola <b>{minutes} daqiqa</b> davomida amal qiladi.</p>'
              if minutes else "")
    return f"""<!doctype html><html><body style="margin:0;background:#FBF8F0;font-family:Inter,Arial,sans-serif;color:#333">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:#245C43;padding:22px 28px;color:#fff;font-size:22px;font-weight:700">🌱 Kichkintoy</td></tr>
<tr><td style="padding:28px">
<p style="font-size:16px">Assalomu alaykum, <b>{escape(name or 'foydalanuvchi')}</b>!</p>
<h2 style="color:#245C43;margin:8px 0 12px">{escape(title)}</h2>
<p style="line-height:1.6">{escape(text)}</p>
<p style="margin:24px 0"><a href="{escape(link)}" style="background:#245C43;color:#fff;text-decoration:none;padding:13px 26px;border-radius:12px;font-weight:600;display:inline-block">{escape(button)}</a></p>
{expiry}
<p style="color:#666;font-size:13px">Tugma ishlamasa, havolani brauzerga nusxalang:<br><span style="word-break:break-all;color:#245C43">{escape(link)}</span></p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="color:#8a6d00;background:#FFF6D9;padding:10px 12px;border-radius:10px;font-size:13px">⚠️ Xavfsizlik: agar bu so'rovni siz yubormagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring. Havolani hech kimga bermang.</p>
<p style="color:#888;font-size:12px">Yordam kerakmi? Platformadagi «Yordam» bo'limiga murojaat qiling.</p>
</td></tr></table></td></tr></table></body></html>"""


def render_code_email(name: str, title: str, text: str, code: str, minutes: int) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#FBF8F0;font-family:Inter,Arial,sans-serif;color:#333">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
<tr><td style="background:#245C43;padding:22px 28px;color:#fff;font-size:22px;font-weight:700">🌱 Kichkintoy</td></tr>
<tr><td style="padding:28px;text-align:center">
<p style="font-size:16px;text-align:left">Assalomu alaykum, <b>{escape(name or 'foydalanuvchi')}</b>!</p>
<h2 style="color:#245C43;margin:8px 0 12px">{escape(title)}</h2>
<p style="line-height:1.6;text-align:left">{escape(text)}</p>
<p style="margin:24px 0;font-size:38px;font-weight:800;letter-spacing:12px;color:#245C43;background:#EEF5F1;border-radius:14px;padding:16px 0">{escape(code)}</p>
<p style="color:#666;font-size:13px">Kod <b>{minutes} daqiqa</b> davomida amal qiladi.</p>
<p style="color:#8a6d00;background:#FFF6D9;padding:10px 12px;border-radius:10px;font-size:13px;text-align:left">⚠️ Xavfsizlik: kodni hech kimga bermang. Agar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.</p>
</td></tr></table></td></tr></table></body></html>"""
