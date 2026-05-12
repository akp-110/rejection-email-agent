# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

A browser app for recruiters to draft personalized rejection emails. The recruiter selects a candidate, pastes raw interview notes, and the app calls Claude (via a Cloudflare Pages Function) to extract three structured fields — then renders them into a pre-written email template.

Deployed on Cloudflare Pages. Local dev via `wrangler pages dev app` (reads `.env` automatically).

## Structure

```
app/                          # static frontend (Cloudflare Pages publish dir)
  rejection-email-agent.html
  rejection-email-agent.css
  rejection-email-agent.js
  _redirects                  # / → rejection-email-agent.html
  _headers                    # security headers
functions/
  api/
    parse.js                  # Pages Function — route: /api/parse, extracts P/AI/D from notes
    ocr.js                    # Pages Function — route: /api/ocr, transcribes handwritten images
.env                          # ANTHROPIC_API_KEY (local only)
```

## Architecture

**Frontend** — vanilla HTML/CSS/JS, no build step. Three separated files linked by relative paths.

**Data flow:**
1. User selects a candidate from the hardcoded `candidates` array (intended to be swapped for a Greenhouse API call)
2. User pastes recruiter notes and clicks Parse
3. `runParse()` checks `localStorage` rate limits (3 free trial uses, 20/day), then POSTs `{ notes, model }` to `/api/parse`
4. Cloudflare Pages Functions routes `/api/parse` → `functions/api/parse.js` (Web API format: `onRequestPost`)
5. The function validates inputs, calls `api.anthropic.com/v1/messages`, and returns a JSON object: `{ P, AI, D }`
6. `renderEmail()` re-renders the email preview from the shared `parsed` state object

**Key implementation details:**
- Model selector: Haiku 4.5 / Sonnet 4.6 (default) — chosen by the user in the UI
- `ALLOWED_MODELS` set in the function prevents arbitrary model IDs being passed server-side
- Notes capped at 3,000 characters in the function (token abuse prevention)
- `null` fields render as italic placeholder spans; filled fields render as colored `<span class="highlight">` elements
- Dark mode via `@media (prefers-color-scheme: dark)` overriding CSS custom properties on `:root`
- Trial/rate limit state stored in `localStorage` under key `rea_usage`: `{ trialCount, dailyCount, dailyDate, email }`

## Local Development

```bash
npm install -g wrangler
wrangler pages dev app   # serves app at localhost:8788, reads .env
```

## Deploy

```bash
wrangler pages deploy app --project-name=rejection-email-agent
```

## Extending the Candidate List

Replace the `candidates` array in `app/rejection-email-agent.js` with a fetch from your ATS (e.g. Greenhouse). Each object needs: `{ id, name, role }`.
