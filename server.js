require("dotenv").config();

const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
const model = process.env.OLLAMA_MODEL || "mistral";

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

app.post("/api/summarize", async (req, res) => {
  const text = (req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "Aucun texte fourni." });
  }

  try {
    const response = await fetch(`${ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Tu es un narrateur. On te donne un texte brut (article, notes, conversation, extrait quelconque). " +
              "Transforme-le en un recit court et coherent, en francais, qui raconte les informations essentielles " +
              "comme une histoire agreable a lire, avec un debut, un milieu et une fin. Ne mentionne pas que c'est un resume, " +
              "raconte simplement l'histoire.",
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama a repondu ${response.status}`);
    }

    const data = await response.json();
    res.json({ story: data.message?.content?.trim() || "" });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error:
        `Impossible de contacter Ollama sur ${ollamaHost}. ` +
        `Verifie qu'Ollama tourne (\`ollama serve\`) et que le modele "${model}" est installe (\`ollama pull ${model}\`).`,
    });
  }
});

app.listen(port, () => {
  console.log(`Serveur lance sur http://localhost:${port}`);
});
