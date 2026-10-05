import asyncio, os, uuid, random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path('/app/backend/.env'))
db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]

UID = 'demo-charts-user'
SCHEDULE = [
    {"day": 1, "led_color_id": "red", "session_minutes": 15, "intensity": "moyenne", "notes": "Collagène"},
    {"day": 2, "led_color_id": "blue", "session_minutes": 12, "intensity": "faible", "notes": "Purifiant"},
    {"day": 3, "led_color_id": None, "session_minutes": None, "intensity": None, "notes": "Repos"},
    {"day": 4, "led_color_id": "yellow", "session_minutes": 12, "intensity": "moyenne", "notes": "Éclat"},
    {"day": 5, "led_color_id": "red", "session_minutes": 15, "intensity": "forte", "notes": "Fermeté"},
    {"day": 6, "led_color_id": "violet", "session_minutes": 15, "intensity": "moyenne", "notes": "Régénération"},
    {"day": 7, "led_color_id": None, "session_minutes": None, "intensity": None, "notes": "Repos"},
]

def diag(scores, when):
    return {
        "id": str(uuid.uuid4()), "user_id": UID, "created_at": when.isoformat(),
        "photo_thumbnail_b64": None,
        "data": {
            "scores": scores,
            "primary_concerns": ["rides", "ternissement"],
            "summary": "Peau mixte, éclat en progression, zone du cou à soutenir.",
            "routine_advice": ["Nettoyant doux", "Sérum vitamine C"],
            "lifestyle_advice": ["7h de sommeil", "2L d'eau"],
            "protocol": {"weekly_schedule": SCHEDULE, "total_weeks": 8, "expected_results": "Éclat visible en 4 semaines"},
        },
    }

async def main():
    now = datetime.now(timezone.utc)
    await db.users.delete_one({"id": UID})
    await db.sessions.delete_many({"user_id": UID})
    await db.diagnoses.delete_many({"user_id": UID})

    d1 = diag({"hydratation": 52, "eclat": 48, "fermete": 55, "uniformite": 50}, now - timedelta(days=56))
    d2 = diag({"hydratation": 61, "eclat": 59, "fermete": 60, "uniformite": 57}, now - timedelta(days=28))
    d3 = diag({"hydratation": 72, "eclat": 70, "fermete": 68, "uniformite": 66}, now - timedelta(days=2))
    await db.diagnoses.insert_many([dict(d1), dict(d2), dict(d3)])

    await db.users.insert_one({
        "id": UID, "activation_code": "NUR-DEMO-2026", "shopify_email": "demo@nurprotocol.com",
        "created_at": (now - timedelta(days=60)).isoformat(), "language": "fr",
        "intake": {"name": "Emma", "age_range": "35-44", "skin_type": "mixte", "climate": "tempere",
                   "sun_exposure": "moyenne", "lifestyle": "actif", "sleep_hours": "6-7",
                   "stress_level": "moyen", "water_intake": "1-2L", "concerns": ["rides", "ternissement"]},
        "diagnosis": dict(d3),
    })

    colors = ["red", "blue", "yellow", "violet", "green"]
    docs = []
    for i in range(27, -1, -1):
        if random.random() < 0.62:
            when = now - timedelta(days=i, hours=random.randint(0, 5))
            c = random.choice(colors)
            docs.append({"id": str(uuid.uuid4()), "user_id": UID, "led_color_id": c,
                         "duration_minutes": random.choice([12, 15]), "date": when.isoformat(),
                         "notes": None, "created_at": when.isoformat()})
    await db.sessions.insert_many(docs)
    print("seeded", UID, "sessions:", len(docs))

asyncio.run(main())
