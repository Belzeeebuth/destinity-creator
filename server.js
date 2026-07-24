require("dotenv").config();

const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

app.post("/api/summarize", async (req, res) => {
  const text = (req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Aucun texte fourni." });
  }

  if (!anthropic) {
    return res.status(500).json({
      error:
        "Cle API manquante. Definis ANTHROPIC_API_KEY dans un fichier .env (voir .env.example).",
    });
  }

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system:
        "Tu es un narrateur. On te donne un texte brut (article, notes, conversation, extrait quelconque). " +
        "Transforme-le en un recit court et coherent, en francais, qui raconte les informations essentielles " +
        "comme une histoire agreable a lire, avec un debut, un milieu et une fin. Ne mentionne pas que c'est un resume, " +
        "raconte simplement l'histoire.",
      messages: [{ role: "user", content: text }],
    });

    const story = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ story });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Echec de la generation de l'histoire." });
  }
});

app.listen(port, () => {
  console.log(`Serveur lance sur http://localhost:${port}`);
});
