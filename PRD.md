# Product Requirements Document (PRD) — Diffly

## 1. Product overview

**Product name:** Diffly  
**Product type:** AI-assisted developer productivity web application  
**Status:** Current deployed MVP  

Diffly converts a user-supplied Git diff into a structured pull request (PR) description. The user pastes a diff into the web interface, requests generation, reviews the result, and can copy the generated description.

## 2. Problem statement

A Git diff shows code changes but does not explain their intent in reviewer-friendly language. Developers may spend extra time writing a PR title, summary, change list, testing notes, and potential breaking-change notes. Diffly aims to reduce that writing effort by generating a first draft from the supplied diff.

## 3. Goals

- Accept a non-empty Git diff from the user.
- Send the diff to a backend endpoint without exposing the LLM API key in browser code.
- Use an LLM to generate a PR description based on the supplied changes.
- Display the generated content clearly.
- Allow the user to copy the generated description.
- Provide basic loading, validation, and error feedback.

## 4. Non-goals and current exclusions

The current MVP does not provide:

- User accounts, authentication, or role-based access.
- GitHub OAuth or automatic repository/diff retrieval.
- Persistent storage, saved PR history, or a database.
- Team collaboration or approval workflows.
- Automatic creation or publishing of a GitHub pull request.
- Retrieval-augmented generation (RAG), embeddings, or a vector database.
- Multi-step autonomous agents or model tool/function calling.

These are deliberate scope exclusions in the current version, not implemented features.

## 5. Target users

Developers and students who already have a Git diff and want help turning it into a readable PR description. The user is expected to review the generated text before using it.

## 6. User journey

1. The user opens the Diffly frontend.
2. The user pastes a Git diff into the text area.
3. The user selects **Generate PR**.
4. The frontend checks that the input is not blank.
5. The frontend sends a JSON `POST` request to the backend `/generate` endpoint.
6. The backend validates the request body and calls the configured LLM through OpenRouter.
7. The backend returns the generated description as JSON.
8. The frontend displays the description.
9. The user can copy the result using the Copy button.

## 7. Functional requirements

| ID | Requirement | Current implementation |
|---|---|---|
| FR-01 | Accept Git diff text | Text area in `frontend/index.html` |
| FR-02 | Reject blank input in the browser | Trim check in `frontend/script.js` |
| FR-03 | Send diff to backend as JSON | `fetch()` with `POST` and `Content-Type: application/json` |
| FR-04 | Reject missing, non-string, or blank `diff` on server | Validation in `POST /generate` |
| FR-05 | Generate PR description using an LLM | `generatePRDescription()` in `backend/server.js` |
| FR-06 | Return generated text to frontend | JSON response containing `prDescription` |
| FR-07 | Show progress while generating | Loading indicator and disabled Generate button |
| FR-08 | Show errors to the user | Error area and `showError()` |
| FR-09 | Copy generated text | Clipboard API in `frontend/script.js` |
| FR-10 | Provide backend health endpoint | `GET /health` returns `{ "status": "ok" }` |

## 8. Quality and operational requirements

- The OpenRouter API key must remain on the server and be read from an environment variable.
- The browser must communicate with the Diffly backend, not call OpenRouter directly.
- The interface should remain usable on small screens; responsive CSS is present.
- The generated content should be grounded in the supplied diff. The prompt instructs the model not to invent changes and to state when testing details cannot be determined.
- Users should treat generated content as a draft and verify it before using it.

## 9. Current limitations and known risks

- The backend currently has no explicit maximum diff length or request-body size policy beyond Express defaults.
- There is no rate limiter in the inspected implementation.
- The application does not persist generations or maintain user-level usage limits.
- Runtime token usage and cost are not recorded. Cost figures in the README are estimates, not live measurements.
- The prompt contains grounding instructions, but the current implementation does not provide a dedicated prompt-injection defence or guarantee that untrusted diff content cannot influence the model.
- There is no automated unit or integration test suite visible in the repository.
- The model response is returned as text; it is not parsed against a formal structured-output schema.

## 10. Success criteria for the current MVP

A user can submit a non-empty diff, receive a generated description when the backend and provider are available, see useful progress or error feedback, and copy the result. The generated description should contain the requested PR sections and should not claim that unknown testing was performed.

## 11. Future improvements

Potential future work includes request-size limits, rate limiting, stricter response validation, automated API tests, a curated LLM evaluation set, structured JSON output, token/cost telemetry, and stronger prompt-injection controls. These should only be described as implemented after the corresponding code is added and tested.
