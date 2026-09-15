const API_URL = "https://diffly-plum.vercel.app/generate";
const diffInput = document.getElementById("diff-input");
const generateBtn = document.getElementById("generate-btn");
const loading = document.getElementById("loading");
const errorArea = document.getElementById("error-area");
const outputCard = document.getElementById("output-card");
const output = document.getElementById("output");
const copyBtn = document.getElementById("copy-btn");

generateBtn.addEventListener("click", async () => {
  const diff = diffInput.value;

  if (!diff.trim()) {
    showError("Please paste a Git diff before generating.");
    return;
  }

  clearError();
  outputCard.hidden = true;
  loading.hidden = false;
  generateBtn.disabled = true;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diff }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Server returned an error.");
    }

    output.textContent = data.prDescription;
    outputCard.hidden = false;
  } catch (err) {
    if (err.name === "TypeError" && err.message === "Failed to fetch") {
      showError("Could not reach the backend. Make sure the server is running.");
    } else {
      showError(err.message);
    }
  } finally {
    loading.hidden = true;
    generateBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  const text = output.textContent;

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => (copyBtn.textContent = "Copy"), 2000);
  }
});

function showError(msg) {
  errorArea.textContent = msg;
  errorArea.hidden = false;
}

function clearError() {
  errorArea.textContent = "";
  errorArea.hidden = true;
}