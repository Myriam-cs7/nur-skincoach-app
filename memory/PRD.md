# Nūr Protocol — AI Skincoach (PRD)

## Vision
Application mobile compagnon de la gamme LED Nūr Protocol. Le client scanne le QR code de sa boîte, complète son profil beauté, prend un selfie, et reçoit un **bilan beauté personnalisé** + un **rituel LED hebdomadaire sur-mesure** utilisant les 6 couleurs de luminothérapie (rouge, bleu, vert, jaune, cyan, violet).

**Positionnement strictement beauté / bien-être** — pas de vocabulaire médical ni dermatologique (cadre réglementaire UE 2017/745).

## Parcours utilisateur
1. **Welcome** — Halo doré + 6 points LED multicolores → "Scanner mon QR code"
2. **Onboarding** (12 étapes) — prénom, âge, type de peau, ville/climat, soleil, mode de vie, sommeil, stress, hydratation, préoccupations
3. **Scan** — selfie via expo-camera face avant + guide d'alignement doré, ou choix depuis la galerie
4. **Analyzing** — orbes LED multicolores en rotation, étapes d'analyse
5. **Diagnosis** — résumé + scores beauté (hydratation, éclat, pores…) + rituel LED 7 jours
6. **Tabs**:
   - **Aujourd'hui** — hero séance du jour, streak, rappels (notifications locales 20h)
   - **Rituel** — timeline hebdomadaire colorée
   - **Lumières** — bibliothèque des 6 LED (effets, indications, durée)
   - **Profil** — données, refaire bilan, réinitialiser

## Stack
- **Frontend**: Expo SDK 54 + Expo Router (file-based), React Native, expo-camera, expo-image-picker, expo-image-manipulator (resize/compress base64), expo-notifications (local), react-native-reanimated, expo-linear-gradient
- **Backend**: FastAPI + Motor (MongoDB async), pydantic
- **AI**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations` avec EMERGENT_LLM_KEY, vision (base64 image) + texte (intake)
- **Storage**: AsyncStorage pour user_id local, MongoDB pour profil/bilan/séances

## Modèle de données
- `users` — id (uuid), activation_code (NUR-XXXX), intake{}, diagnosis{}
- `sessions` — id, user_id, led_color_id, duration_minutes, date

## API
- `POST /api/activate` — crée/retrouve user via code QR
- `POST /api/users/{id}/intake` — sauvegarde questionnaire
- `POST /api/users/{id}/diagnose` — appelle Claude vision → JSON bilan complet
- `GET /api/users/{id}/diagnosis` — récupère bilan
- `GET /api/users/{id}/protocol` — récupère rituel
- `GET /api/led-library` — référentiel 6 couleurs LED
- `POST /api/users/{id}/sessions` — log séance complétée
- `GET /api/users/{id}/sessions` — historique
- `DELETE /api/users/{id}` — reset complet

## Design
- Palette **luxe & clinique sombre** : base obsidienne `#09090C`, accent or brand `#C9A961`, accents LED multicolores
- Typo : Serif (Georgia) pour titres, System sans pour texte
- Animations : halos pulsants, orbes en rotation, glow LED par couleur
- Logo Nūr Protocol fourni par le client (calligraphie or)

## Garde-fous réglementaires
- Système prompt LLM : **interdiction absolue** des termes médicaux ("diagnostic", "traitement", "dermatologique", "pathologie", "soigner", "guérir", "clinique")
- Lexique forcé : "bilan beauté", "rituel", "soin", "confort cutané", "éclat", "apparence", "grain de peau"
- Aucune allégation thérapeutique

## Roadmap suggérée
- Scanner QR réel (déeplink `nurprotocol://activate/{code}`) au lieu du bouton placebo
- Historique de photos avant/après pour visualiser l'évolution
- Notifications push Emergent (post-build, hors Expo Go)
- E-commerce : recommandation de sérums complémentaires
- Programme parrainage / fidélité
