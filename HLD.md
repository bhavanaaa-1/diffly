# High-Level Design (HLD) — Diffly

## 1. Purpose

This document describes the current high-level architecture of Diffly, an AI-assisted application that converts a user-provided Git diff into a pull request description.

## 2. Architecture overview

Diffly uses a simple client-server architecture with an external LLM provider. The current version is stateless and does not use a database.

```text
+------------------------------+
| User / Browser               |
| Paste diff; click Generate   |
+---------------+--------------+
                |
                v
+------------------------------+
| Frontend                     |
| HTML + CSS + browser JS      |
| Validate blank input         |
| Show loading / error / result|
| Copy generated text          |
+---------------+--------------+
                |
        HTTPS JSON request
        POST /generate
                |
                v
+------------------------------+
| Diffly Backend               |
| Node.js + Express            |
| CORS and JSON middleware     |
| Validate request body        |
| Read server-side API key     |
| Handle provider errors       |
+---------------+--------------+
                |
        HTTPS chat completion request
                |
                v
+------------------------------+
| OpenRouter API               |
| Model: openai/gpt-4o-mini    |
+---------------+--------------+
                |
          Model response
                |
                v
+------------------------------+
| Backend returns JSON         |
| { prDescription: string }    |
+---------------+--------------+
                |
                v
+------------------------------+
| Frontend renders result      |
+------------------------------+
```

## 3. Main components

### 3.1 Frontend

- `frontend/index.html` defines the page structure: Git diff text area, Generate button, loading indicator, error area, generated-output section, and Copy button.
- `frontend/style.css` styles the page and includes responsive rules for narrow screens and a reduced-motion preference.
- `frontend/script.js` reads the text area, performs a blank-input check, calls the backend using `fetch()`, updates the UI, and copies output through the Clipboard API.

### 3.2 Backend

- `backend/server.js` creates the Express application.
- `cors()` enables cross-origin requests according to the current default configuration.
- `express.json()` parses JSON request bodies.
- `GET /health` provides a basic health response.
- `POST /generate` validates the incoming `diff`, calls `generatePRDescription()`, and returns the result or an error response.
- `generatePRDescription()` reads `OPENROUTER_API_KEY`, constructs system/user messages, calls the OpenRouter chat-completions endpoint, parses the response, and returns the message content.

### 3.3 External service

OpenRouter is the external model gateway. The current code requests model `openai/gpt-4o-mini` through `https://openrouter.ai/api/v1/chat/completions`.

### 3.4 Configuration

`backend/.env.example` documents `OPENROUTER_API_KEY` and `PORT`. The actual key must be configured as a deployment/runtime environment variable and must not be committed. `.gitignore` excludes `.env` and `node_modules/`.

## 4. Deployment topology

The repository README identifies these deployments:

- Frontend: `https://diffly-frontend.vercel.app`
- Backend: `https://diffly-plum.vercel.app`

The README also identifies `https://diffly-plum.vercel.app/health` as the backend health-check URL. The exact Vercel project settings, build configuration, and runtime environment-variable values are managed outside the source files inspected for this document; verify them in the Vercel dashboard before the viva.

## 5. Data flow

### Generation request

1. Browser code reads `diffInput.value`.
2. Browser rejects whitespace-only input.
3. Browser sends `{ "diff": "..." }` to the configured backend URL.
4. Express JSON middleware parses the request body.
5. `/generate` checks that `diff` exists, is a string, and is not blank.
6. `generatePRDescription(diff)` reads the API key from the environment.
7. The backend sends system and user messages to OpenRouter.
8. The backend checks the provider HTTP status, parses JSON, and extracts `choices[0].message.content`.
9. The backend returns `{ "prDescription": "..." }`.
10. The browser renders the returned text using `textContent` and reveals the output panel.

### Failure flow

- Blank frontend input: an inline error is shown and no backend request is sent.
- Invalid backend input: the backend returns HTTP 400 with a validation message.
- Missing API key, provider failure, or empty provider content: the backend catch block returns HTTP 502 with a generic user-facing message; the detailed error message is logged on the server.
- Browser/network failure: the frontend displays an appropriate connection or request error.
- Clipboard failure: the Copy button temporarily displays `Copy failed`.

## 6. API contract

### `GET /health`

Successful response:

```json
{ "status": "ok" }
```

### `POST /generate`

Request:

```json
{ "diff": "<git diff text>" }
```

Successful response:

```json
{ "prDescription": "<generated PR description>" }
```

Invalid request response (HTTP 400):

```json
{ "error": "Validation failed: 'diff' is required and must be a non-empty string." }
```

Generation/provider failure response (HTTP 502):

```json
{ "error": "Could not generate the PR description. Please try again later." }
```

## 7. Security and trust boundaries

- The browser is an untrusted client; server-side validation is therefore required even though the frontend also checks for blank input.
- The OpenRouter key is a server-side secret and must never be embedded in frontend files.
- The submitted diff is user-controlled content and must be treated as untrusted input to the model.
- The current prompt asks the model to use only evidence in the diff, but this is not a complete prompt-injection defence.
- The current source has no authentication, rate limiting, or explicit application-level request-size limit.
- The frontend renders model output through `textContent`, which treats it as text rather than interpreting it as HTML.

## 8. Architectural decisions and trade-offs

| Decision | Reason / trade-off |
|---|---|
| No database | The current workflow does not require saved history; the service remains stateless. |
| No user authentication | The MVP is a simple paste-and-generate utility. This also means there is no per-user quota or account boundary. |
| LLM provider called from backend | Keeps the API key out of browser code and centralises provider handling. |
| Plain-text generated result | Simple to display and copy; less machine-verifiable than schema-validated JSON. |
| One model request per generation | Keeps latency and implementation complexity low; does not provide an autonomous agent workflow. |

## 9. Current scalability and reliability limitations

The application has no visible request throttling, explicit maximum input size, retries, timeout policy, persistent job queue, caching layer, or automated test suite. Large diffs and provider outages can therefore affect latency and reliability. These are improvement opportunities, not current capabilities.

## 10. Future architecture options

Possible future additions include rate limiting, input size limits, provider timeouts, retry policy with backoff, structured response validation, usage telemetry, and automated tests. A database or agent loop should only be introduced if product requirements justify them.
