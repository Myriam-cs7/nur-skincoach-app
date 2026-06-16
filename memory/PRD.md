# Nūr Protocol — AI Skincoach (PRD)

## Vision
Application mobile compagnon premium "At-Home Clinic" pour la gamme LED Nūr Protocol — un espace beauté privatisé, luxueux et scientifique. Le client scanne le QR code de sa boîte et accède directement à son tableau de bord, complète son profil beauté, prend optionnellement un selfie, et reçoit un bilan beauté + un rituel LED hebdomadaire sur-mesure utilisant les 6 couleurs (rouge, bleu, vert, jaune, cyan, violet), chaque séance avec couleur, durée et intensité (faible/moyenne/forte).

**Positionnement strictement beauté/bien-être** — pas de vocabulaire médical (UE 2017/745).

## Internationalisation
- Trilingue : Français, English, العربية
- Auto-détection via `expo-localization` (locale de l'appareil — paramètres iOS/Android, pas l'app store)
- Sélecteur manuel dans le profil
- Backend Claude Sonnet 4.5 reçoit `lang` et répond dans la langue choisie

## Parcours
1. **Welcome** — Logo or transparent, halo lumineux, wordmark "NŪR PROTOCOL", titre "At-Home Clinic", ornement ◆, disclaimer confidentialité, CTA QR scan
2. **Onboarding** (11 étapes, **city retirée**) — prénom optionnel, âge, genre, type peau, climat, soleil, mode de vie, sommeil, stress, hydratation, préoccupations
3. **Scan optionnel** — Capture front-cam OU galerie OU "Continuer sans photo" (3 chemins parallèles, jamais bloquant)
4. **Analyzing** — orbes LED multicolores en rotation, étapes en cours
5. **Diagnosis** — résumé, scores, axes prioritaires, rituel hebdomadaire avec intensité, conseils
6. **Tabs**: Aujourd'hui (dashboard hero + stats + rappels), Rituel (timeline), Lumières (6 couleurs LED), Profil (sélecteur de langue, confidentialité, refaire bilan, reset)

## Confidentialité
- Disclaimer visible sur welcome ("Vos données restent confidentielles et chiffrées. Nous ne partageons rien.")
- Disclaimer rappelé sur scan
- Section dédiée "Confidentialité" dans profil avec explication détaillée
- Suppression complète du compte à tout moment

## Garde-fous beauté/cosmétique
- Prompt système LLM (FR/EN/AR) interdit absolument tout vocabulaire médical
- Lexique forcé : bilan beauté, rituel, soin, confort cutané, éclat, apparence, grain de peau
- Aucune allégation thérapeutique

## Stack
- **Frontend**: Expo SDK 54, Expo Router, React Native, expo-camera (optionnelle), expo-image-picker, expo-image-manipulator, expo-notifications, expo-localization, react-native-reanimated
- **Backend**: FastAPI + Motor MongoDB, Pydantic
- **IA**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via emergentintegrations, multimodal (texte + image optionnelle)

## Design (luxe & clinique)
- Palette obsidienne profonde `#06060A` + or chaud `#C9A961` + accents LED 6 couleurs
- Tokens UI : `Wordmark` (texte + hairlines), `GoldDivider` (◆ ornement), `SectionLabel`, `iconCircle` à halo doré
- Typo serif Georgia pour titres, system sans pour texte, mono pour codes
- Animations subtiles : pulse halo, rotation orbes LED, shadows dorées sur CTAs

## API
- `POST /api/activate` — crée user via QR code interne (`NUR-XXXX`)
- `POST /api/users/{id}/intake` — sauvegarde questionnaire (location optionnelle)
- `POST /api/users/{id}/diagnose` — photo **optionnelle**, lang (fr/en/ar) → Claude → diagnosis JSON
- `GET /api/users/{id}/diagnosis|protocol|sessions` — lecture
- `POST /api/users/{id}/sessions` — log séance
- `GET /api/led-library` — référentiel 6 LED
- `DELETE /api/users/{id}` — reset

## Roadmap
- QR scanner caméra avec deeplink `nurprotocol://activate/{code}`
- Historique photos avant/après avec graphiques d'évolution
- Notifications push Emergent (post-build)
- Plus de langues (ES/IT/DE) sur demande
