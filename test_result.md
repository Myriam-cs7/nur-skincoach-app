#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## Session — QR gate (Shopify order verification), QR generation, reminders, progress charts

user_problem_statement: >
  La cliente ouvre la boîte Nūr, trouve une carte gold avec UN SEUL QR code (même design sur
  toutes les cartes, imprimé en Chine). Elle scanne → arrive sur l'app → doit prouver son achat.
  Barrière retenue : vérification de l'e-mail de commande Shopify. Plus : rappels de soin
  quotidiens (notifications locales) et graphiques de progression.

backend:
  - task: "POST /api/verify-purchase (Shopify order gate)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: "Shopify GraphQL Admin API orders(query email:). Credentials NOT yet provided by user → SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_TOKEN vides. Attendu dans cet état : 503 shopify_not_configured + enregistrement dans db.access_requests. Allow-list db.allowed_emails doit fonctionner sans Shopify."
  - task: "GET /api/qr (QR PNG for the gold card)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
  - task: "Admin endpoints (PIN=NUR2026): POST /api/admin/allow-email, GET /api/admin/access-requests"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
  - task: "GET /api/users/{id}/progress (charts data)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"

frontend:
  - task: "Gate e-mail de commande + bascule code d'invitation (/activate)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/activate.tsx"
  - task: "Scanner QR intégré (/scan-qr)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/scan-qr.tsx"
    comment: "Sur web : écran de repli attendu (caméra non supportée)."
  - task: "Graphiques de progression (home)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/ProgressCharts.tsx"
  - task: "Rappels quotidiens (notifications locales + choix de l'heure)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/notifications.ts"
    comment: "Non testable sur web (switch désactivé) — vérifier seulement l'UI et l'absence de crash."

## Session 2 — Activation instantanée par code e-mail (OTP), 7 modes LED, période de découverte

user_problem_statement: >
  Un seul QR code identique sur toutes les cartes gold (https://nurprotocol.com/app).
  L'ancienne barrière "vérification de commande avec message 24 h" est REMPLACÉE par une
  activation instantanée : e-mail → code à 6 chiffres reçu par e-mail → accès immédiat.
  Vérification Shopify en tâche de fond (jamais bloquante). Si aucune commande trouvée →
  période de découverte de 14 jours avec accès complet + bandeau "Rattacher ma commande".
  Codes partenaires multi-usage pour influenceuses/presse. 7 modes LED réels (dont blanc).
  Thème : fond noir conservé (la cliente a finalement refusé la version beige).

backend:
  - task: "POST /api/auth/request-code — envoi du code à 6 chiffres par e-mail"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py, /app/backend/emailer.py"
    comment: |
      Emergent managed email. Limites : renvoi après 60 s (429 resend_too_soon),
      max 5 envois / heure (429 too_many_requests), code valable 600 s.
      E-mail de test sûr : delivered@resend.dev
  - task: "POST /api/auth/verify-code — activation + période de découverte 14 j"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: |
      Mauvais code → 400 invalid_code (max 5 tentatives → 429 too_many_attempts),
      expiré → 400 code_expired, jamais demandé → 404 no_code_requested.
      Crée l'utilisateur avec access_status=trial + trial_expires_at (14 j) et lance
      la vérification Shopify en tâche de fond (asyncio.create_task).
      Shopify non configuré (cas actuel) → l'accès reste ouvert en trial.
  - task: "GET /api/users/{id}/access + POST /api/users/{id}/link-order"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: "link-order sans Shopify configuré → 503 shopify_not_configured (comportement attendu)."
  - task: "Codes partenaires multi-usage (/api/activate)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: "NUR-CREATOR, NUR-PRESSE, NUR-SAV, NUR-CADEAU → un profil distinct à chaque activation. NUR-DEMO-2026 reste à usage unique."
  - task: "7 modes LED dans /api/led-library et tous les prompts IA"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
  - task: "GET /api/qr et /api/qr.svg (carte gold)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "Décodage vérifié : https://nurprotocol.com/app (PNG 2048/600/300/180 px)."
  - task: "/api/verify-purchase SUPPRIMÉ (remplacé par le flux OTP)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"

frontend:
  - task: "Écran d'activation en 3 étapes : e-mail → code 6 chiffres → (ou) code partenaire"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/activate.tsx"
  - task: "Écran Rattacher ma commande (e-mail ou n° de commande)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/link-order.tsx"
  - task: "Bandeau période de découverte + écran d'accès en pause (accueil)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/home.tsx"
  - task: "Bibliothèque des 7 lumières, textes en 7 langues"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/library.tsx, /app/frontend/src/led.ts"
    comment: "Vérifié visuellement : 7 cartes, longueurs d'onde 633/415/532/590/490/415+633/spectre complet."
  - task: "Rituel hebdomadaire — jours localisés + 7 lumières"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/protocol.tsx"

## Session 8 — Montée vers Expo SDK 58 (demande cliente)

Migration SDK 54 → 58 (React Native 0.81 → 0.88, React 19.1 → 19.3) via la skill
`expo-version-upgrade`.

### Changements appliqués
1. `yarn expo install expo@^58.0.0` puis `yarn expo install --fix` → toutes les dépendances Expo
   alignées (expo-router 58.0.28, reanimated 4.7.1, svg 15.16, worklets 0.13, typescript 6).
2. **Icônes** : `@expo/vector-icons` (déprécié) → `@react-native-vector-icons/feather` dans les
   19 fichiers concernés. `src/hooks/use-icon-fonts.ts` ne télécharge plus la police depuis un CDN :
   le .ttf livré par le paquet est préchargé sous le nom PostScript « Feather ».
3. **app.json** : `newArchEnabled` et `edgeToEdgeEnabled` retirés (obsolètes depuis le SDK 55),
   `userInterfaceStyle` passé de `dark` à **`automatic`** (sinon iOS forçait le thème sombre et le
   mode clair ne pouvait jamais s'activer).
4. **Nettoyage caméra uniquement** : `expo-image-picker` désinstallé, plugin et permissions
   `NSPhotoLibraryUsageDescription` / `READ_EXTERNAL_STORAGE` supprimés.
5. **Types stricts RN 0.88** : `makeStyles` contraint par `NamedStyles<T>` (sinon les littéraux
   `alignItems`, `overflow`… étaient élargis en `string`), dégradés typés en tuple
   `readonly [string, string, ...string[]]`, `useRef<ScrollViewInstance>` dans le coach.
6. **Nouvelles règles React Compiler** : `Animated.Value` créées via `useState(() => …)` au lieu de
   `useRef().current` (CoachAvatar, TypingDots, ScanOverlay) ; effet redondant supprimé dans
   `activate.tsx` ; exceptions documentées pour `Date.now()` hors rendu dans le coach.

### Vérifications
- `npx tsc --noEmit` : 0 erreur. `eslint app src` : 0 erreur (5 avertissements préexistants).
- `npx expo-doctor` : **20/20 checks passed**.
- Rendu vérifié : accueil (sombre) et tableau de bord avec données réelles (logo, icônes,
  réglages du boîtier, test de sensibilité) sous SDK 58.
- Backend non modifié.

### À faire vérifier par le testing agent
Non-régression complète après montée de version : 5 onglets, nouveaux écrans, activation `0000`,
thèmes clair/sombre, chat, voix, console admin.

---

## Session 7 — identité beauty tech, rituel réel, accès d'essai (étape 1 du plan validé)

### Ce qui a changé
1. **Typographie** : Manrope + Inter (plus aucun serif). `theme.type` refondu.
2. **Thème clair/sombre** : `makeStyles()` dans `src/theme.ts` construit les deux palettes ;
   `setScheme()` appelé depuis `app/_layout.tsx` via `useColorScheme()` (noir par défaut).
   Logos en version claire pour le fond blanc.
3. **Accueil épuré** : signature « YOUR SKIN, YOUR PROTOCOL », logo, titre, un seul bouton,
   ligne de confidentialité. `/scan-qr` supprimé, prescription gratuite retirée de l'app.
4. **Rituel réel** : `normalize_protocol()` (backend) ajoute `device_mode`, `brightness` et
   arrondit `session_minutes` aux valeurs du minuteur ; affiché en « ordonnance » sur
   l'accueil et dans l'onglet Rituel, avec mot de prudence si `sensitive_care`.
5. **Bibliothèque** : réglages + séances/semaine + niveau de certitude par lumière.
6. **Skincoach** : nouveau prompt (experte, jamais médecin, « Your concern » en ouverture,
   7 champs, refus `[REJECT]` des photos non conformes sans trace, actifs uniquement).
7. **Nouveaux écrans** `/mask` et `/patch-test` (+ rappel non bloquant sur l'accueil).
8. **Code d'essai `0000`** (multi-usage) et « recommencer mon bilan » dans le profil.
9. Photo **caméra uniquement** partout (galerie retirée de `/scan`).

### Vérifications déjà faites par l'agent principal
- `GET /api/users/demo-charts-user/protocol` → `device_mode`, `brightness`, minutes ∈ {5,10,15,20}.
- `POST /api/activate {"activation_code":"0000"}` → 200 + session_token.
- Chat FR : premier message → « Qu'est-ce qui vous préoccupe aujourd'hui… » (Your concern).
- Photo non conforme (image de paysage) → « Je ne peux analyser qu'une photo de visage… »,
  `rejected: true`, `ask_photo: true`, aucun tour enregistré.
- Captures : accueil (clair), tableau de bord (sombre + clair), coach (clair), `/mask`, `/library`.

### Reste à vérifier par le testing agent
Parcours complet d'essai avec `0000`, les deux ambiances sur les 5 onglets, les nouveaux écrans,
les réglages du boîtier, la suppression des entrées retirées (galerie, scan QR, prescription),
et les non-régressions (suppression de compte, console admin, voix).

---

## Session 6 — Refonte UI/UX (charte Nūr Protocol), suppression des données, ventes hebdo, webhook Shopify

user_problem_statement: >
  « L'UX et l'UI design n'est pas bon du tout… la façon dont tu as positionné "Your Beauty Expert"
  puis "Nūr Skincoach" en dessous, les textes ne sont pas alignés… le pire c'est le tracking :
  "STREAK" est coupé, le K est en bas, "SESSIONS" NS en bas… y a pas mon logo, il apparaît nulle
  part… il faut choisir les bonnes polices » (captures du site nurprotocol.com fournies).
  Demandes supplémentaires : bouton « supprimer mes données » dans le profil ; nombre de codes
  envoyés et activés par semaine dans la console ; clé de signature du webhook Shopify fournie.

frontend:
  - task: "Typographie de marque (Cormorant Garamond + DM Sans) chargée via expo-font"
    implemented: true
    working: true
    file: "/app/frontend/src/hooks/use-brand-fonts.ts, /app/frontend/src/theme.ts, /app/frontend/app/_layout.tsx"
    comment: |
      5 TTF locaux (Cormorant Regular/Medium/SemiBold, DM Sans Regular/Medium), couverture ū et
      accents vérifiée. Échelle `theme.type` ajoutée (display/h1/h2/stat/body/bodySm/label/
      cardLabel/button/micro). Toutes les styles de texte de l'app reçoivent une fontFamily.
  - task: "En-tête unique avec le VRAI logo (BrandHeader)"
    implemented: true
    working: true
    file: "/app/frontend/src/ui.tsx"
    comment: |
      Nouveau composant `BrandHeader` : logo `nur-logo-header.png` centré (variante recadrée du
      logo officiel), titre d'écran en Cormorant, sous-titre optionnel, flèche de retour et slot
      droit. Remplace l'ancien bandeau doré « YOUR BEAUTY EXPERT » mal aligné sur 10 écrans
      (accueil, protocole, bibliothèque, profil, activation, lien commande, scan QR, coach, admin).
      Vérifié au screenshot sur /home et /coach.
  - task: "Règles anti-casse typographique (fin de « STREA / K »)"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/home.tsx, /app/frontend/src/ui.tsx"
    comment: |
      Libellés de cartes sans letterSpacing (`theme.type.cardLabel`), `numberOfLines={1}` +
      `adjustsFontSizeToFit` + `minimumFontScale`, cartes en `flex: 1, minWidth: 0`.
      Vérifié : STREAK / SESSIONS / WEEK tiennent sur une ligne en FR et EN.
  - task: "Bouton « Supprimer mes données » dans le profil"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/profile.tsx"
    comment: "testID `delete-data`, Alert de confirmation (annuler / tout supprimer) → DELETE /api/users/{id} + effacement de la session locale + retour à l'accueil."
  - task: "Ventes par semaine dans la console admin"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin.tsx"
    comment: "Histogramme 8 semaines : codes envoyés (barre claire) et activés (barre dorée)."

backend:
  - task: "GET /api/admin/overview renvoie weekly_codes (8 dernières semaines)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "Vérifié : [{week_start, label, issued, activated}] — S42 : 27 envoyés / 6 activés."
  - task: "Clé de signature du webhook Shopify installée"
    implemented: true
    working: true
    file: "/app/backend/.env"
    comment: "SHOPIFY_WEBHOOK_SECRET renseignée ; webhook sans signature → 401 (plus 503) ; overview indique webhook: true."

## Session 5 — Durcissement sécurité (suite à l'audit)

user_problem_statement: >
  Audit de sécurité demandé par la cliente, puis correction de tout ce qui bloquait la mise en
  production : console admin trop facile à deviner, données d'une cliente accessibles avec son
  seul identifiant, endpoints IA ouverts à tous, photo de visage conservée en base.
  Choix de la cliente : « Oui, tout » + « on ne garde pas la photo » + ajouter un consentement
  (type clause de chatbot) avant l'analyse photo.

backend:
  - task: "Sessions signées côté serveur sur toutes les routes /api/users/{id}/*"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: |
      Jeton opaque 32 octets (`secrets.token_urlsafe`), stocké uniquement en SHA-256 dans
      `auth_sessions`, validité 180 jours glissants. Renvoyé par /api/activate et
      /api/auth/verify-code (`session_token`). Dépendance `require_user` : pas de jeton → 401,
      jeton invalide → 401, jeton d'une autre cliente → 403 (IDOR corrigé).
      Vérifié en local : 401 / 200 / 403 / 401 sur /users/{id} et /users/{id}/chat.
  - task: "Console admin par clé secrète longue + verrouillage"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: |
      En-tête `X-Admin-Token`, comparaison en temps constant, 5 échecs en 10 min → 429 pendant
      15 min. `ADMIN_PIN` supprimé du code et du .env. L'ancien appel `?pin=NUR2026` renvoie 401.
  - task: "Limites de débit par IP sur auth, activation, IA, voix, lead, admin"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: "auth 5/min · activation 10/10 min · ai 20/min · tts 40/min · lead 6/10 min · admin 30/min (en-tête Retry-After)."
  - task: "Photo de visage jamais conservée + plafond de taille"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "`photo_thumbnail_b64` retiré de `diagnoses`/`users.diagnosis` ; > 8 Mo base64 → 413."
  - task: "Historique du chat reconstruit côté serveur (anti injection de prompt)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "Collection `chat_turns` ; le champ `history` du client a été supprimé du modèle. Vérifié sur 2 tours."
  - task: "Erreurs neutres, CORS sans credentials, cache voix borné"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "chat_unavailable / diagnosis_unavailable / transcription_unavailable / tts_unavailable ; purge du cache TTS au-delà de 300 fichiers."

frontend:
  - task: "Jeton de session stocké dans SecureStore et envoyé en Authorization"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/api.ts"
    comment: "401 → session effacée (retour à l'activation). Sur le web, repli AsyncStorage (SecureStore indisponible)."
  - task: "Console admin : saisie de la clé secrète (plus de PIN), en-tête X-Admin-Token"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin.tsx"
  - task: "Consentement explicite avant toute analyse photo"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/PhotoConsentSheet.tsx, app/(tabs)/coach.tsx, app/scan.tsx"
    comment: "Feuille de consentement (photo analysée puis effacée, esthétique uniquement, refus possible) avant la caméra du coach et avant la photo d'onboarding."

## Session 4 — Console admin privée, code d'accès envoyé à l'achat, nouvel avatar

user_problem_statement: >
  (1) Un écran privé pour suivre les activations, les périodes d'essai et les codes partenaires.
  (2) Envoi automatique du code d'accès par e-mail dès qu'une commande Shopify est payée, en
  précisant que le code doit être transmis à la personne à qui le masque est offert (cadeau).
  (3) L'avatar du Skincoach était « hideuse » → nouvelle photo avec fond gris pour éclaircir l'écran.

backend:
  - task: "POST /api/shopify/webhook/orders-paid — 1 code d'accès par masque commandé"
    implemented: true
    working: true
    file: "/app/backend/server.py, /app/backend/emailer.py"
    comment: |
      HMAC SHA256 base64 vérifié (en-tête X-Shopify-Hmac-Sha256) contre SHOPIFY_WEBHOOK_SECRET.
      Secret absent → 503 webhook_not_configured. Mauvaise signature → 401. Signature valide →
      codes générés (format NUR-XXXX-XXXX, alphabet sans O/0/I/1/S/5), e-mail envoyé AVANT la
      persistance, idempotent par order_id (rejoué → already_issued=true, aucun nouvel e-mail).
      Statut financier non payé → {"ok":true,"skipped":...}. Vérifié en local (401/200/replay).
  - task: "POST /api/admin/simulate-order (PIN) — même chemin sans Shopify"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "Vérifié : 2 codes émis et envoyés à delivered+order@resend.dev pour #1042."
  - task: "GET /api/admin/overview (PIN) — console"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "counts, users (statut + jours d'essai), partner_codes, order_codes (used), requests, allowed, shopify."
  - task: "POST /api/admin/partner-code · /api/admin/code-state · /api/admin/resend-codes"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    comment: "Création/MAJ d'un code partenaire, activation/révocation, renvoi de l'e-mail des codes d'une cliente."
  - task: "Activation avec un code de commande"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: "NUR-DPNP-RG8Q → user créé, access_status=verified, order_ref='Commande #1043', code marqué utilisé."

frontend:
  - task: "Console admin /admin — PIN puis tableau de bord"
    implemented: true
    working: true
    file: "/app/frontend/app/admin.tsx"
    comment: |
      PIN mémorisé dans SecureStore, bouton cadenas pour verrouiller. KPI, statut Shopify,
      commande de test, codes de commande (+ renvoi), clientes (statut/jours d'essai),
      codes partenaires (interrupteur actif/révoqué), accès manuels, demandes d'accès.
      Vérifié au screenshot avec PIN NUR2026.
  - task: "Entrée discrète vers la console (appui long 1,2 s sur le titre du Profil)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/profile.tsx"
  - task: "Nouvel avatar (fond gris) + portrait sur l'accueil du Skincoach"
    implemented: true
    working: true
    file: "/app/frontend/assets/images/nur-avatar.png, nur-coach-portrait.png, /app/frontend/app/(tabs)/coach.tsx"

## Session 3 — Consultation vocale & analyse photo dans le Skincoach

user_problem_statement: >
  Le Skincoach doit devenir une vraie consultation : avatar visible, entrée vocale (micro →
  transcription), lecture vocale des réponses (désactivée par défaut, bouton 🔊 par message,
  voix OpenAI "nova"), points de réflexion animés, sons d'interface (envoi/réception/analyse),
  questions une par une puis demande de photo À LA FIN (caméra uniquement) avec animation de scan,
  puis plan final : rituel LED + actifs et types de produits cosmétiques (JAMAIS de marque),
  garde-fous beauté stricts (aucun vocabulaire médical).

backend:
  - task: "POST /api/transcribe — transcription audio (OpenAI gpt-4o-mini-transcribe)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: |
      Multipart: champ `audio` (m4a/mp3/wav/webm) + champ `lang`. Fichier < 2 Ko → {"text":"","reason":"too_short"}.
      Vérifié en local avec un mp3 généré par /api/tts → texte correct en français.
  - task: "POST /api/tts + GET /api/tts/{key}.mp3 — synthèse vocale (tts-1, voix nova)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: |
      POST {text, lang} → {"path": "/api/tts/<sha256>.mp3"}. Cache disque par hash
      (texte|voix|vitesse|modèle|format). GET renvoie audio/mpeg (77 Ko vérifiés).
      Nettoyage du texte avant synthèse (emoji, URL, markdown, « Nūr » → « Nour »).
  - task: "POST /api/users/{id}/chat — consultation guidée + photo (Claude Vision)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    comment: |
      Nouveaux champs : photo_base64, mime_type. Réponse : {reply, blocked, ask_photo}.
      Le prompt mène la consultation une question à la fois puis termine par le marqueur
      [PHOTO] (retiré de la réponse, ask_photo=true) après 3 questions minimum.
      Vérifié : 4 tours → ask_photo=true au 4e ; photo envoyée → observation beauté + plan final
      (rituel LED + actifs, aucune marque). Markdown retiré côté serveur (réponses lues à voix haute).
      Garde-fou hors-sujet toujours actif (test « prix du bitcoin » → refus poli).

frontend:
  - task: "Coach : avatar animé, points de réflexion, sons d'interface"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/coach.tsx, /app/frontend/src/components/CoachAvatar.tsx, TypingDots.tsx"
  - task: "Entrée vocale (micro → /api/transcribe) avec auto-stop sur silence"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/coach.tsx, /app/frontend/src/voice.ts"
    comment: |
      expo-audio : metering activé, plancher de bruit calibré (+12 dB), auto-stop après 1,8 s de
      silence, watchdog 60 s, permission demandée seulement après un appui volontaire
      (feuille d'explication puis « Ouvrir les réglages » si bloquée).
      NON testable sur le web : le bouton micro affiche un message d'indisponibilité.
  - task: "Lecture vocale par message (bouton Écouter), désactivée par défaut"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/voice.ts"
  - task: "Photo de consultation : caméra uniquement + animation de scan"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/coach.tsx, /app/frontend/src/components/ScanOverlay.tsx"
    comment: "Carte « Prendre ma photo » affichée quand ask_photo=true. Sur le web, la caméra n'est pas disponible → panneau de permission."

### Résultats itération 2 (après corrections)
- `pytest /app/backend/tests/` → **16 passés, 2 ignorés** (les 2 ignorés envoient de vrais
  e-mails et sont sautés automatiquement quand le quota du fournisseur est épuisé).
- Les tests ne consomment plus le quota d'envoi : helper `_seed_otp` / `_activate` qui écrit
  le code directement en base. Seuls `TestRequestCode` déclenchent un vrai envoi.
- Corrections apportées après l'itération 2 :
  - `request-code` envoie l'e-mail AVANT d'écrire le code (plus de code fantôme si l'envoi échoue) — vérifié
  - `verify-code` insère l'utilisateur AVANT de supprimer le code
  - 429 du fournisseur → 1 relance après 2 s puis 503 `email_unavailable` + message dédié dans l'app
  - EN complété (238 clés, parité FR) : coach, tunnel pré-achat, codes
  - Grammaire EN `proto.sub` corrigée
- Parcours UI revérifié au screenshot : e-mail → écran du code (e-mail masqué + compte à rebours 59 s)
  → mauvais code (message d'erreur, on reste sur l'écran) → bon code → `/onboarding`.
- Nouveau logo intégré, écran d'accueil responsive, icônes/splash régénérés.
