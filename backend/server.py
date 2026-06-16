import os
import json
import uuid
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api = APIRouter(prefix="/api")


# ---------- LED library (the 6 colors) ----------
LED_LIBRARY = [
    {
        "id": "red",
        "color_hex": "#FF4A4A",
        "name": "Lumière Rouge",
        "wavelength": "630-660 nm",
        "tagline": "Anti-âge et collagène",
        "benefits": ["Stimule le collagène", "Réduit les rides", "Améliore la circulation", "Raffermit la peau"],
        "best_for": ["Rides", "Perte de fermeté", "Teint terne", "Anti-âge"],
        "session_minutes": 15,
    },
    {
        "id": "blue",
        "color_hex": "#3399FF",
        "name": "Lumière Bleue",
        "wavelength": "415-450 nm",
        "tagline": "Anti-acné et purifiante",
        "benefits": ["Détruit les bactéries acnéiques", "Réduit l'inflammation", "Régule le sébum", "Purifie les pores"],
        "best_for": ["Acné", "Peau grasse", "Boutons", "Pores obstrués"],
        "session_minutes": 12,
    },
    {
        "id": "green",
        "color_hex": "#34C759",
        "name": "Lumière Verte",
        "wavelength": "520-550 nm",
        "tagline": "Anti-taches et éclat",
        "benefits": ["Atténue l'hyperpigmentation", "Unifie le teint", "Apaise les rougeurs", "Équilibre la mélanine"],
        "best_for": ["Taches brunes", "Cicatrices pigmentées", "Teint irrégulier", "Mélasma"],
        "session_minutes": 15,
    },
    {
        "id": "yellow",
        "color_hex": "#FFCC00",
        "name": "Lumière Jaune",
        "wavelength": "570-590 nm",
        "tagline": "Éclat et anti-rougeurs",
        "benefits": ["Apaise les rougeurs", "Stimule l'éclat", "Renforce la barrière cutanée", "Détoxifie"],
        "best_for": ["Rougeurs diffuses", "Teint terne", "Peau fatiguée", "Sensibilité"],
        "session_minutes": 12,
    },
    {
        "id": "cyan",
        "color_hex": "#32ADE6",
        "name": "Lumière Cyan",
        "wavelength": "490-515 nm",
        "tagline": "Apaisante et anti-inflammatoire",
        "benefits": ["Calme les irritations", "Réduit l'inflammation", "Hydrate en profondeur", "Soulage la couperose"],
        "best_for": ["Peau sensible", "Couperose", "Inflammation", "Eczéma léger"],
        "session_minutes": 12,
    },
    {
        "id": "violet",
        "color_hex": "#BF5AF2",
        "name": "Lumière Violette",
        "wavelength": "380-415 nm",
        "tagline": "Régénérante et cicatrisante",
        "benefits": ["Combine rouge + bleu", "Régénère les cellules", "Cicatrise les marques", "Affine le grain"],
        "best_for": ["Cicatrices d'acné", "Marques pigmentées", "Grain irrégulier", "Réparation"],
        "session_minutes": 15,
    },
]


# ---------- Models ----------
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ActivateRequest(BaseModel):
    activation_code: Optional[str] = None


class ActivateResponse(BaseModel):
    user_id: str
    activation_code: str
    has_intake: bool
    has_diagnosis: bool


class Intake(BaseModel):
    name: Optional[str] = None
    age_range: str
    gender: Optional[str] = None
    skin_type: str  # "seche" | "grasse" | "mixte" | "normale" | "sensible"
    location: Optional[str] = None  # optional
    climate: str  # "tempere" | "sec" | "humide" | "froid" | "tropical"
    sun_exposure: str  # "faible" | "moyenne" | "forte"
    lifestyle: str  # "sedentaire" | "actif" | "tres_actif"
    sleep_hours: str  # "<6" | "6-7" | "7-8" | ">8"
    stress_level: str  # "faible" | "moyen" | "eleve"
    water_intake: str  # "<1L" | "1-2L" | ">2L"
    concerns: List[str]  # ["acne","rides","taches","rougeurs","pores","ternissement","sensibilite"]
    current_routine: Optional[List[str]] = None


class DiagnoseRequest(BaseModel):
    photo_base64: Optional[str] = None  # optional — questionnaire-only flow supported
    mime_type: str = "image/jpeg"
    lang: str = "fr"  # "fr" | "en" | "ar"


class ProtocolDay(BaseModel):
    day: int  # 1-7 (Mon-Sun)
    led_color_id: Optional[str] = None
    session_minutes: Optional[int] = None
    intensity: Optional[str] = None  # "faible" | "moyenne" | "forte"
    notes: Optional[str] = None


class Diagnosis(BaseModel):
    scores: Dict[str, int]  # 0-100: hydration, oil, pores, redness, sensitivity, pigmentation, wrinkles, glow
    primary_concerns: List[str]
    summary: str
    routine_advice: List[str]
    lifestyle_advice: List[str]
    protocol: Dict[str, Any]  # {weekly_schedule:[ProtocolDay], total_weeks:int, expected_results:str}


class SessionLog(BaseModel):
    led_color_id: str
    duration_minutes: int
    date: Optional[str] = None
    notes: Optional[str] = None


class LeadAnswers(BaseModel):
    q1: str  # collagen / morning resilience
    q2: str  # tech neck / decolletage
    q3: str  # plateau / glass ceiling


class LeadRequest(BaseModel):
    email: str
    name: Optional[str] = None
    age_range: Optional[str] = None
    answers: LeadAnswers
    lang: str = "fr"


# ---------- Helpers ----------
def _strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _get_user_or_404(user_id: str) -> dict:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ---------- LLM diagnosis ----------
SYSTEM_PROMPTS = {
    "fr": """Tu es un coach beauté expert pour la marque de luminothérapie LED Nūr Protocol.
Tu produis un bilan beauté personnalisé et un rituel LED hebdomadaire utilisant exclusivement les 6 couleurs disponibles :
- red (rouge, 630-660nm), blue (bleu, 415-450nm), green (vert, 520-550nm), yellow (jaune, 570-590nm), cyan (490-515nm), violet (380-415nm)

TU DOIS RÉPONDRE STRICTEMENT EN JSON VALIDE (sans markdown), avec ce schéma :
{"scores":{"hydration":int,"oil":int,"pores":int,"redness":int,"sensitivity":int,"pigmentation":int,"wrinkles":int,"glow":int},
"primary_concerns":["c1","c2","c3"],
"summary":"Bilan beauté court (2-3 phrases) en français",
"routine_advice":["1","2","3","4"],
"lifestyle_advice":["1","2","3"],
"protocol":{"weekly_schedule":[{"day":1-7,"led_color_id":"red|blue|green|yellow|cyan|violet|null","session_minutes":int_or_null,"intensity":"faible|moyenne|forte|null","notes":"texte court"}...],"total_weeks":int,"expected_results":"texte"}}

RÈGLES :
- 4 à 6 séances par semaine MAX, au moins 1 jour de repos (led_color_id=null, intensity=null)
- intensity adaptée : "faible" pour peau sensible/débutante, "moyenne" usage standard, "forte" pour besoins ciblés
- VOCABULAIRE BEAUTÉ/COSMÉTIQUE UNIQUEMENT, jamais médical (interdit : "diagnostic", "dermatologique", "traitement", "soigner", "guérir", "clinique", "pathologie")
- Utiliser : "bilan beauté", "rituel", "soin", "confort cutané", "éclat", "apparence", "grain de peau"
- Aucune allégation thérapeutique. Tout en français.""",
    "en": """You are an expert beauty coach for the Nūr Protocol LED light therapy brand.
You produce a personalised beauty assessment and weekly LED ritual using only the 6 available colours:
- red (630-660nm), blue (415-450nm), green (520-550nm), yellow (570-590nm), cyan (490-515nm), violet (380-415nm)

REPLY STRICTLY IN VALID JSON (no markdown):
{"scores":{"hydration":int,"oil":int,"pores":int,"redness":int,"sensitivity":int,"pigmentation":int,"wrinkles":int,"glow":int},
"primary_concerns":["c1","c2","c3"],
"summary":"Short beauty summary (2-3 sentences) in English",
"routine_advice":["1","2","3","4"],
"lifestyle_advice":["1","2","3"],
"protocol":{"weekly_schedule":[{"day":1-7,"led_color_id":"red|blue|green|yellow|cyan|violet|null","session_minutes":int_or_null,"intensity":"faible|moyenne|forte|null","notes":"short text"}...],"total_weeks":int,"expected_results":"text"}}

RULES:
- MAX 4-6 sessions per week, at least 1 rest day (led_color_id=null, intensity=null)
- intensity: "faible" sensitive/beginner, "moyenne" standard, "forte" targeted needs (keep these French values for consistency across languages)
- BEAUTY/COSMETIC LEXICON ONLY, never medical (forbidden: "diagnosis", "dermatological", "treatment", "heal", "cure", "clinical", "pathology")
- Use: "beauty assessment", "ritual", "care", "skin comfort", "glow", "appearance", "skin texture"
- No therapeutic claims. Entirely in English.""",
    "ar": """أنتِ مدربة جمال خبيرة لعلامة نُور بروتوكول للعلاج بالضوء LED.
تنتجين تقييماً جمالياً مخصصاً وروتيناً أسبوعياً LED باستخدام الألوان الستة المتاحة فقط:
- red (أحمر، 630-660nm)، blue (أزرق، 415-450nm)، green (أخضر، 520-550nm)، yellow (أصفر، 570-590nm)، cyan (سماوي، 490-515nm)، violet (بنفسجي، 380-415nm)

أجيبي بصيغة JSON صالحة فقط (بدون markdown):
{"scores":{"hydration":int,"oil":int,"pores":int,"redness":int,"sensitivity":int,"pigmentation":int,"wrinkles":int,"glow":int},
"primary_concerns":["c1","c2","c3"],
"summary":"ملخص جمالي قصير (2-3 جمل) بالعربية",
"routine_advice":["1","2","3","4"],
"lifestyle_advice":["1","2","3"],
"protocol":{"weekly_schedule":[{"day":1-7,"led_color_id":"red|blue|green|yellow|cyan|violet|null","session_minutes":int_or_null,"intensity":"faible|moyenne|forte|null","notes":"نص قصير"}...],"total_weeks":int,"expected_results":"نص"}}

القواعد:
- 4-6 جلسات أسبوعياً كحد أقصى، يوم راحة واحد على الأقل (led_color_id=null, intensity=null)
- intensity: "faible" للبشرة الحساسة، "moyenne" استخدام عادي، "forte" احتياجات محددة (احتفظي بهذه القيم الفرنسية للاتساق)
- استخدمي مفردات الجمال/التجميل فقط، تجنبي مطلقاً المصطلحات الطبية
- استخدمي: "تقييم جمالي"، "روتين"، "عناية"، "راحة البشرة"، "إشراق"، "مظهر"
- لا ادعاءات علاجية. كل شيء بالعربية.""",
}


async def run_diagnosis(intake: dict, image_b64: Optional[str], mime_type: str, session_id: str, lang: str = "fr") -> dict:
    system_prompt = SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["fr"])
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    intro = {
        "fr": "Voici les informations du client (questionnaire beauté)" + (" et sa photo de visage" if image_b64 else " — pas de photo fournie, base ton bilan uniquement sur le questionnaire") + ".\n",
        "en": "Here is the client's information (beauty questionnaire)" + (" and their face photo" if image_b64 else " — no photo provided, base your assessment on the questionnaire only") + ".\n",
        "ar": "إليكِ معلومات العميلة (استبيان الجمال)" + (" وصورة وجهها" if image_b64 else " — لا توجد صورة، استندي إلى الاستبيان فقط") + ".\n",
    }
    user_text = intro.get(lang, intro["fr"]) + f"Profil:\n{json.dumps(intake, ensure_ascii=False, indent=2)}"

    file_contents = []
    if image_b64:
        file_contents.append(ImageContent(image_base64=image_b64))

    msg = UserMessage(text=user_text, file_contents=file_contents if file_contents else None)

    raw = await chat.send_message(msg)
    text = raw if isinstance(raw, str) else str(raw)
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=502, detail="LLM did not return valid JSON")
        return json.loads(match.group(0))


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"app": "Nur Protocol AI Skincoach", "status": "ok"}


@api.get("/led-library")
async def led_library():
    return {"colors": LED_LIBRARY}


@api.post("/activate", response_model=ActivateResponse)
async def activate(req: ActivateRequest):
    code = (req.activation_code or "").strip().upper()
    if not code:
        code = "NUR-" + uuid.uuid4().hex[:8].upper()

    existing = await db.users.find_one({"activation_code": code}, {"_id": 0})
    if existing:
        return ActivateResponse(
            user_id=existing["id"],
            activation_code=code,
            has_intake=bool(existing.get("intake")),
            has_diagnosis=bool(existing.get("diagnosis")),
        )

    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "activation_code": code,
        "created_at": utc_now_iso(),
        "intake": None,
        "diagnosis": None,
    }
    await db.users.insert_one(doc)
    return ActivateResponse(user_id=user_id, activation_code=code, has_intake=False, has_diagnosis=False)


@api.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await _get_user_or_404(user_id)
    return user


@api.post("/users/{user_id}/intake")
async def save_intake(user_id: str, intake: Intake):
    await _get_user_or_404(user_id)
    intake_dict = intake.dict()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"intake": intake_dict, "intake_updated_at": utc_now_iso()}},
    )
    return {"ok": True, "intake": intake_dict}


@api.post("/users/{user_id}/diagnose")
async def diagnose(user_id: str, req: DiagnoseRequest):
    user = await _get_user_or_404(user_id)
    if not user.get("intake"):
        raise HTTPException(status_code=400, detail="Intake form must be completed first")

    # Photo is OPTIONAL — questionnaire-only flow is fully supported
    image_b64 = req.photo_base64 if (req.photo_base64 and len(req.photo_base64) > 100) else None

    session_id = f"diag-{user_id}"
    try:
        diag = await run_diagnosis(user["intake"], image_b64, req.mime_type, session_id, req.lang)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Diagnosis LLM error")
        raise HTTPException(status_code=502, detail=f"Diagnosis failed: {e}")

    diag_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "created_at": utc_now_iso(),
        "photo_thumbnail_b64": (req.photo_base64[:200000] if req.photo_base64 else None),  # cap stored size
        "data": diag,
    }
    await db.users.update_one({"id": user_id}, {"$set": {"diagnosis": diag_record}})
    return {"ok": True, "diagnosis": diag_record}


@api.get("/users/{user_id}/diagnosis")
async def get_diagnosis(user_id: str):
    user = await _get_user_or_404(user_id)
    if not user.get("diagnosis"):
        raise HTTPException(status_code=404, detail="No diagnosis yet")
    return user["diagnosis"]


@api.get("/users/{user_id}/protocol")
async def get_protocol(user_id: str):
    user = await _get_user_or_404(user_id)
    diag = user.get("diagnosis")
    if not diag:
        raise HTTPException(status_code=404, detail="No protocol available")
    return diag["data"].get("protocol", {})


@api.post("/users/{user_id}/sessions")
async def log_session(user_id: str, session: SessionLog):
    await _get_user_or_404(user_id)
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "led_color_id": session.led_color_id,
        "duration_minutes": session.duration_minutes,
        "date": session.date or utc_now_iso(),
        "notes": session.notes,
        "created_at": utc_now_iso(),
    }
    await db.sessions.insert_one(record.copy())
    return _strip_id(record)


@api.get("/users/{user_id}/sessions")
async def list_sessions(user_id: str):
    await _get_user_or_404(user_id)
    cursor = db.sessions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=500)
    return {"sessions": items}


@api.delete("/users/{user_id}")
async def reset_user(user_id: str):
    await _get_user_or_404(user_id)
    await db.users.delete_one({"id": user_id})
    await db.sessions.delete_many({"user_id": user_id})
    return {"ok": True}


# ---------- Lead funnel (pre-purchase mini diagnosis) ----------
LEAD_PROMPTS = {
    "fr": """Tu es une experte de la peau pour Nūr Protocol — une marque LED haut de gamme "At-Home Clinic" qui combine luminothérapie rouge (630nm) pour le visage et proche infrarouge (830nm) ciblé pour le cou et le décolleté.

Tu reçois les 3 réponses d'un pré-bilan clinique et tu produis une PRESCRIPTION PERSONNALISÉE qui :
1. Démontre l'expertise clinique (mentionne fibroblastes, photobiomodulation, collagène type I/III, élasticité, "Tech Neck")
2. Identifie 2-3 axes clés détectés à partir des réponses
3. Propose un protocole précis sur 8-12 semaines combinant 630nm visage + 830nm cou
4. Termine par un appel à l'action subtil : pour exécuter le protocole avec précision clinique, équipement requis

RÉPONDS STRICTEMENT EN JSON :
{
  "headline": "Titre court (max 8 mots) résumant le diagnostic",
  "diagnosis": "Analyse clinique en 2-3 phrases qui valorise l'expertise (vocabulaire pointu mais accessible)",
  "axes": ["Axe 1 court","Axe 2 court","Axe 3 court"],
  "protocol_summary": "Protocole en 2-3 phrases mentionnant 630nm visage + 830nm cou, durée en semaines, fréquence",
  "cta_text": "Phrase d'appel à l'action en 1-2 phrases qui prescrit l'équipement Nūr"
}

CONTRAINTES :
- Tu es coach beauté, JAMAIS médecin. Pas de "diagnostic médical", "traitement", "guérir".
- Utilise lexique technique-beauté : "photobiomodulation", "fibroblastes", "collagène", "élasticité", "biocompatible", "longueur d'onde", "exposition cellulaire".
- Tonalité luxueuse, clinique, féminine, sophistiquée. Pas d'emoji. Pas de markdown.
- Tout en FRANÇAIS.""",
    "en": """You are a skin expert for Nūr Protocol — a premium "At-Home Clinic" LED brand combining red light photobiomodulation (630nm) for face and targeted near-infrared (830nm) for neck and décolletage.

You receive 3 pre-assessment answers and produce a PERSONALISED PRESCRIPTION that:
1. Demonstrates clinical expertise (mention fibroblasts, photobiomodulation, type I/III collagen, elasticity, "Tech Neck")
2. Identifies 2-3 key focus axes from the answers
3. Proposes a precise 8-12 week protocol combining 630nm face + 830nm neck
4. Ends with a subtle call to action: to execute with clinical precision, equipment is required

REPLY STRICTLY IN JSON:
{
  "headline": "Short headline (max 8 words)",
  "diagnosis": "Clinical analysis in 2-3 sentences with refined vocabulary",
  "axes": ["Axis 1","Axis 2","Axis 3"],
  "protocol_summary": "Protocol in 2-3 sentences mentioning 630nm face + 830nm neck, weeks, frequency",
  "cta_text": "1-2 sentence call to action that 'prescribes' the Nūr equipment"
}

CONSTRAINTS:
- Beauty coach voice, NEVER medical. No "medical diagnosis", "treatment", "cure".
- Technical-beauty lexicon: photobiomodulation, fibroblasts, collagen, elasticity, biocompatible, wavelength, cellular exposure.
- Luxurious, clinical, sophisticated, feminine tone. No emojis. No markdown.
- All in ENGLISH.""",
    "ar": """أنتِ خبيرة بشرة لعلامة نُور بروتوكول — علامة LED فاخرة "عيادة منزلية" تجمع بين الضوء الأحمر (630nm) للوجه والأشعة تحت الحمراء القريبة (830nm) المستهدفة للرقبة والديكولتيه.

تتلقين 3 إجابات وتنتجين وصفة شخصية:
1. توضح الخبرة السريرية (اذكري الخلايا الليفية، التحفيز الضوئي، الكولاجين من النوع I/III، المرونة، "Tech Neck")
2. تحدد 2-3 محاور أساسية
3. تقترح بروتوكول دقيق 8-12 أسبوع يجمع 630nm وجه + 830nm رقبة
4. تنتهي بدعوة لطيفة للعمل: للحصول على نتائج دقيقة، المعدات مطلوبة

أجيبي بصيغة JSON فقط:
{"headline": "...", "diagnosis": "...", "axes": ["...","...","..."], "protocol_summary": "...", "cta_text": "..."}

قواعد: مفردات الجمال فقط، أبداً طبية. نبرة فاخرة سريرية. بدون رموز تعبيرية أو markdown. كل شيء بالعربية.""",
    "es": """Eres una experta en piel para Nūr Protocol — una marca LED premium "At-Home Clinic" que combina fotobiomodulación con luz roja (630nm) para el rostro y luz infrarroja cercana (830nm) para cuello y escote.

Recibes 3 respuestas de pre-evaluación y produces una PRESCRIPCIÓN PERSONALIZADA que:
1. Demuestra experiencia clínica (menciona fibroblastos, fotobiomodulación, colágeno tipo I/III, elasticidad, "Tech Neck")
2. Identifica 2-3 ejes clave
3. Propone un protocolo preciso de 8-12 semanas combinando 630nm rostro + 830nm cuello
4. Termina con una llamada a la acción sutil: para una ejecución con precisión clínica, se requiere equipo

RESPONDE ESTRICTAMENTE EN JSON:
{"headline": "...", "diagnosis": "...", "axes": ["...","...","..."], "protocol_summary": "...", "cta_text": "..."}

RESTRICCIONES: léxico belleza/cosmética solamente, nunca médico. Tono lujoso, clínico, sofisticado. Sin emojis ni markdown. Todo en ESPAÑOL.""",
    "it": """Sei un'esperta di pelle per Nūr Protocol — un marchio LED premium "At-Home Clinic" che combina fotobiomodulazione con luce rossa (630nm) per il viso e infrarosso vicino (830nm) per collo e décolleté.

Ricevi 3 risposte e produci una PRESCRIZIONE PERSONALIZZATA che:
1. Dimostra competenza clinica (menziona fibroblasti, fotobiomodulazione, collagene tipo I/III, elasticità, "Tech Neck")
2. Identifica 2-3 assi chiave
3. Propone un protocollo preciso di 8-12 settimane combinando 630nm viso + 830nm collo
4. Termina con una call to action sottile: per un'esecuzione con precisione clinica, è necessaria l'attrezzatura

RISPONDI STRETTAMENTE IN JSON:
{"headline": "...", "diagnosis": "...", "axes": ["...","...","..."], "protocol_summary": "...", "cta_text": "..."}

VINCOLI: lessico bellezza/cosmetico solo, mai medico. Tono lussuoso, clinico, sofisticato. Niente emoji né markdown. Tutto in ITALIANO.""",
    "de": """Du bist Hautexpertin für Nūr Protocol — eine Premium-LED-Marke "At-Home Clinic", die Photobiomodulation mit rotem Licht (630nm) für das Gesicht und gezieltes Nahinfrarot (830nm) für Hals und Dekolleté kombiniert.

Du erhältst 3 Vor-Assessment-Antworten und erstellst eine PERSONALISIERTE VERSCHREIBUNG, die:
1. Klinische Expertise zeigt (Fibroblasten, Photobiomodulation, Kollagen Typ I/III, Elastizität, "Tech Neck")
2. 2-3 Schlüsselachsen identifiziert
3. Ein präzises 8-12-Wochen-Protokoll vorschlägt mit 630nm Gesicht + 830nm Hals
4. Mit einem dezenten Call-to-Action endet: für klinische Präzision wird Ausrüstung benötigt

ANTWORTE STRENG IN JSON:
{"headline": "...", "diagnosis": "...", "axes": ["...","...","..."], "protocol_summary": "...", "cta_text": "..."}

BESCHRÄNKUNGEN: nur Beauty/Kosmetik-Lexikon, niemals medizinisch. Luxuriöser, klinischer, raffinierter Ton. Keine Emojis oder Markdown. Alles auf DEUTSCH.""",
    "ru": """Вы эксперт по коже для Nūr Protocol — премиальный бренд LED "At-Home Clinic", сочетающий фотобиомодуляцию красным светом (630нм) для лица и направленным ближним инфракрасным светом (830нм) для шеи и декольте.

Получаете 3 ответа предварительной оценки и создаёте ПЕРСОНАЛЬНЫЙ ПРОТОКОЛ:
1. Демонстрирующий клиническую экспертизу (фибробласты, фотобиомодуляция, коллаген типа I/III, эластичность, "Tech Neck")
2. Выделяющий 2-3 ключевые оси
3. Предлагающий точный 8-12-недельный протокол с 630нм лицо + 830нм шея
4. Заканчивающийся деликатным призывом к действию: для клинической точности необходимо оборудование

ОТВЕЧАЙТЕ СТРОГО В JSON:
{"headline": "...", "diagnosis": "...", "axes": ["...","...","..."], "protocol_summary": "...", "cta_text": "..."}

ОГРАНИЧЕНИЯ: только лексика красоты/косметики, никогда медицинская. Роскошный, клинический, утончённый тон. Без эмодзи и markdown. Всё на РУССКОМ.""",
}


@api.post("/lead-prescription")
async def lead_prescription(req: LeadRequest):
    if "@" not in req.email or "." not in req.email or len(req.email) < 5:
        raise HTTPException(status_code=400, detail="Invalid email")

    # Persist lead
    lead_doc = {
        "id": str(uuid.uuid4()),
        "email": req.email.lower().strip(),
        "name": req.name,
        "age_range": req.age_range,
        "answers": req.answers.dict(),
        "lang": req.lang,
        "created_at": utc_now_iso(),
    }
    await db.leads.insert_one(lead_doc.copy())

    # Call Claude
    system_prompt = LEAD_PROMPTS.get(req.lang, LEAD_PROMPTS["fr"])
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"lead-{lead_doc['id']}",
        system_message=system_prompt,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    intro = {
        "fr": "Voici les 3 réponses du pré-bilan clinique :",
        "en": "Here are the 3 pre-assessment answers:",
        "ar": "إليكِ الإجابات الثلاثة للتقييم الأولي:",
        "es": "Aquí están las 3 respuestas del pre-evaluación:",
        "it": "Ecco le 3 risposte del pre-assessment:",
        "de": "Hier sind die 3 Vor-Assessment-Antworten:",
        "ru": "Вот 3 ответа предварительной оценки:",
    }.get(req.lang, "Voici les 3 réponses :")

    user_text = (
        f"{intro}\n"
        f"Q1 (récupération matinale): {req.answers.q1}\n"
        f"Q2 (cou/décolleté Tech Neck): {req.answers.q2}\n"
        f"Q3 (plafond de constance): {req.answers.q3}\n"
        f"Profil: prénom={req.name or 'N/A'}, âge={req.age_range or 'N/A'}"
    )

    raw = await chat.send_message(UserMessage(text=user_text))
    text = (raw if isinstance(raw, str) else str(raw)).strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=502, detail="LLM did not return valid JSON")
        data = json.loads(match.group(0))

    await db.leads.update_one({"id": lead_doc["id"]}, {"$set": {"prescription": data}})

    return {
        "ok": True,
        "lead_id": lead_doc["id"],
        "prescription": data,
        "shop": {
            "url": "https://nurprotocol.com/products/nur-protocol-ai-led-face-neck-mask",
            "promo_code": "WELCOM10",
            "discount": 10,
        },
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
