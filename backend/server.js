const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function generatePRDescription(diff) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  const systemPrompt = `You are an assistant that writes useful pull request descriptions.
You will receive a Git diff.
- Understand what the code changes do before writing anything.
- Generate a clear and useful pull request description based ONLY on the changes shown in the diff.
- NEVER invent changes, features, or behavior that are not supported by the diff.
- If testing information cannot be determined from the diff, explicitly state that it could not be determined instead of guessing.
Return the description with these sections:
1. PR Title
2. Summary
3. Changes
4. Testing Notes
5. Potential Breaking Changes`;

  const userPrompt = `Here is the Git diff:\n\n${diff}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const description = data.choices?.[0]?.message?.content;

  if (!description) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return description;
}

app.post("/generate", async (req, res) => {
  const { diff } = req.body || {};

  if (!diff || typeof diff !== "string" || diff.trim() === "") {
    return res.status(400).json({
      error: "Validation failed: 'diff' is required and must be a non-empty string.",
    });
  }

  try {
    const prDescription = await generatePRDescription(diff);
    res.json({ prDescription });
  } catch (err) {
    console.error("Error generating PR description:", err.message);
    res.status(502).json({
      error: "Could not generate the PR description. Please try again later.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});