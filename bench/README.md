# Harness d'évaluation

Lance des suites de tâches sur des modèles, note les réponses, conserve chaque appel, et
réécrit `src/data/scores.ts`. C'est ce qui permet au site d'afficher des chiffres
rattachables à un run précis plutôt qu'à une déclaration.

```bash
npm run bench -- list        # suites et modèles évaluables
npm run bench -- selftest    # vérifie les règles de notation et d'agrégation
npm run bench -- doctor      # clés, accès aux modèles, bac à sable
npm run bench -- run --models=claude-opus-5,claude-haiku-4-5 --budget=5
npm run bench -- report      # tableau de synthèse du dernier run
npm run bench -- export      # réécrit src/data/scores.ts
```

Essai complet sans clé, sans réseau et sans dépense :

```bash
npm run bench -- run --models=mock-strong,mock-mid,mock-weak,mock-refuser --budget=5
npm run bench -- report
```

## Ce qui protège des chiffres faux

| Garde-fou | Comportement |
|---|---|
| **Plafond de dépense** | Vérifié *avant* chaque appel, avec une estimation pessimiste. Le run s'arrête un appel trop tôt plutôt qu'un appel trop tard. `--budget` est obligatoire de fait (défaut 2 $). |
| **Identifiant d'API non vérifié** | Le run est refusé plutôt que de deviner une chaîne qui échouera au bout de trente requêtes. |
| **Tarif inconnu** | Refusé sans `--allow-unpriced` : sans prix, le plafond ne couvre pas le modèle. |
| **Modèles factices** | `export` refuse tout run qui en contient : ils n'ont aucune valeur de mesure. |
| **Bac à sable absent** | Les tâches de code sont marquées `skipped`, **jamais** exécutées sur l'hôte. |
| **Tâche ignorée ou en erreur** | Sort du dénominateur au lieu de compter comme un échec — personne n'est puni pour une panne d'infrastructure. Le nombre d'exclusions est rapporté. |
| **Refus du modèle** | Compté comme échec de la tâche *et* dénombré séparément : un refus n'est pas une erreur de raisonnement. |

## Suites

Cinq suites internes, 41 tâches. `id` correspond au benchmark du site.

| Suite | Tâches | Notation |
|---|---|---|
| `int-reasoning` | 10 | réponse exacte (nombre ou chaîne unique) |
| `int-instruction` | 10 | réponse exacte ou motif, sur la ligne `FINAL:` ou le texte entier |
| `int-extraction` | 8 | JSON comparé en profondeur, ordre des clés indifférent |
| `int-tooluse` | 7 | séquence d'appels d'outils, arguments comparés en sous-ensemble |
| `int-code-python` | 6 | tests exécutés dans un conteneur isolé |

Toutes sont à notation déterministe : aucun juge LLM dans le chemin par défaut, donc aucun
biais de juge. Un grader `llm-judge` existe (panel + médiane) pour les tâches subjectives,
mais aucune tâche livrée ne l'utilise.

**Convention de réponse.** Les tâches à notation exacte demandent au modèle de terminer par
`FINAL: <réponse>`. Le grader lit la dernière occurrence, ce qui laisse le modèle raisonner
à voix haute sans casser la notation.

## Bac à sable

Le code produit par un modèle tourne dans un conteneur jetable : `--network none`,
mémoire et processus bornés, `no-new-privileges`, minuterie dure, image `python:3.11-slim`.
Sans daemon Docker joignable, la suite `int-code-python` est ignorée — il n'existe aucun
repli vers l'hôte, volontairement.

## Fournisseurs

| Adaptateur | Variable d'environnement | Notes |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | SDK officiel. `temperature`/`top_p`/`budget_tokens` ne sont pas envoyés — ils sont refusés par les modèles courants. Les refus (`stop_reason: "refusal"`) arrivent en HTTP 200 et sont traités comme tels. |
| OpenAI | `OPENAI_API_KEY` | `chat/completions`. Bascule `max_completion_tokens` → `max_tokens` si le serveur se plaint du paramètre. |
| Mistral | `MISTRAL_API_KEY` | même contrat qu'OpenAI |
| Google | `GEMINI_API_KEY` ou `GOOGLE_API_KEY` | `generateContent` |
| Ollama | aucune | `OLLAMA_HOST`, défaut `http://127.0.0.1:11434`. Ni clé ni coût au token. |
| `mock-*` | aucune | double de test déterministe, sans réseau |

`doctor` valide chaque modèle par un appel qui ne consomme aucun token (API Models ou
équivalent) : on vérifie avant de dépenser.

> Les identifiants d'API OpenAI et Gemini ne sont pas renseignés dans `src/data/models.ts` —
> ils n'ont pas pu être vérifiés. Le harness refuse ces modèles tant que `apiId` vaut `null`.
> Renseignez-les depuis la documentation du fournisseur avant de les évaluer.

## Traces

Chaque run écrit `bench/runs/<runId>/` :

- `results.jsonl` — une ligne par appel : verdict, sortie brute, tokens, coût, latence,
  empreinte du prompt, horodatage ;
- `meta.json` — modèles, suites, plafond, dépense réelle, compteurs, raison d'arrêt.

Le dossier est ignoré par git (volumineux, spécifique à la machine). `export` inscrit le
`runId` et les compteurs dans l'en-tête de `src/data/scores.ts`, ce qui garde le lien entre
un score publié et sa trace.

## Reproductibilité

Un score n'a de sens qu'avec la version exacte du modèle et le prompt figé. Chaque résultat
porte `apiId`, `promptHash` et `startedAt` : un prompt modifié change l'empreinte, donc la
comparaison avec un run antérieur devient visiblement invalide au lieu de l'être en silence.

Les fournisseurs mettent à jour leurs modèles sous le même nom. Deux runs à un mois
d'écart ne sont pas nécessairement comparables, même avec un `apiId` identique.

## Options de `run`

| Option | Défaut | Rôle |
|---|---|---|
| `--models=a,b` | — | obligatoire |
| `--suites=a,b` | toutes | restreint les suites |
| `--repeats=N` | 1 | passes par tâche ; les passes sont moyennées avant les tâches |
| `--concurrency=N` | 4 | appels simultanés |
| `--budget=N` | 2 | plafond en dollars |
| `--max-tokens=N` | 4096 | plafond de sortie par appel |
| `--effort=low\|medium\|high` | — | transmis aux fournisseurs qui l'exposent |
| `--dry-run` | — | affiche le plan et le coût maximal, n'appelle rien |
| `--allow-unpriced` | — | autorise les modèles sans tarif connu |
