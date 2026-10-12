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
