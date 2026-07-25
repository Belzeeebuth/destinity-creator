# APEX OPUS TERMINAL

Terminal de trading de qualité professionnelle, en **un seul fichier HTML** (`index.html`).
Aucune dépendance, aucun asset externe (image, texture, police, modèle) : tout est dessiné
sur canvas ou en CSS. Ouvrir le fichier dans un navigateur suffit.

> **Toutes les données de marché sont simulées.** Les six instruments, les actualités et les
> exécutions sont fictifs. Ce logiciel n'est relié à aucun marché réel et ne constitue pas un
> outil d'investissement.

## Lancer

```
# ouvrir directement
xdg-open index.html      # ou : open index.html

# ou servir en local
npx http-server -p 8080 .
```

## Moteur de simulation

- **6 instruments fictifs** (NOVX, ZEPH, HLIX, QNTA, ARGO, VELR) avec volatilité annualisée,
  dérive, bêta, spread et volume moyen propres à chacun.
- **Marche aléatoire géométrique** avec dérive, pas de temps fixe à 12,5 Hz, plus un rappel
  faible vers un prix d'ancrage (processus type Ornstein–Uhlenbeck) pour que les niveaux
  restent plausibles sur une longue session.
- **Changements de régime** calme ⇄ volatil : le multiplicateur de volatilité (×0,5 à ×2,4)
  transite progressivement. Les phases volatiles durent 12 à 45 minutes, les phases calmes 45 à
  180, ce qui place la volatilité élevée sur environ 10 % du temps. L'historique et le moteur
  temps réel partagent la même fonction de tirage, pour qu'ils ne puissent pas diverger.
- **Microstructure** : sauts occasionnels, carnet à 11 niveaux par côté avec profondeur
  cumulée, impressions générées en continu et alimentant le volume des chandelles.
- **Horloge de marché** : 1 minute de marché ≈ 2,1 s réelles, séances de 390 min
  (09:30 → 16:00). L'application démarre 220 min après l'ouverture, avec ~4 séances
  d'historique 1 min pré-générées. Le passage à la séance suivante réinitialise les clôtures
  de référence.

## Fonctionnalités

| Panneau | Contenu |
|---|---|
| Graphique | Chandeliers dessinés à la main sur canvas, unités 1 M / 5 M / 15 M, barres de volume, MM9 / MM21 / MM50, réticule avec cotations sur les deux axes, zoom molette, défilement par glisser |
| Carnet d'ordres | Flux temps réel, 11 niveaux par côté (8 sur mobile), barres de profondeur traversant la ligne, cumul, spread en points de base, prix microstructurel, jauge de déséquilibre |
| Temps & ventes | Bande défilante colorée achat / vente, mise en évidence des blocs, marquage de vos propres exécutions (`◄`) |
| Liste de suivi | 6 instruments, prix, variation, sparklines intraday (60 clôtures 1 min + prix courant, colorées comme la variation du jour), clignotement vert/rouge sur tick, clic pour changer d'instrument |
| Statistiques | Ouverture, plus-haut/plus-bas séance, amplitude, clôture veille, VWAP et écart, volume, volume relatif, RSI(14), bêta, spread, régime |
| Trading | Achat/vente au marché, exécution par parcours du carnet (slippage réel si la taille dépasse le premier niveau), frais, impact marché |
| Positions | P&L latent par ligne, en $ et en %, notionnel, liquidation unitaire ou globale, gestion des positions longues, vendeuses et des retournements |
| Équité | Courbe d'équité mise à jour en continu, plus-haut et perte maximale (drawdown) |
| Alertes | Niveau sur n'importe quel instrument, tracé en pointillés sur le graphique, notification toast + bip au franchissement |
| Fil de presse | Titres fictifs défilants ; environ un quart d'entre eux déplacent réellement le cours de l'instrument concerné quelques secondes plus tard (décalage immédiat + diffusion, revalorisation durable de l'ancrage) |
| En-tête | P&L de session vert/rouge, réalisé net, équité, pouvoir d'achat, horloge de marché, indicateur de battement du flux et débit en messages/s |

## Raccourcis clavier

| Touche | Action |
|---|---|
| `B` | Achat au marché sur l'instrument actif |
| `S` | Vente au marché sur l'instrument actif |
| `F` | Liquider la position de l'instrument actif |
| `1` `2` `3` | Unité de temps 1 M / 5 M / 15 M |
| `M` | Afficher / masquer les moyennes mobiles |
| `V` | Afficher / masquer le volume |
| `↑` `↓` | Instrument précédent / suivant |
| `Échap` | Effacer les notifications |
| Clic droit sur le graphique | Poser une alerte au niveau du curseur |

## Mobile et tactile

La mise en page s'adapte à trois paliers :

- **> 1280 px** — grille dense sur trois colonnes, tous les panneaux visibles simultanément.
- **820–1280 px** — mêmes panneaux, colonnes latérales resserrées et corps de texte réduit ;
  la colonne de cumul du carnet est masquée.
- **≤ 820 px** — un panneau à la fois, sélectionné par une barre d'onglets
  (**GRAPH · SUIVI · CARNET · POS · ALERTES**). L'en-tête défile horizontalement en gardant
  l'indicateur de flux épinglé à droite, et la saisie d'ordre devient une barre permanente en
  bas de l'écran : l'achat et la vente restent accessibles depuis n'importe quel onglet, ce qui
  remplace les raccourcis `B` / `S` indisponibles au doigt.

Gestes sur le graphique :

| Geste | Action |
|---|---|
| Un doigt | Poser et déplacer le réticule (les cotations suivent sur les deux axes) |
| Deux doigts, écarter / pincer | Zoomer / dézoomer |
| Deux doigts, glisser | Se déplacer dans l'historique |
| Boutons `‹` `−` `+` `›` | Équivalents accessibles du zoom et du défilement |

Autres adaptations : cibles tactiles d'au moins 34 px (onglets) et 44 px (achat / vente), tableau
des positions recomposé pour tenir sans défilement horizontal dès 360 px de large, rendu du
graphique limité à ~30 im/s et rafraîchissement du DOM abaissé à 8 Hz pour ménager la batterie.
La préférence système `prefers-reduced-motion` est respectée : clignotements et animations sont
désactivés, et le fil de presse avance par titre au lieu de défiler en continu.

## Notes d'implémentation

- Chandelles stockées en une seule série 1 min par instrument ; les unités 5 M et 15 M sont
  agrégées à la demande (390 étant divisible par 5 et 15, l'alignement des bornes est exact).
- Boucle unique en `requestAnimationFrame` : simulation à pas fixe de 80 ms, rendu canvas à
  chaque image, rafraîchissement du DOM à ~11 Hz pour limiter le coût de mise en page.
- Bandeau de presse implémenté en marquee maison : les éléments sortis à gauche sont retirés
  du DOM et réalimentés à droite, sans duplication de contenu.
- Comptabilité vérifiée : `équité = capital initial + réalisé − frais + latent` à l'exact.
- Le son (bips d'exécution et d'alerte) est synthétisé via WebAudio, sans fichier audio.

## Palette

Thème sombre, une seule couleur d'accent (ambre `#f0a92e`). Le vert et le rouge sont réservés
à la sémantique de marché (hausse/baisse, achat/vente, P&L). Chiffres en chasse fixe avec
`font-variant-numeric: tabular-nums` pour l'alignement des colonnes.
