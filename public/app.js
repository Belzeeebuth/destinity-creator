const input = document.getElementById("input");
const submit = document.getElementById("submit");
const status = document.getElementById("status");
const result = document.getElementById("result");
const story = document.getElementById("story");

function setStatus(message, isError) {
  status.hidden = !message;
  status.textContent = message || "";
  status.classList.toggle("error", Boolean(isError));
}

submit.addEventListener("click", async () => {
  const text = input.value.trim();

  if (!text) {
    setStatus("Colle un texte avant de continuer.", true);
    return;
  }

  submit.disabled = true;
  result.hidden = true;
  setStatus("Generation de l'histoire...");

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur inconnue.");
    }

    story.textContent = data.story;
    result.hidden = false;
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    submit.disabled = false;
  }
});
