# Low-Level Design (LLD) — Diffly

## 1. Scope

This document describes the current implementation visible in the repository. File names, endpoint names, environment variables, and model configuration below correspond to the inspected source.

## 2. Frontend implementation

### 2.1 `frontend/index.html`

The page contains:

- `#diff-input`: textarea where the user pastes the Git diff.
- `#generate-btn`: starts generation.
- `#loading`: progress indicator, initially hidden.
- `#error-area`: error message container, initially hidden.
- `#output-card`: result panel, initially hidden.
- `#output`: `<pre>` element used to display generated text.
- `#copy-btn`: copies the result.

The page loads `style.css` and `script.js`.

### 2.2 `frontend/script.js`

**Backend URL**

`API_URL` is currently set to `https://diffly-plum.vercel.app/generate`.

**DOM references**

The script caches references to the input, buttons, loading indicator, error area, output card, and output element using `document.getElementById()`.

**Generate button flow**

1. A click event listener reads `diffInput.value`.
2. `diff.trim()` is checked. If empty, `showError()` displays a message and execution returns.
3. `clearError()` hides any old error.
4. The old output panel is hidden, the loading indicator is shown, and the Generate button is disabled.
5. `fetch(API_URL, ...)` sends an HTTP POST request with a JSON body containing `diff`.
6. The response body is parsed using `res.json()`.
7. If `res.ok` is false, the script throws an `Error` using the returned error string when available.
8. On success, `data.prDescription` is assigned to `output.textContent` and the output panel is shown.
9. The catch block handles network/request errors and displays an error.
10. The `finally` block always hides the loading indicator and re-enables the Generate button.

**Copy button flow**

The click listener reads `output.textContent`. If non-empty, it calls `navigator.clipboard.writeText()`. The button temporarily changes to `Copied!` or `Copy failed`, then resets after two seconds.

**Helper functions**

- `showError(msg)`: assigns the message through `textContent` and reveals the error area.
- `clearError()`: clears the error text and hides the error area.

## 3. Backend implementation

### 3.1 Express setup in `backend/server.js`

```js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
```

- `express()` creates the application instance.
- `cors()` installs cross-origin middleware using its current default configuration.
- `express.json()` parses incoming JSON bodies and makes parsed data available on `req.body`.
- `dotenv.config()` loads variables from a local `.env` file when present.

### 3.2 `GET /health`

```js
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
```

This endpoint returns a basic JSON health response. It does not verify the OpenRouter key or make a provider request.

### 3.3 `generatePRDescription(diff)`

This asynchronous helper performs the LLM call.

**Step 1 — Read secret**

It reads `process.env.OPENROUTER_API_KEY`. If the value is missing, it throws an error. The secret is not read from frontend JavaScript.

**Step 2 — Construct prompts**

The system message instructs the model to:

- Understand the code changes before drafting.
- Base the PR description only on the supplied diff.
- Avoid inventing features or behaviour.
- Say when testing details cannot be determined.
- Return sections for PR Title, Summary, Changes, Testing Notes, and Potential Breaking Changes.

The user message includes the supplied diff.

**Step 3 — Call OpenRouter**

The helper calls:

`https://openrouter.ai/api/v1/chat/completions`

using `fetch()` with:

- HTTP method: `POST`
- `Content-Type: application/json`
- `Authorization: Bearer <OPENROUTER_API_KEY>`
- JSON body containing model `openai/gpt-4o-mini` and the system/user messages.

**Step 4 — Check provider response**

If `response.ok` is false, the helper reads the provider error body and throws an error containing the provider HTTP status and response body.

**Step 5 — Parse generated content**

The helper parses the response JSON and attempts to read `data.choices?.[0]?.message?.content`. If no content exists, it throws an error. Otherwise it returns the generated description string.

### 3.4 `POST /generate`

The route reads `diff` from `req.body || {}`.

Validation rejects the request when:

- `diff` is missing/falsy;
- `diff` is not a string; or
- `diff.trim()` is empty.

Invalid input returns HTTP 400 and a JSON error message.

For valid input, the route awaits `generatePRDescription(diff)` and returns:

```json
{ "prDescription": "..." }
```

If generation throws, the route logs the error message on the server and returns HTTP 502 with a generic JSON error. This avoids returning raw provider details to the browser.

### 3.5 Server startup

The port is read from `process.env.PORT`, defaulting to `3000`. The server starts with `app.listen(PORT, ...)`.

## 4. Environment configuration

`backend/.env.example` documents:

```env
OPENROUTER_API_KEY=your-openrouter-key-here
PORT=3000
```

The real `.env` file should not be committed. The repository `.gitignore` excludes `.env` and `node_modules/`. For deployment, configure the variables in the hosting provider's environment settings.

## 5. Request and response examples

### Valid request

```http
POST /generate
Content-Type: application/json

{
  "diff": "diff --git a/example.js b/example.js ..."
}
```

### Successful response

```json
{
  "prDescription": "PR Title: ...\n\nSummary: ..."
}
```

### Invalid request

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
```

```json
{
  "error": "Validation failed: 'diff' is required and must be a non-empty string."
}
```

### Generation failure

```http
HTTP/1.1 502 Bad Gateway
Content-Type: application/json
```

```json
{
  "error": "Could not generate the PR description. Please try again later."
}
```

## 6. Error-handling behaviour

| Location | Failure | Current behaviour |
|---|---|---|
| Frontend | Whitespace-only diff | Displays validation error; request is not sent |
| Backend route | Missing/non-string/blank diff | Returns 400 |
| LLM helper | Missing API key | Throws an error |
| LLM helper | Provider returns non-2xx | Reads provider body and throws |
| LLM helper | Provider content missing | Throws an error |
| Backend route | Any generation exception | Logs server-side detail and returns 502 |
| Frontend | Fetch/network failure | Displays connection/request error |
| Frontend | Clipboard API failure | Changes button label to `Copy failed` temporarily |

## 7. Current implementation gaps (do not claim these as implemented)

- No application-level maximum diff length or dedicated request-size validation is visible.
- No rate limiter is installed.
- No dedicated prompt-injection detection or isolation is implemented.
- The model result is not parsed or validated against a JSON schema.
- Token counts and actual costs are not collected or stored by the application.
- No streaming response handling is implemented.
- No tool/function calling or multi-step agent loop is implemented.
- No unit or API integration test files are present in the inspected repository tree.
- No database, cache, user account, or authentication layer is present.

## 8. Suggested implementation improvements

Treat these as planned work until implemented and tested:

1. Add a maximum request-body size and a clear maximum diff character/byte limit.
2. Add rate limiting to `/generate`.
3. Restrict CORS to the deployed frontend origin(s), rather than leaving the default broad configuration.
4. Add a provider timeout and deliberate handling for provider rate limits and transient failures.
5. Validate provider response shape and return consistent error codes.
6. Add a test suite for valid, missing, empty, wrong-type, and oversized input, plus mocked provider failures.
7. Create a fixed LLM evaluation set of representative diffs and score factuality, section completeness, and unsupported claims.
8. If structured output is added, request JSON and validate it before returning it to the frontend.
9. Capture provider-reported usage metadata when available and calculate cost using the actual model's current pricing.
10. Treat the diff as untrusted data in prompt construction and evaluate adversarial examples; prompt wording alone cannot guarantee prompt-injection resistance.

## 9. Viva evidence checklist

Before the viva, be ready to open and explain:

- `frontend/index.html`: the input, buttons, loading, error, and output elements.
- `frontend/script.js`: click handlers, browser validation, `fetch()`, `async`/`await`, `try`/`catch`/`finally`, DOM updates, and Clipboard API.
- `frontend/style.css`: responsive media query and loading/error/result styles.
- `backend/server.js`: Express setup, middleware, `/health`, `/generate`, `generatePRDescription()`, environment variable access, provider request, and error handling.
- `backend/.env.example`: configuration contract without the real secret.
- `README.md`: project goal, model/provider, architecture summary, and deployment links.
