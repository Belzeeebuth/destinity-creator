# destinity-creator

Colle un texte que tu as copie, et obtiens-en un resume raconte comme une
histoire, genere par Claude.

## Installation

```bash
npm install
cp .env.example .env
```

Renseigne ta cle dans `.env` :

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Lancer l'app

```bash
npm start
```

Puis ouvre [http://localhost:3000](http://localhost:3000), colle ton texte
dans la zone prevue et clique sur "Transformer en histoire".
