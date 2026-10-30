# Ouvrir Nūr sur un téléphone — sans appareil photo

## Le lien à partager

```
https://nur-protocol-skin.preview.emergentagent.com
```

C'est un lien web ordinaire : il ouvre l'app complète dans le navigateur du téléphone, sans
Expo Go et sans appareil photo. À envoyer par message ou par e-mail à la marque et aux créatrices.

Dans l'app, la page **« Ouvrir Nūr sur mon téléphone »** (adresse `/open`) reprend ce lien, un
QR code de secours, les 3 étapes et le dépannage. Elle est privée : aucun lien n'y mène depuis
l'app des clientes.

## Pourquoi le QR de l'aperçu ouvrait une autre application

Le QR affiché à côté de l'aperçu ne contient pas une adresse web mais une adresse technique
réservée à Expo Go (`exp://…`). L'appareil photo ne sait pas l'ouvrir dans un navigateur : il
propose donc la seule application installée qui se déclare capable de traiter ce type de lien.
Ce QR est généré par la plateforme d'aperçu et n'est pas modifiable — d'où le lien web ci-dessus,
qui le remplace. Les autres QR codes (menus, factures) fonctionnent normalement puisqu'ils
contiennent, eux, une adresse web.

Pour retirer la proposition sur le téléphone :
Réglages → Applications → l'application concernée → Ouvrir par défaut → Effacer.

## Installer l'app sur l'écran d'accueil

Une fois le lien ouvert :

- **iPhone** : menu Partager → « Sur l'écran d'accueil »
- **Android** : menu ⋮ → « Installer l'application »

L'app s'ouvre alors en plein écran, avec l'icône et le nom Nūr Skincoach, sans barre de navigateur
(`frontend/public/manifest.json` + balises dans `frontend/app/+html.tsx`).

Caméra et micro demandent une autorisation du navigateur et restent moins fiables qu'en
application installée ; les notifications n'existeront qu'après génération des builds.

## Code d'essai

`0000` — accueil → « Activate my Skincoach & Nūr Protocol » → « J'ai un code partenaire » → `0000`.
Chaque personne démarre avec son propre profil. Ce code sera retiré avant la publication
sur les stores.

## Voir la page du site avant de la coller

La page `nurprotocol.com/app` (fichier `page-nurprotocol-app.html`) est consultable telle quelle :

```
https://nur-protocol-skin.preview.emergentagent.com/_preview-site-page.html
```

C'est le même fichier, servi pour aperçu — rien à installer.

## Après le déploiement
1. Remplacer le lien ci-dessus par l'adresse de production dans :
   - ce fichier,
   - `deliverables/page-nurprotocol-app.html` (attribut `data-app-url`).
2. Renseigner `data-ios-url` et `data-android-url` dans la même page : les deux boutons des
   stores s'activent alors automatiquement (ils affichent « bientôt » tant qu'ils sont vides).
3. Vérifier le QR de la carte gold de bout en bout sur iOS et Android.
