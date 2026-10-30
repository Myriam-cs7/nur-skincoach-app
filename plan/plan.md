# Accès à l'app depuis un téléphone — sans passer par l'appareil photo

Une page d'accès qui ouvre Nūr Skincoach sur n'importe quel téléphone en tapant un lien, plus la
page `nurprotocol.com/app` que le QR de la carte gold ouvrira chez les clientes.
Le QR d'aperçu, détourné par une autre application installée sur le téléphone, cesse d'être le
chemin obligatoire pour tester l'app.

## Pour qui

- La marque, qui doit pouvoir ouvrir l'app sur son propre téléphone en quelques secondes.
- Les influenceuses, qui reçoivent un lien et doivent pouvoir essayer sans rien comprendre
  à Expo Go ni à un QR code.
- La cliente finale, qui scannera le QR de sa carte gold et doit arriver sur une page de marque,
  jamais sur une erreur ni dans une application étrangère.

## Ce qui est corrigé, et pourquoi

Le QR de l'aperçu ne contient pas une adresse web : il contient une adresse technique réservée à
l'application Expo Go. L'appareil photo ne peut donc pas l'ouvrir dans un navigateur et propose la
seule application installée qui se déclare capable de traiter ce type de lien — sur ce téléphone,
Doctolib. C'est aussi pour cela que les autres QR codes (menus, factures) fonctionnent
normalement : ils contiennent, eux, une adresse web.

Ce QR est généré par la plateforme d'aperçu et n'est pas modifiable. La correction consiste donc à
ne plus en dépendre : un lien web ordinaire ouvre l'app complète dans le navigateur du téléphone,
sans Expo Go et sans appareil photo.

## Contenu et expérience

**Page « Ouvrir Nūr sur mon téléphone » (privée)**
- L'adresse de l'app écrite en grand, lisible et recopiable d'un seul geste.
- Un QR code de secours qui contient, lui, une vraie adresse web : scanné avec l'appareil photo,
  il ouvre le navigateur et jamais une autre application.
- Trois étapes courtes : ouvrir le lien, ajouter l'app à l'écran d'accueil, entrer le code d'essai.
- Un encadré de dépannage : que faire si l'appareil photo propose encore une autre application
  (scanner depuis Expo Go, ou simplement taper le lien), et comment retirer cette proposition dans
  les réglages du téléphone.
- Page réservée à la marque et aux influenceuses : aucun lien depuis l'app des clientes.

**Installation sur l'écran d'accueil**
L'app ouverte dans le navigateur peut être ajoutée à l'écran d'accueil : icône Nūr, nom Nūr
Skincoach, ouverture en plein écran sans barre de navigateur, fond noir au lancement. L'essai
ressemble alors à une vraie application, ce qui compte pour les retours des influenceuses.

**Page `nurprotocol.com/app` prête à coller**
La page que le QR de la carte gold ouvrira, livrée en un seul fichier à déposer sur le site :
- en-tête de marque : logo, signature « YOUR SKIN, YOUR PROTOCOL » ;
- un bouton principal « Ouvrir mon Skincoach » ;
- deux emplacements App Store et Google Play, visibles mais inactifs tant que les applications ne
  sont pas publiées, avec la mention « bientôt » ;
- « Comment activer » : le code reçu par e-mail à l'achat, ou le code de la carte, et la consigne
  de transmettre le code à la personne à qui le masque est offert ;
- une ligne de confidentialité et le rappel que les photos ne sont jamais conservées ;
- français et anglais selon la langue du téléphone.

Le contenu du QR de la carte gold ne change pas : il reste `https://nurprotocol.com/app`, l'adresse
définitive prévue pour ne jamais être réimprimée.

## Parcours

1. La marque ou une influenceuse reçoit un seul lien, par message ou par e-mail.
2. Le lien ouvre l'app directement dans le navigateur du téléphone : accueil, signature, logo,
   bouton d'activation.
3. Activation avec le code d'essai, puis questionnaire, bilan et rituel comme sur l'app finale.
4. Option « ajouter à l'écran d'accueil » pour retrouver Nūr comme une application.
5. Plus tard, la cliente scanne le QR de sa carte gold, arrive sur `nurprotocol.com/app`, et ouvre
   l'app — ou l'installe depuis les stores une fois les applications publiées.

## Esprit visuel

Même écriture que l'app : noir profond ou blanc clinique selon le téléphone, or champagne en filets
fins, typographie d'ingénierie, beaucoup de vide. Les deux pages sont pensées pour le pouce :
le lien et le bouton principal occupent toute la largeur, les zones tactiles sont larges, rien
n'exige de zoomer.

## Étapes

**Étape 1 — réalisée maintenant**
Page d'accès privée avec lien recopiable, QR web de secours et dépannage ; installation de l'app
sur l'écran d'accueil (icône, nom, plein écran) ; page `nurprotocol.com/app` complète et prête à
coller, en français et en anglais.

**Étape 2 — à la publication des builds**
Mise en service des liens de marque sur les téléphones : le lien de la carte ouvre directement
l'application lorsqu'elle est installée, et la page web sinon ; activation des boutons App Store et
Google Play ; vérification du QR de la carte de bout en bout sur iOS et Android.

**Étape 3 — plus tard**
Comptage des scans de carte (combien de cartes activées, par semaine) dans la console privée, puis
retrait du code d'essai au profit de la seule activation par carte ou par achat avant la mise en
ligne sur les stores.

## Hypothèses retenues

- Le QR d'aperçu Expo Go est généré par la plateforme et ne peut pas être modifié : il est
  contourné, pas corrigé.
- La bannière « Ouvrir dans Doctolib » vient d'un réglage du téléphone, pas de l'app. Elle peut
  être retirée dans Réglages → Applications → Doctolib → Ouvrir par défaut → Effacer, mais ce n'est
  plus nécessaire une fois le lien utilisé à la place de l'appareil photo.
- L'app ouverte dans le navigateur donne accès à tout le parcours. La caméra et le micro demandent
  une autorisation du navigateur et restent moins fiables qu'en application installée ; les
  notifications, elles, n'existeront qu'après génération des builds.
- La page d'accès reste privée : elle n'apparaît nulle part dans l'app des clientes.
- La page `nurprotocol.com/app` est livrée en fichier autonome, sans dépendance au serveur de
  l'app, pour être collée telle quelle sur le site ou sur Shopify. Les liens des stores y sont
  préparés et resteront inactifs jusqu'à la publication.
- Les textes des deux pages sont en français et en anglais ; les autres langues de l'app affichent
  l'anglais.
- L'icône et le nom utilisés pour l'écran d'accueil sont ceux déjà en place dans l'app.
- Le travail sur l'analyse spectaculaire et les courbes d'évolution reprend immédiatement après
  l'étape 1, sans rien perdre de ce qui a été décidé.
