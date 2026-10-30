"""Transactional email sending through the Emergent managed email proxy.

Only used to deliver Nūr Protocol's own one-time activation codes.
`_assert_safe_email` is a hard gate: it runs on every send path.
"""
import os
import re
import asyncio
import ipaddress
import logging
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
            if resp.status_code == 429:
                # Provider burst limit — one short retry keeps a real customer from
                # seeing a failure when two codes are requested at the same second.
                await asyncio.sleep(2)
                resp = await client.post(
                    f"{EMAIL_BASE_URL}/api/v1/email/send",
                    headers={"X-Email-Key": EMAIL_KEY},
                    json=payload,
                )
            if resp.status_code == 429:
                logger.warning("Email rate limited by provider for %s", to)
                raise HTTPException(status_code=503, detail="email_unavailable")
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
            message = e.response.json().get("message", "")
        except ValueError:
            code, message = "", ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning(f"Email paused: {code} ({e.response.status_code}): {message}")
            raise HTTPException(status_code=503, detail="email_unavailable")
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="email_send_failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="email_send_failed")


# ---------- Server-side templates (callers only pass IDs / codes, never markup) ----------
_OTP_COPY = {
    "fr": {
        "subject": "Votre code d'activation Nūr : {code}",
        "hello": "Bienvenue dans votre rituel Nūr",
        "intro": "Voici votre code d'activation personnel. Saisissez-le dans l'application pour ouvrir votre Skincoach.",
        "valid": "Ce code est valable 10 minutes.",
        "ignore": "Vous n'avez pas demandé ce code ? Ignorez simplement ce message, aucun accès n'est créé.",
        "foot": "Envoyé par {brand}. Nous ne vous demanderons jamais votre mot de passe ni vos informations bancaires par e-mail.",
    },
    "en": {
        "subject": "Your Nūr activation code: {code}",
        "hello": "Welcome to your Nūr ritual",
        "intro": "Here is your personal activation code. Enter it in the app to open your Skincoach.",
        "valid": "This code is valid for 10 minutes.",
        "ignore": "Didn't request this code? Simply ignore this message — no access is created.",
        "foot": "Sent by {brand}. We will never ask for your password or payment details by email.",
    },
    "es": {
        "subject": "Tu código de activación Nūr: {code}",
        "hello": "Bienvenida a tu ritual Nūr",
        "intro": "Este es tu código de activación personal. Introdúcelo en la aplicación para abrir tu Skincoach.",
        "valid": "Este código es válido durante 10 minutos.",
        "ignore": "¿No lo has solicitado? Ignora este mensaje, no se crea ningún acceso.",
        "foot": "Enviado por {brand}. Nunca te pediremos tu contraseña ni tus datos bancarios por correo.",
    },
    "it": {
        "subject": "Il tuo codice di attivazione Nūr: {code}",
        "hello": "Benvenuta nel tuo rituale Nūr",
        "intro": "Ecco il tuo codice di attivazione personale. Inseriscilo nell'app per aprire il tuo Skincoach.",
        "valid": "Questo codice è valido per 10 minuti.",
        "ignore": "Non hai richiesto questo codice? Ignora questo messaggio, nessun accesso viene creato.",
        "foot": "Inviato da {brand}. Non chiederemo mai la tua password o i dati bancari via email.",
    },
    "de": {
        "subject": "Ihr Nūr Aktivierungscode: {code}",
        "hello": "Willkommen zu Ihrem Nūr Ritual",
        "intro": "Hier ist Ihr persönlicher Aktivierungscode. Geben Sie ihn in der App ein, um Ihren Skincoach zu öffnen.",
        "valid": "Dieser Code ist 10 Minuten gültig.",
        "ignore": "Sie haben diesen Code nicht angefordert? Ignorieren Sie diese Nachricht, es wird kein Zugang erstellt.",
        "foot": "Gesendet von {brand}. Wir fragen niemals per E-Mail nach Ihrem Passwort oder Ihren Bankdaten.",
    },
    "ru": {
        "subject": "Ваш код активации Nūr: {code}",
        "hello": "Ваш ритуал Nūr",
        "intro": "Это ваш персональный код активации. Введите его в приложении, чтобы открыть Skincoach.",
        "valid": "Код действует 10 минут.",
        "ignore": "Не запрашивали код? Просто проигнорируйте это письмо — доступ не создаётся.",
        "foot": "Отправлено {brand}. Мы никогда не спрашиваем пароль или банковские данные по email.",
    },
    "ar": {
        "subject": "رمز تنشيط نُور: {code}",
        "hello": "مرحباً بكِ في روتين نُور",
        "intro": "هذا رمز التنشيط الخاص بكِ. أدخليه في التطبيق لفتح Skincoach.",
        "valid": "الرمز صالح لمدة 10 دقائق.",
        "ignore": "لم تطلبي هذا الرمز؟ تجاهلي هذه الرسالة، لن يتم إنشاء أي حساب.",
        "foot": "أُرسلت بواسطة {brand}. لن نطلب منكِ كلمة المرور أو بيانات البطاقة عبر البريد.",
    },
}


_OPEN_CTA = {
    "fr": "Ouvrir mon Skincoach",
    "en": "Open my Skincoach",
    "es": "Abrir mi Skincoach",
    "it": "Apri il mio Skincoach",
    "de": "Skincoach öffnen",
    "ru": "Открыть Skincoach",
    "ar": "افتحي Skincoach",
}
_OPEN_HINT = {
    "fr": "Ce bouton ouvre l'application déjà activée, sans rien recopier. Lien valable 30 minutes.",
    "en": "This button opens the app already activated — nothing to retype. The link lasts 30 minutes.",
    "es": "Este botón abre la aplicación ya activada, sin copiar nada. El enlace dura 30 minutos.",
    "it": "Questo pulsante apre l'app già attivata, senza ricopiare nulla. Il link dura 30 minuti.",
    "de": "Diese Schaltfläche öffnet die App bereits aktiviert — nichts abzutippen. Der Link gilt 30 Minuten.",
    "ru": "Эта кнопка открывает приложение уже активированным. Ссылка действует 30 минут.",
    "ar": "هذا الزر يفتح التطبيق مفعّلاً مباشرة. الرابط صالح 30 دقيقة.",
}


def _open_button(link: str, lang: str) -> str:
    """One-tap activation button. Returns an empty string when no link is available."""
    if not link:
        return ""
    label = escape(_OPEN_CTA.get(lang, _OPEN_CTA["fr"]))
    hint = escape(_OPEN_HINT.get(lang, _OPEN_HINT["fr"]))
    href = escape(link, quote=True)
    return (
        '<tr><td align="center" style="padding:4px 0 10px">'
        f'<a href="{href}" style="display:inline-block;background:#C9A961;color:#1A1208;'
        'text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;'
        f'padding:16px 30px;border-radius:999px">{label}</a></td></tr>'
        '<tr><td align="center" style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:11px;line-height:17px;color:#ADA392">{hint}</td></tr>'
    )


def _otp_html(code: str, lang: str, link: str = "") -> str:
    c = _OTP_COPY.get(lang, _OTP_COPY["fr"])
    brand = escape(EMAIL_FROM_NAME)
    safe_code = escape(code)
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#FBF7F0;padding:32px 0;font-family:Georgia,\'Times New Roman\',serif">'
        '<tr><td align="center">'
        '<table role="presentation" width="460" cellpadding="0" cellspacing="0" '
        'style="background:#FFFFFF;border:1px solid #E8DCC4;border-radius:18px;padding:36px 32px">'
        f'<tr><td align="center" style="font-size:12px;letter-spacing:4px;color:#A98C4E">{brand.upper()}</td></tr>'
        f'<tr><td align="center" style="padding-top:16px;font-size:23px;color:#3A2F21">{escape(c["hello"])}</td></tr>'
        '<tr><td align="center" style="padding:12px 0"><span style="color:#C9A961">&#9670;</span></td></tr>'
        '<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        f'line-height:21px;color:#6B5F4F">{escape(c["intro"])}</td></tr>'
        '<tr><td style="padding-top:24px"></td></tr>'
        + _open_button(link, lang) +
        '<tr><td align="center" style="padding:10px 0 20px">'
        '<div style="display:inline-block;background:#FBF7F0;border:1px solid #C9A961;border-radius:14px;'
        'padding:18px 28px;font-family:Menlo,Consolas,monospace;font-size:34px;letter-spacing:10px;'
        f'color:#3A2F21">{safe_code}</div></td></tr>'
        '<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;'
        f'color:#A98C4E">{escape(c["valid"])}</td></tr>'
        '<tr><td align="center" style="padding-top:22px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:12px;line-height:18px;color:#8C8171">{escape(c["ignore"])}</td></tr>'
        '<tr><td align="center" style="padding-top:22px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:11px;line-height:17px;color:#ADA392">{escape(c["foot"]).format(brand=brand)}</td></tr>'
        '</table></td></tr></table>'
    )


async def send_otp_email(*, to: str, code: str, lang: str = "fr", link: str = "") -> str | None:
    c = _OTP_COPY.get(lang, _OTP_COPY["fr"])
    subject = c["subject"].format(code=code)
    return await send_email(to=to, subject=subject, html=_otp_html(code, lang, link))


# ---------- Access codes delivered right after a paid Shopify order ----------
_ORDER_COPY = {
    "fr": {
        "subject": "Votre accès Nūr Protocol — commande {order}",
        "hello": "Votre accès est prêt",
        "intro": "Merci pour votre commande {order}. Voici votre code d'accès à l'application Nūr Protocol, votre Skincoach personnel.",
        "intro_multi": "Merci pour votre commande {order}. Voici vos {count} codes d'accès à l'application Nūr Protocol — un par masque.",
        "gift": "Ce masque est un cadeau ? Transmettez ce code à la personne qui le recevra : c'est lui qui ouvre son espace personnel et son Skincoach. Un code = une personne.",
        "use": "Ouvrez l'application, choisissez « J'ai un code » et saisissez-le. Votre code n'expire pas.",
        "foot": "Envoyé par {brand}. Nous ne vous demanderons jamais votre mot de passe ni vos informations bancaires par e-mail.",
    },
    "en": {
        "subject": "Your Nūr Protocol access — order {order}",
        "hello": "Your access is ready",
        "intro": "Thank you for your order {order}. Here is your access code for the Nūr Protocol app and your personal Skincoach.",
        "intro_multi": "Thank you for your order {order}. Here are your {count} access codes for the Nūr Protocol app — one per mask.",
        "gift": "Is this mask a gift? Pass the code on to the person receiving it: it opens their own space and Skincoach. One code = one person.",
        "use": "Open the app, choose “I have a code” and enter it. Your code does not expire.",
        "foot": "Sent by {brand}. We will never ask for your password or payment details by email.",
    },
    "es": {
        "subject": "Tu acceso Nūr Protocol — pedido {order}",
        "hello": "Tu acceso está listo",
        "intro": "Gracias por tu pedido {order}. Este es tu código de acceso a la aplicación Nūr Protocol y a tu Skincoach personal.",
        "intro_multi": "Gracias por tu pedido {order}. Aquí tienes tus {count} códigos de acceso — uno por mascarilla.",
        "gift": "¿Es un regalo? Entrega el código a la persona que recibirá la mascarilla: abre su propio espacio y su Skincoach. Un código = una persona.",
        "use": "Abre la aplicación, elige «Tengo un código» e introdúcelo. Tu código no caduca.",
        "foot": "Enviado por {brand}. Nunca te pediremos tu contraseña ni tus datos bancarios por correo.",
    },
    "it": {
        "subject": "Il tuo accesso Nūr Protocol — ordine {order}",
        "hello": "Il tuo accesso è pronto",
        "intro": "Grazie per il tuo ordine {order}. Ecco il tuo codice di accesso all'app Nūr Protocol e al tuo Skincoach personale.",
        "intro_multi": "Grazie per il tuo ordine {order}. Ecco i tuoi {count} codici di accesso — uno per maschera.",
        "gift": "È un regalo? Consegna il codice alla persona che riceverà la maschera: apre il suo spazio e il suo Skincoach. Un codice = una persona.",
        "use": "Apri l'app, scegli «Ho un codice» e inseriscilo. Il codice non scade.",
        "foot": "Inviato da {brand}. Non chiederemo mai la tua password o i dati bancari via email.",
    },
    "de": {
        "subject": "Ihr Nūr Protocol Zugang — Bestellung {order}",
        "hello": "Ihr Zugang ist bereit",
        "intro": "Vielen Dank für Ihre Bestellung {order}. Hier ist Ihr Zugangscode für die Nūr Protocol App und Ihren persönlichen Skincoach.",
        "intro_multi": "Vielen Dank für Ihre Bestellung {order}. Hier sind Ihre {count} Zugangscodes — einer pro Maske.",
        "gift": "Ist die Maske ein Geschenk? Geben Sie den Code an die beschenkte Person weiter: er öffnet ihren eigenen Bereich und Skincoach. Ein Code = eine Person.",
        "use": "Öffnen Sie die App, wählen Sie „Ich habe einen Code“ und geben Sie ihn ein. Der Code verfällt nicht.",
        "foot": "Gesendet von {brand}. Wir fragen niemals per E-Mail nach Ihrem Passwort oder Ihren Bankdaten.",
    },
    "ru": {
        "subject": "Ваш доступ Nūr Protocol — заказ {order}",
        "hello": "Ваш доступ готов",
        "intro": "Спасибо за заказ {order}. Это ваш код доступа к приложению Nūr Protocol и вашему персональному Skincoach.",
        "intro_multi": "Спасибо за заказ {order}. Вот ваши {count} кода доступа — по одному на маску.",
        "gift": "Маска в подарок? Передайте код тому, кто её получит: он откроет личный кабинет и Skincoach. Один код — один человек.",
        "use": "Откройте приложение, выберите «У меня есть код» и введите его. Код не истекает.",
        "foot": "Отправлено {brand}. Мы никогда не спрашиваем пароль или банковские данные по email.",
    },
    "ar": {
        "subject": "دخولك إلى نُور بروتوكول — الطلب {order}",
        "hello": "حسابك جاهز",
        "intro": "شكراً لطلبك {order}. هذا رمز الدخول الخاص بكِ إلى تطبيق نُور بروتوكول و Skincoach.",
        "intro_multi": "شكراً لطلبك {order}. هذه رموز الدخول الخاصة بكِ ({count}) — رمز لكل قناع.",
        "gift": "هل القناع هدية؟ أعطي الرمز للشخص الذي سيستلمه: الرمز يفتح مساحته الخاصة و Skincoach. رمز واحد لشخص واحد.",
        "use": "افتحي التطبيق، اختاري «لدي رمز» ثم أدخليه. الرمز لا تنتهي صلاحيته.",
        "foot": "أُرسلت بواسطة {brand}. لن نطلب منكِ كلمة المرور أو بيانات البطاقة عبر البريد.",
    },
}


def _order_codes_html(codes: list[str], order_name: str, lang: str, link: str = "") -> str:
    c = _ORDER_COPY.get(lang, _ORDER_COPY["fr"])
    brand = escape(EMAIL_FROM_NAME)
    order = escape(order_name or "")
    intro = (c["intro_multi"].format(order=order, count=len(codes)) if len(codes) > 1
             else c["intro"].format(order=order))
    code_blocks = "".join(
        '<tr><td align="center" style="padding:8px 0">'
        '<div style="display:inline-block;background:#FBF7F0;border:1px solid #C9A961;border-radius:14px;'
        'padding:16px 24px;font-family:Menlo,Consolas,monospace;font-size:26px;letter-spacing:4px;'
        f'color:#3A2F21">{escape(code)}</div></td></tr>'
        for code in codes
    )
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="background:#FBF7F0;padding:32px 0;font-family:Georgia,\'Times New Roman\',serif">'
        '<tr><td align="center">'
        '<table role="presentation" width="460" cellpadding="0" cellspacing="0" '
        'style="background:#FFFFFF;border:1px solid #E8DCC4;border-radius:18px;padding:36px 32px">'
        f'<tr><td align="center" style="font-size:12px;letter-spacing:4px;color:#A98C4E">{brand.upper()}</td></tr>'
        f'<tr><td align="center" style="padding-top:16px;font-size:23px;color:#3A2F21">{escape(c["hello"])}</td></tr>'
        '<tr><td align="center" style="padding:12px 0"><span style="color:#C9A961">&#9670;</span></td></tr>'
        '<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
        f'line-height:21px;color:#6B5F4F">{escape(intro)}</td></tr>'
        '<tr><td style="padding-top:18px"></td></tr>'
        + _open_button(link, lang) +
        f'<tr><td style="padding:6px 0 18px">{code_blocks}</td></tr>'
        '<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;'
        f'line-height:20px;color:#6B5F4F">{escape(c["use"])}</td></tr>'
        '<tr><td align="center" style="padding-top:20px"><div style="background:#FBF7F0;'
        'border:1px solid #E8DCC4;border-radius:12px;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:12px;line-height:19px;color:#6B5F4F">{escape(c["gift"])}</div></td></tr>'
        '<tr><td align="center" style="padding-top:22px;font-family:Arial,Helvetica,sans-serif;'
        f'font-size:11px;line-height:17px;color:#ADA392">{escape(c["foot"]).format(brand=brand)}</td></tr>'
        '</table></td></tr></table>'
    )


async def send_order_codes_email(*, to: str, codes: list[str], order_name: str, lang: str = "fr",
                                 link: str = "") -> str | None:
    c = _ORDER_COPY.get(lang, _ORDER_COPY["fr"])
    subject = c["subject"].format(order=order_name or "")
    return await send_email(to=to, subject=subject, html=_order_codes_html(codes, order_name, lang, link))
