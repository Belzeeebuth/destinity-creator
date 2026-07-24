# destinity-creator

Colle un texte que tu as copie, et obtiens-en un resume raconte comme une
histoire, genere localement par [Ollama](https://ollama.com) (modele
`mistral` par defaut) — sans passer par une API payante.

## Prerequis

Installe [Ollama](https://ollama.com/download), puis recupere le modele :

```bash
ollama pull mistral
```

Assure-toi qu'Ollama tourne (`ollama serve`, ou l'app Ollama en arriere-plan).

## Installation

```bash
npm install
cp .env.example .env
```

`.env` contient (valeurs par defaut, a adapter si besoin) :

```
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
```

Pour utiliser un autre modele local (llama3.1, qwen2.5, ...), fais
`ollama pull <modele>` puis change `OLLAMA_MODEL` en consequence.

## Lancer l'app

```bash
npm start
```

Puis ouvre [http://localhost:3000](http://localhost:3000), colle ton texte
dans la zone prevue et clique sur "Transformer en histoire".
