# Carte gold Nūr — fichiers QR prêts pour l'impression

## Contenu du QR (définitif, ne changera jamais)

```
https://nurprotocol.com/app
```

Un seul visuel, identique sur toutes les cartes. L'usine n'imprime qu'un seul design, pour toujours.
Tout ce qui évolue (application, liens des stores, prestataire technique) se modifie sur la page web
`nurprotocol.com/app`, jamais sur les cartes déjà imprimées.

## Fichiers

| Fichier | Usage |
|---|---|
| `nur-qr-carte-gold-2048.png` | Impression, maquette Canva, bon à tirer |
| `nur-qr-carte-gold.svg` | Vectoriel — agrandissement sans perte (Illustrator, Canva Pro) |

Régénérables à tout moment :
- PNG : `GET /api/qr?size=2048`
- SVG : `GET /api/qr.svg`
- Autre contenu (jamais nécessaire en principe) : `?data=https://...`

## Spécifications d'impression

- **Taille minimale imprimée : 2,5 cm de côté** (3 cm recommandé sur la carte gold)
- **Ne pas recadrer** : la marge claire autour du motif fait partie du fichier (zone de silence)
- **Noir franc** sur fond clair, ivoire ou **doré mat**
- Éviter le doré miroir, les vernis brillants et les dégradés directement sous le motif
- Aucun logo, texte ou filigrane par-dessus le motif
- Correction d'erreur de niveau H : le code reste lisible même partiellement abîmé
- Version du symbole : 4 (37 × 37 modules)

## Vérifications effectuées

- Décodage confirmé à 2048 px, 600 px, 300 px et 180 px → `https://nurprotocol.com/app`

## Avant la première livraison client

La page `https://nurprotocol.com/app` doit être en ligne.
Contenu prêt à coller : `page-nurprotocol-app.html` (ce dossier).
