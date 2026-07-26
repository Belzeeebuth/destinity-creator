# Destinity / bench

Comparateur de modèles de langage : **qualité, coût par million de tokens, fenêtre de
contexte**. Classement triable, comparateur côte à côte, nuage qualité/prix avec frontière
de Pareto.

Site statique (Next.js). Aucune clé d'API, aucun appel réseau à l'exécution, aucune donnée
collectée.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de production
npm run lint
```

## Ce que le site affiche — et avec quel niveau de confiance

| Donnée | Statut | Où |
|---|---|---|
| Tarifs entrée/sortie, fenêtre de contexte, capacités, identifiants d'API | **Relevés auprès des fournisseurs**, datés modèle par modèle, sources citées sur chaque fiche | `src/data/models.ts` |
| Scores de benchmark | ⚠️ **Valeurs de démonstration** — aucune mesure derrière | `src/data/scores.ts` |

Tant que le drapeau `SCORES_ARE_ILLUSTRATIVE` vaut `true`, un bandeau le dit à chaque
visiteur sur chaque page. **Ne publiez pas le site en l'état sans remplacer les scores.**

Quand une valeur n'a pas pu être vérifiée, elle vaut `null` dans les données et s'affiche
« n/d ». Un blanc assumé vaut mieux qu'un chiffre inventé.

## Passer en données réelles

Tout se joue dans `src/data/scores.ts` :

1. remplacer la table `RAW_SCORES` (`modelSlug → benchmarkId → score sur 0–100`) ;
2. passer `provenance` à `'measured'` (mesure maison) ou `'published'` (chiffre du
   fournisseur, avec `source`) dans `buildScores` ;
3. basculer `SCORES_ARE_ILLUSTRATIVE` à `false` — le bandeau disparaît tout seul.

Aucun autre fichier n'a besoin de changer. Le type `Score` porte déjà `source` et
`measuredAt` pour rattacher chaque chiffre à sa provenance.

## Structure

```
src/
  data/
    types.ts        Modèle de données (les champs inconnus valent null, jamais 0)
    models.ts       Catalogue : tarifs, contexte, capacités, sources, date de relevé
    benchmarks.ts   Suites suivies, leur description et leur poids dans l'indice
    scores.ts       ⚠️ scores — le seul fichier à remplacer pour des données réelles
  lib/
    leaderboard.ts  Indice composite, coût mixte, frontière de Pareto
    format.ts       Formatage fr-FR ; « n/d » pour tout ce qui est inconnu
  components/       Graphiques SVG maison, tableau triable, filtres
  app/              /  ·  /compare  ·  /benchmarks  ·  /methodologie  ·  /modeles/[slug]
```

## Les calculs

**Indice de qualité** — moyenne pondérée des scores disponibles, renormalisée sur les seuls
benchmarks renseignés (un modèle évalué sur 4 suites n'est pas pénalisé mécaniquement, mais
sa couverture est affichée à côté). Poids définis dans `benchmarks.ts` : les suites
agentiques et de code pèsent le plus, les QCM de connaissances le moins.

**Coût mixte** — `(3 × prix_entrée + 1 × prix_sortie) / 4`, un ratio typique d'usage
conversationnel ou agentique. Les colonnes entrée et sortie restent affichées séparément
pour les charges qui penchent autrement. Ratio réglable via `BLENDED_MIX`.

**Frontière de Pareto** — un modèle y figure si aucun autre n'est à la fois au moins aussi
bon et au moins aussi bon marché. « Le meilleur modèle » n'existe pas sans budget donné.

**Modèles auto-hébergés** — pas de prix au token, donc exclus du nuage (leur nombre est
affiché sous le graphique, jamais retiré en silence) mais présents dans le tableau.

## Choix d'interface

- **Couleurs de séries validées** : les trois emplacements utilisés passent tous les seuils
  de séparation sous déficience de vision des couleurs, en thème clair comme en sombre
  (ΔE ≥ 9,2 sur toutes les paires). D'où la limite de trois modèles dans le comparateur.
- **Jamais de couleur seule** : chaque graphique a son jumeau tableau, et les étiquettes
  directes doublent l'encodage par la couleur.
- **Un seul axe de prix** par graphique — jamais deux échelles superposées.
- **Thème clair/sombre** suivant le système, avec bascule manuelle persistante.
- Clavier : les points du nuage et les barres sont focusables et montrent la même
  information qu'au survol.

## Limites connues

Ce que ces chiffres ne disent pas — contamination des benchmarks publics, reproductibilité,
biais du juge LLM, écart entre prix au token et coût réel, latence non suivie — est détaillé
sur la page `/methodologie` du site.
