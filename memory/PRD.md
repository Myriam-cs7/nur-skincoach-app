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

---

# Session juin 2026 (suite) — Activation instantanée, 7 modes, nouveau logo

## Décision : activation en 2 étapes, sans aucune attente
L'ancienne barrière (« accès validé sous 24 h ») est SUPPRIMÉE. Nouveau parcours :
1. La cliente saisit l'e-mail de sa commande
2. Elle reçoit un code à 6 chiffres (e-mail « Nūr Protocol », réponses vers contact@nurprotocol.com)
3. Elle saisit le code → accès immédiat

La vérification Shopify tourne en tâche de fond (`asyncio.create_task`) et ne bloque jamais.
Aucune commande trouvée → **période de découverte de 14 jours**, accès COMPLET, bandeau positif
« Rattacher ma commande ». À l'échéance sans rattachement → écran « Votre accès est en pause »
avec bouton de rattachement et contact (rien n'est supprimé).

### Règles du code
- Valable 10 minutes · renvoi possible après 60 s · max 5 envois / heure · max 5 tentatives
- Consommé après succès · même e-mail = même profil (idempotent, jamais de doublon)
- Collage direct depuis l'e-mail, autofill iOS/Android (`textContentType=oneTimeCode`, `autoComplete=sms-otp`)

### Chemins alternatifs
- **Codes partenaires multi-usage** : `NUR-CREATOR`, `NUR-PRESSE`, `NUR-SAV`, `NUR-CADEAU`
  (chaque activation crée un profil distinct, `active: false` pour révoquer)
- **Liste blanche e-mail** : `db.allowed_emails` → accès vérifié sans commande
- **Numéro de commande** accepté comme preuve alternative (`/link-order`)

## E-mail (Emergent managed)
`/app/backend/emailer.py` — gate `_assert_safe_email` sur chaque envoi, templates serveur
dans les 7 langues, `from_name` = Nūr Protocol, `contact_email` = contact@nurprotocol.com.
Envoi AVANT persistance du code : si l'e-mail échoue, aucun code fantôme en base.
429 du fournisseur → 1 relance après 2 s puis 503 `email_unavailable` (message dédié côté app).

## Les 7 modes du masque (remplacent l'ancienne liste de 6)
rouge 633 nm · bleu 415 nm · vert 532 nm · jaune 590 nm · cyan 490 nm ·
violet (415 + 633 nm combinés) · blanc (spectre complet)
Mis à jour partout : `/api/led-library`, prompts de diagnostic (7 langues), prompts du coach,
prompts du tunnel pré-achat, bibliothèque, rituel, graphiques.
Les mentions 830 nm / 1072 nm ont été retirées de l'app (non confirmées par l'usine).
Textes des 7 lumières traduits dans les 7 langues : `/app/frontend/src/led.ts`.

## Identité visuelle
- Refonte beige & or construite puis **annulée** à la demande de la cliente : **fond noir conservé**.
- `theme.ts` conserve les nouveaux jetons `gradient.*` et `shadow.*` (palette sombre).
- **Nouveau logo** (lockup NŪR PROTOCOL · AI SKIN COACH · LED MASK) détouré en PNG transparent :
  `assets/images/nur-logo.png`. Icônes régénérées depuis le monogramme NŪR :
  `icon.png`, `adaptive-icon.png`, `favicon.png`, `splash-icon.png`.
- Écran d'accueil responsive (`useWindowDimensions`), le logo ne déborde plus.
- Dictionnaire EN complété : 238 clés, parité totale avec le FR (coach, tunnel, codes).

## Livrables (dossier /app/deliverables)
- `nur-qr-carte-gold-2048.png` + `nur-qr-carte-gold.svg` → QR de la carte gold
  (contenu `https://nurprotocol.com/app`, décodage vérifié jusqu'à 180 px)
- `README-QR-carte-gold.md` → specs d'impression pour l'agent en Chine
- `page-nurprotocol-app.html` → page à coller dans Shopify (détection iOS/Android)

## Nouvelles API
- `POST /api/auth/request-code` {email, lang}
- `POST /api/auth/verify-code` {email, code, lang} → AccessResponse
- `GET /api/users/{id}/access` · `POST /api/users/{id}/link-order`
- `GET /api/qr` · `GET /api/qr.svg`
- Supprimé : `POST /api/verify-purchase`

## Collections
`otps` {email, code, attempts, expires_at, last_sent_at, window_start, sends_in_window}
`users` + {access_status: verified|trial|paused, trial_expires_at, first_name, order_ref, shopify_email}

## Reste à faire côté Nūr
1. Jeton Shopify (`read_orders`, `read_customers`) → active la vérification automatique
2. Mettre en ligne `nurprotocol.com/app` avant la première livraison
3. Phase 2 : console d'admin, pré-activation à l'achat, photos avant/après, liens universels

---

# Session juin 2026 (suite) — Consultation vocale & analyse photo du Skincoach

## Ce que la cliente vit
Le Skincoach n'est plus un simple chat : c'est une consultation.
1. Avatar Nūr visible, halo animé selon l'état (écoute / réflexion / parole)
2. Elle peut **parler** : appui sur le micro → transcription (OpenAI `gpt-4o-mini-transcribe`)
3. L'IA pose **une seule question à la fois** (préoccupation, type de peau, routine, rythme de vie, précautions)
4. Après 3 questions minimum, elle propose **une photo du visage — caméra uniquement**
   (marqueur serveur `[PHOTO]` → `ask_photo: true`, retiré de la réponse affichée)
5. Animation de **scan clinique** sur la photo + son `analysis.wav` pendant l'analyse (Claude Vision)
6. **Plan final** : rituel LED (modes, durée, fréquence) + soins cosmétiques en **actifs et types de
   produits uniquement** (niacinamide 5 %, acide hyaluronique, SPF 50…), **jamais de marque**
7. Chaque réponse de l'assistante a un bouton **Écouter** (voix OpenAI `nova`, `tts-1`).
   La lecture vocale est **désactivée par défaut** (choix de la cliente).
8. Sons d'interface : `send.wav` à l'envoi, `receive.wav` à la réponse, `analysis.wav` en boucle pendant le scan

## Détails techniques
- Backend : `POST /api/transcribe` (multipart `audio` + `lang`, refus < 2 Ko),
  `POST /api/tts` → `{path}` + `GET /api/tts/{sha256}.mp3` (cache disque, `audio/mpeg`),
  `POST /api/users/{id}/chat` accepte `photo_base64`/`mime_type` et renvoie `ask_photo`.
  Nettoyage du texte avant synthèse (emoji, URL, markdown, « Nūr » → « Nour ») et retrait du
  markdown dans les réponses (elles peuvent être lues à voix haute).
- Frontend : `src/voice.ts` (sons, TTS, STT), `src/components/CoachAvatar.tsx`, `TypingDots.tsx`,
  `ScanOverlay.tsx`, refonte de `app/(tabs)/coach.tsx`.
- Micro (`expo-audio`) : metering activé, plancher de bruit calibré (+12 dB), auto-stop après
  1,8 s de silence, watchdog 60 s, mic fermé pendant la lecture vocale, permission demandée
  uniquement après un appui volontaire (+ « Ouvrir les réglages » si bloquée).
- `emergentintegrations` mis à jour en 0.2.2 (nécessaire pour `gpt-4o-mini-transcribe`).
- Micro et caméra ne fonctionnent pas dans l'aperçu web : message d'indisponibilité, aucun crash.

## Tests
`/app/backend/tests/test_voice_photo.py` → 14/14 OK (TTS, cache, STT, consultation 4-5 tours,
photo, garde-fous). Frontend : 7/7 OK (avatar, envoi texte, points de réflexion, bouton Écouter,
micro web, carte photo, « Plus tard »).

---

# Session juin 2026 (suite) — Console admin, code d'accès à l'achat, nouvel avatar

## Console privée « Espace Nūr » (`/app/frontend/app/admin.tsx`)
Accès : URL `/admin` ou **appui long de 1,2 s sur le titre de l'onglet Profil**. PIN `ADMIN_PIN`
(= `NUR2026`), mémorisé dans SecureStore, bouton cadenas pour verrouiller.
Contenu : 6 indicateurs (clientes, vérifiées, découverte, en pause, codes de commande utilisés/total,
bilans), statut Shopify, **commande de test** (émet et envoie de vrais codes), **codes de commande**
(avec renvoi de l'e-mail), **clientes** (statut + jours de découverte restants + n° de commande),
**codes partenaires** (création + interrupteur actif/révoqué), **accès manuels** et **demandes d'accès**.
API : `GET /api/admin/overview`, `POST /api/admin/simulate-order`, `/api/admin/partner-code`,
`/api/admin/code-state`, `/api/admin/resend-codes` (toutes protégées par le PIN).

## Code d'accès envoyé automatiquement à l'achat
`POST /api/shopify/webhook/orders-paid` — webhook `orders/paid` à déclarer dans Shopify.
- Signature HMAC SHA256 base64 vérifiée (`X-Shopify-Hmac-Sha256`) contre `SHOPIFY_WEBHOOK_SECRET`.
  Secret absent → 503 ; signature invalide → 401.
- **Un code par masque commandé** (format `NUR-XXXX-XXXX`, alphabet sans O/0/I/1/S/5, usage unique).
- E-mail envoyé AVANT l'écriture en base (aucun code fantôme), idempotent par `order_id`.
- L'e-mail précise explicitement : **« Ce masque est un cadeau ? Transmettez ce code à la personne
  qui le recevra — un code = une personne. »** Traduit dans les 7 langues (`_ORDER_COPY` dans `emailer.py`).
- Collections : `order_codes` {code, order_id, order_name, email, lang, created_at, sent_at}
  + entrée `activation_codes` kind="order".
- `POST /api/admin/simulate-order` rejoue le même chemin sans Shopify (tests avant mise en ligne).

## Reste à faire côté Nūr
1. Créer le webhook Shopify `orders/paid` vers `https://<domaine>/api/shopify/webhook/orders-paid`
   et coller la clé de signature dans `SHOPIFY_WEBHOOK_SECRET` (+ `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_TOKEN`)

## Avatar du Skincoach
Nouvelle photo fournie par la cliente (fond gris) : `assets/images/nur-avatar.png` (cercle animé
dans l'en-tête du chat) et `nur-coach-portrait.png` (grand portrait sur l'écran d'accueil du coach,
pour éclaircir l'écran — demande explicite : « sinon ça fait trop noir partout »).

## Tests session 4
`/app/backend/tests/test_admin_console.py` → 18/18 OK (3 ignorés quand le quota e-mail est épuisé).
Frontend : 9/9 OK (PIN, KPI, création et révocation de code, cadenas) + non-régression de `/coach`.

---

# Session juin 2026 (suite) — Audit de sécurité et durcissement

Audit demandé par la cliente → verdict « ne pas mettre en production » (1 faille élevée,
3 moyennes). Les 4 corrections ont été appliquées (choix de la cliente : « Oui, tout » et
« on ne garde pas la photo du tout » + consentement explicite avant l'analyse photo).

## 1. Console admin — clé secrète au lieu d'un PIN
- En-tête `X-Admin-Token` (valeur `ADMIN_TOKEN` dans `/app/backend/.env`, 32 octets aléatoires),
  comparaison en temps constant, plus jamais dans l'URL. `ADMIN_PIN` supprimé.
- Verrouillage **par adresse IP** : 5 échecs en 10 min → 429 `admin_locked` pendant 15 min
  (le verrou ne bloque pas les autres adresses).
- Écran `/admin` : champ « Clé d'accès », clé mémorisée dans SecureStore (repli : rien sur le web).

## 2. Sessions signées côté serveur (correction de l'IDOR)
- Jeton opaque de 32 octets (`secrets.token_urlsafe`), stocké **uniquement en SHA-256** dans
  `auth_sessions`, validité 180 jours glissants, révoqué à la réinitialisation du profil.
- Renvoyé par `POST /api/activate` et `POST /api/auth/verify-code` (champ `session_token`).
- Dépendance `require_user` sur **toutes** les routes `/api/users/{id}/*` : pas de jeton → 401,
  jeton d'une autre cliente → 403.
- Côté app : jeton dans SecureStore (AsyncStorage sur le web), en-tête `Authorization: Bearer`,
  et un 401 efface la session → retour à l'écran d'activation.

## 3. Limites anti-abus
- Par IP : auth 5/min · activation 10/10 min · IA 20/min · voix 40/min · lead 6/10 min · admin 30/min
  (en-tête `Retry-After`).
- Photo : > 8 Mo base64 → 413 sur `/diagnose` et `/chat`.
- Cache audio TTS borné (purge au-delà de 300 fichiers).
- CORS : `allow_credentials=False` (l'API est à jetons, jamais à cookies).

## 4. Données personnelles et garde-fous
- **La photo du visage n'est plus jamais conservée** (`photo_thumbnail_b64` supprimé) : analyse en
  mémoire puis oubli. Consentement explicite affiché avant la caméra du coach et avant la photo
  d'onboarding (`src/components/PhotoConsentSheet.tsx`) : analysée puis effacée, esthétique
  uniquement, refus possible sans perdre la personnalisation.
- Historique du chat reconstruit côté serveur (`chat_turns`) : une cliente ne peut plus forger de
  faux tours « Skincoach » (injection de prompt).
- Messages d'erreur neutres : `chat_unavailable`, `diagnosis_unavailable`,
  `transcription_unavailable`, `tts_unavailable` (plus de détails de fournisseur exposés).

## Tests session 5
`/app/backend/tests/test_security_hardening.py` → 29/29 OK (sessions sur les 12 routes
utilisateur, console admin, verrouillage, limites de débit, photo non stockée, injection de
prompt, erreurs neutres, non-régressions). Frontend OK : clé admin, cadenas, feuille de
consentement sur `/scan` et dans le coach, jeton bien envoyé par le chat.
Reste en suspens (cosmétique) : avertissements Expo `shadow*` → `boxShadow` et
`props.pointerEvents` → `style.pointerEvents`.
