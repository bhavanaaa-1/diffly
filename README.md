# Diffly

Turn your code changes into clear, review-ready pull requests.

## The Problem

When I work on coding assignments and projects, I often make several changes across files and end up with a Git diff that shows exactly what changed but does not explain those changes clearly. Writing a useful pull request description from scratch takes extra time, especially when I already know what I changed but need to organize it into a proper summary, testing notes, and possible breaking changes. I built Diffly to solve this specific problem: paste a Git diff and get a structured, review-ready pull request description without manually writing it from scratch.

## What It Does

Diffly takes a Git diff as input and sends it to an AI model through a backend API. The AI analyzes the changes and generates a structured pull request description containing a PR title, summary, list of changes, testing notes, and potential breaking changes. The generated result is displayed in the frontend and can be copied with one click.

## AI Integration

**API:** OpenRouter

**Model:** `openai/gpt-4o-mini`

**Location:** `backend/server.js` → `generatePRDescription()` function

**What the AI does:** The AI analyzes the provided Git diff and transforms it into a clear, structured pull request description based only on the changes shown in the diff.

The OpenRouter API key is stored in an environment variable using `process.env.OPENROUTER_API_KEY`. The AI API call exists only in the backend. The frontend communicates only with the Diffly backend and never directly calls OpenRouter.

## What I Intentionally Excluded

- **User accounts and authentication** — Diffly is designed as a simple session-based tool, and authentication is not required for its core functionality.
- **GitHub OAuth and automatic repository access** — Users can paste a diff directly, so connecting to GitHub would add unnecessary complexity to the core workflow.
- **Database and saved PR history** — The main goal is generating a PR description from the current diff. Persistent storage is not necessary for this version.
- **Advanced editing and team collaboration features** — These are outside the scope of the core problem and would add complexity without improving the basic workflow.

## Monthly Cost Calculation

**Model:** `openai/gpt-4o-mini`

**Input token rate:** $0.15 per 1M tokens

**Output token rate:** $0.60 per 1M tokens

**Average tokens per call:** ~600 input + ~400 output

**Cost per call:**

```text
(600 / 1,000,000 × $0.15) + (400 / 1,000,000 × $0.60)

= $0.000090 + $0.000240

= $0.000330
Expected monthly calls: 300

Monthly total:

300 × $0.000330 = $0.099

Estimated AI cost: ~$0.10/month

Live Deployment

Frontend: https://diffly-frontend.vercel.app

Backend: https://diffly-plum.vercel.app

Backend Health Check

https://diffly-plum.vercel.app/health

The backend returns:

{
  "status": "ok"
}
Tech Stack
HTML
CSS
JavaScript
Node.js
Express
OpenRouter
openai/gpt-4o-mini
Vercel
How It Works
User pastes Git diff
        ↓
Diffly Frontend
        ↓
Express Backend
        ↓
OpenRouter API
        ↓
GPT-4o-mini
        ↓
Generated PR Description
        ↓
Diffly Frontend

The AI integration section is deliberately specific because the assignment explicitly asks for the **API, exact model, file, and function**. :contentReference[oaicite:1]{index=1}

And the cost arithmetic follows the assignment's required calculation format. :contentReference[oaicite:2]{index=2}

