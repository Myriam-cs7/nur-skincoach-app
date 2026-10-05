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

---

# Session juin 2026 — Barrière QR réelle, rappels, graphiques

## Décision produit majeure : UN SEUL QR code
L'usine en Chine imprime **un seul design** de carte gold. Le QR est donc **générique et identique**
sur toutes les cartes : `https://nurprotocol.com/activate`.
La barrière d'accès ne repose plus sur un code imprimé variable mais sur **l'e-mail de la commande Shopify**.

### Parcours cliente
1. Ouvre la boîte → carte gold → scanne le QR avec l'appareil photo du téléphone
2. Page `nurprotocol.com/activate` (à créer côté Shopify) → App Store / Play Store
3. L'app s'ouvre sur l'écran d'activation → elle saisit **l'e-mail de sa commande Nūr**
4. Le backend interroge l'API Admin Shopify → commande payée trouvée → accès débloqué
5. Si l'app est déjà installée, le lien universel (`associatedDomains` iOS / `intentFilters` Android)
   ouvre directement l'app sur `/activate`

### Chemins alternatifs
- **Code d'invitation** (influenceuses, presse, SAV) → `db.activation_codes`, inchangé
- **Liste blanche e-mail** → `db.allowed_emails` via `POST /api/admin/allow-email` (PIN)
- **Shopify non configuré / commande absente** → l'e-mail est enregistré dans `db.access_requests`
  et la cliente voit « accès validé sous 24 h »
- **Scanner intégré** (`/scan-qr`, expo-camera) pour scanner la carte depuis l'app

## Nouvelles API
- `POST /api/verify-purchase` {email, lang} → vérification Shopify (GraphQL `orders(query:"email:…")`,
  statuts acceptés PAID / PARTIALLY_PAID / PARTIALLY_REFUNDED / AUTHORIZED), idempotent par e-mail
- `GET /api/shopify-status` → {configured, store}
- `GET /api/qr?data=&size=&margin=` → PNG du QR prêt à imprimer (correction d'erreur H)
- `POST /api/admin/allow-email`, `GET /api/admin/access-requests?pin=` (PIN `ADMIN_PIN`)
- `GET /api/users/{id}/progress` → daily (28 j), weekly (4 semaines + objectif), per_color_minutes,
  score_history (historique des bilans), total_sessions, total_minutes

## Nouvelles collections
- `allowed_emails` {email, label, first_name, created_at}
- `access_requests` {email, created_at, last_try, reason}
- `diagnoses` — historique complet des bilans (alimente la courbe d'évolution)
- `users` : + `shopify_email`, `order_ref`

## Graphiques de progression (demande explicite)
`src/components/ProgressCharts.tsx` — `react-native-gifted-charts` + `react-native-svg`
- 2 KPI : séances totales, minutes de lumière
- Barres : assiduité sur 4 semaines + ligne d'objectif hebdomadaire
- Courbe : moyenne des indicateurs de peau bilan par bilan (dès 2 bilans)
- Barres horizontales : répartition des minutes par couleur LED

## Rappels quotidiens
`src/notifications.ts` — notifications **locales** expo-notifications
- Permission demandée uniquement après action volontaire, gestion granted/denied/blocked
  (+ bouton « Ouvrir les réglages » si bloqué), préférence persistée (AsyncStorage)
- Choix de l'heure : 8 h / 12 h / 18 h / 20 h / 22 h, trigger DAILY, canal Android dédié
- Contenu personnalisé avec la couleur et la durée du jour
- Non fonctionnel sur le web (switch désactivé avec explication)

## À faire côté Nūr (hors code)
1. Créer l'app personnalisée Shopify (`read_orders`, `read_customers`) et fournir
   `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ADMIN_TOKEN`
2. Créer la page `nurprotocol.com/activate` avec les deux boutons de stores
3. Héberger `/.well-known/apple-app-site-association` et `/.well-known/assetlinks.json`
   pour que le lien ouvre l'app directement (optionnel, confort)
