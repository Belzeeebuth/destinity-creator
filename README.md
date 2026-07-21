# Destiny Eleven — Écris ta légende du football

Un simulateur de carrière de footballeur, saison après saison, jouable entièrement dans le
navigateur. Recréation originale et indépendante inspirée du concept de jeux du même genre :
aucun contenu, texte ou asset propriétaire n'est repris — mécaniques, textes et illustrations
sont une implémentation maison.

## Concept

De 16 à **45 ans** (durée de carrière étendue), choisis ton point de départ puis vis chaque
saison à travers des décisions qui façonnent ton parcours :

- **Pays de départ** — 90 nations jouables, des plus grandes puissances du football aux plus
  petites micro-nations (Saint-Marin, Andorre, Liechtenstein...). Chaque pays a son propre
  profil de difficulté : concurrence pour percer, qualité des infrastructures, exposition aux
  recruteurs et facilité d'accès à la sélection nationale. Les micro-nations offrent une
  sélection nationale quasi garantie mais un plafond de progression bas ; les grandes nations
  offrent des infrastructures d'élite mais une concurrence féroce.
- **Poste** — 8 postes, chacun avec ses attributs clés.
- **Origine sociale** et **mode de vie adolescent** — influencent les attributs de départ, la
  discipline et la vitesse de progression.
- **Représentation (agent)** — influence la fréquence et la qualité des offres de club reçues.

Chaque saison : entraînement ciblé, évènements narratifs à choix (mentors, tentations,
tensions de vestiaire, pression médiatique, sélection nationale, retraite anticipée...),
simulation de la saison sportive, fenêtre des transferts, puis vieillissement (courbe de
progression/déclin réaliste, prolongée jusqu'à 45 ans avec des mécaniques de fin de carrière
dédiées : mentorat, reconversion, match hommage...).

## Modes de jeu

- **Carrière classique** — pays/poste/origine au choix.
- **Mode Histoire** — rejoue les conditions de départ exactes de carrières légendaires.
- **Défi quotidien** — un point de départ identique pour tout le monde chaque jour (seed
  déterministe basée sur la date).
- **Défi entre amis** — génère un code partageable en fin de carrière ; un ami peut le coller
  pour démarrer avec exactement les mêmes conditions et les mêmes tirages aléatoires.

## Progression méta (persistante localement)

- **Jetons** gagnés en fin de carrière, à dépenser en **Boutique** contre des avantages
  permanents (2 équipables max par carrière).
- **Badges** cumulés à vie sur toutes les carrières jouées sur l'appareil.
- **Panthéon** — classement local des meilleures légendes créées.

Toute la progression est stockée uniquement dans le `localStorage` du navigateur : aucun
compte, aucun serveur, aucune collecte de données.

## Stack technique

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand pour l'état de jeu
- Moteur de simulation déterministe (PRNG à seed) permettant sauvegarde/reprise et défis
  reproductibles

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production
npm run lint     # oxlint
```
