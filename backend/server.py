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
    location: str  # city / country
    climate: str  # "tempere" | "sec" | "humide" | "froid" | "tropical"
    sun_exposure: str  # "faible" | "moyenne" | "forte"
    lifestyle: str  # "sedentaire" | "actif" | "tres_actif"
    sleep_hours: str  # "<6" | "6-7" | "7-8" | ">8"
    stress_level: str  # "faible" | "moyen" | "eleve"
    water_intake: str  # "<1L" | "1-2L" | ">2L"
    concerns: List[str]  # ["acne","rides","taches","rougeurs","pores","ternissement","sensibilite"]
    current_routine: Optional[List[str]] = None


class DiagnoseRequest(BaseModel):
    photo_base64: str  # raw base64 (no data: prefix)
    mime_type: str = "image/jpeg"


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
SYSTEM_PROMPT_FR = """Tu es un coach beauté expert pour la marque de luminothérapie LED Nūr Protocol.
Tu analyses la photo de visage et les informations du client pour produire un bilan beauté personnalisé
et un rituel de luminothérapie LED hebdomadaire utilisant exclusivement les 6 couleurs disponibles :
- red  (rouge, 630-660nm)  : anti-âge, collagène, rides, fermeté
- blue (bleu, 415-450nm)   : anti-acné, peau grasse, bactéries
- green (vert, 520-550nm)  : taches, hyperpigmentation, unifie le teint
- yellow (jaune, 570-590nm): éclat, rougeurs légères, teint terne
- cyan (cyan, 490-515nm)   : peau sensible, anti-inflammatoire, couperose
- violet (violet, 380-415nm): cicatrices, régénération, grain de peau

TU DOIS RÉPONDRE STRICTEMENT EN JSON VALIDE (sans markdown, sans ```), avec ce schéma exact :
{
  "scores": {
    "hydration": <int 0-100>,
    "oil": <int 0-100>,
    "pores": <int 0-100>,
    "redness": <int 0-100>,
    "sensitivity": <int 0-100>,
    "pigmentation": <int 0-100>,
    "wrinkles": <int 0-100>,
    "glow": <int 0-100>
  },
  "primary_concerns": ["concern1","concern2","concern3"],
  "summary": "Bilan beauté court (2-3 phrases) en français — vocabulaire cosmétique uniquement, jamais médical",
  "routine_advice": ["Conseil rituel beauté 1","Conseil 2","Conseil 3","Conseil 4"],
  "lifestyle_advice": ["Conseil bien-être 1","Conseil 2","Conseil 3"],
  "protocol": {
    "weekly_schedule": [
      {"day":1,"led_color_id":"red","session_minutes":15,"intensity":"moyenne","notes":"Lundi - Anti-âge"},
      {"day":2,"led_color_id":"blue","session_minutes":12,"intensity":"faible","notes":"Mardi - Purification"},
      {"day":3,"led_color_id":null,"session_minutes":null,"intensity":null,"notes":"Repos"},
      {"day":4,"led_color_id":"green","session_minutes":15,"intensity":"moyenne","notes":"Jeudi - Anti-taches"},
      {"day":5,"led_color_id":"yellow","session_minutes":12,"intensity":"faible","notes":"Vendredi - Éclat"},
      {"day":6,"led_color_id":"violet","session_minutes":15,"intensity":"forte","notes":"Samedi - Régénération"},
      {"day":7,"led_color_id":null,"session_minutes":null,"intensity":null,"notes":"Repos"}
    ],
    "total_weeks": 8,
    "expected_results": "Description claire des résultats attendus en 8 semaines"
  }
}

Règles pour intensity :
- "faible" pour peau sensible / débutante / zones réactives
- "moyenne" pour usage standard
- "forte" pour besoins ciblés (anti-âge marqué, régénération profonde, peau tolérante)
- null pour les jours de repos

Règles importantes :
- Adapte le rituel aux préoccupations beauté détectées sur la photo ET au questionnaire (climat, mode de vie, sommeil, stress).
- 4 à 6 séances par semaine maximum (jamais 7), prévoir au moins 1 jour de repos.
- led_color_id doit être null pour les jours de repos.
- Les couleurs LED doivent être pertinentes pour les préoccupations beauté détectées.
- Tu écris en FRANÇAIS uniquement. Ne mets PAS de markdown.
- IMPORTANT - VOCABULAIRE COSMÉTIQUE UNIQUEMENT : tu es un coach beauté/bien-être, PAS un médecin ni dermatologue.
- INTERDICTION ABSOLUE des termes médicaux : ne dis JAMAIS « diagnostic », « traitement », « dermatologique », « pathologie », « soigner », « guérir », « clinique ». 
- Utilise UNIQUEMENT le lexique beauté/cosmétique : « bilan beauté », « rituel », « soin », « confort cutané », « éclat », « apparence », « grain de peau », « routine ».
- Pour les préoccupations : préfère « zones d'irrégularité », « teint inégal », « manque d'éclat », « confort » plutôt que des termes pathologiques.
- Ne fais AUCUNE allégation thérapeutique ni promesse médicale. Reste descriptif et cosmétique."""


async def run_diagnosis(intake: dict, image_b64: str, mime_type: str, session_id: str) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SYSTEM_PROMPT_FR,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_text = (
        "Voici les informations du client (questionnaire beauté) et sa photo de visage.\n"
        f"Profil:\n{json.dumps(intake, ensure_ascii=False, indent=2)}\n\n"
        "Observe la photo en détail (apparence visible du grain de peau, pores, zones d'inégalité, "
        "éclat, uniformité du teint, niveau d'hydratation apparente) puis produis le JSON demandé "
        "en respectant strictement le lexique beauté/cosmétique (jamais médical)."
    )

    image = ImageContent(image_base64=image_b64)
    msg = UserMessage(text=user_text, file_contents=[image])

    raw = await chat.send_message(msg)
    text = raw if isinstance(raw, str) else str(raw)

    # Strip code fences if present
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)

    # Try to find JSON object
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=502, detail="LLM did not return valid JSON")
        data = json.loads(match.group(0))

    return data


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

    if not req.photo_base64 or len(req.photo_base64) < 100:
        raise HTTPException(status_code=400, detail="Photo data missing or invalid")

    session_id = f"diag-{user_id}"
    try:
        diag = await run_diagnosis(user["intake"], req.photo_base64, req.mime_type, session_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Diagnosis LLM error")
        raise HTTPException(status_code=502, detail=f"Diagnosis failed: {e}")

    diag_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "created_at": utc_now_iso(),
        "photo_thumbnail_b64": req.photo_base64[:200000],  # cap stored size
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
