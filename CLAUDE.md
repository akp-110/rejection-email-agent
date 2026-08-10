# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser app for recruiters to draft personalized rejection emails. The recruiter selects a candidate, pastes (or photographs) raw interview notes, and the app calls Claude — via Cloudflare Pages Functions — to extract three structured feedback fields, then renders them into an editable email template.

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
    ocr.js                    # Pages Function — route: /api/ocr, transcribes a photo of handwritten notes
.env                          # ANTHROPIC_API_KEY, ALLOWED_ORIGIN (local only)
```

No build step, no bundler, no test suite — `package.json` only declares `wrangler` as a dev dependency.

## Architecture

**Frontend** — vanilla HTML/CSS/JS, no framework. Three files linked by relative paths from `rejection-email-agent.html`.

**Data flow (parse):**
1. User selects a candidate from the hardcoded `candidates` array in `rejection-email-agent.js` (each has `id`, `name`, `role`, and demo `notes` that pre-fill the textarea — intended to be swapped for a real ATS call, e.g. Greenhouse)
2. User pastes or edits recruiter notes and clicks "Parse notes"
3. `runParse()` checks the `localStorage` daily rate limit, then POSTs `{ notes }` to `/api/parse`
4. Cloudflare Pages Functions routes `/api/parse` → `functions/api/parse.js` (Web API format: `onRequestPost`)
5. The function validates the request, calls `api.anthropic.com/v1/messages` with a fixed model, and returns `{ P, AI, D }` (each `null` if not extractable)
6. `renderEmail()` re-renders the email preview from the shared `parsed` state, substituting `{P}`, `{AI}`, `{D}`, `{name}`, `{role}` tokens into the active template

**Data flow (scan):** "Scan handwritten notes" opens the device camera/file picker, base64-encodes the image client-side, and POSTs `{ image, mediaType }` to `/api/ocr` (`functions/api/ocr.js`), which sends it to Claude as an image message and returns `{ text }` that's dropped into the notes textarea for the user to review before parsing.

**Key implementation details:**
- Both Functions call a fixed model (`claude-haiku-4-5-20251001`) — there is no model selector in the UI or model parameter in the request bodies
- Both Functions require header `X-Requested-By: rea` (403 if missing) and, when `ALLOWED_ORIGIN` is set, reject cross-origin requests
- `parse.js` caps notes at 3,000 characters; `ocr.js` caps images at ~5 MB decoded and restricts to JPEG/PNG/GIF/WebP
- `null` fields render as italic placeholder spans; filled fields render as colored `<span class="highlight">` elements
- Email templates are editable: a protected "Standard rejection" default plus user-created templates stored in `localStorage` (`rea_templates`), with the active template id in `rea_active_template`; the editor validates that `{P}`, `{AI}`, `{D}` tokens are present
- Rate limiting is daily-only, stored in `localStorage` under `rea_usage` as `{ dailyCount, dailyDate }`, capped at 20 parses/day (`DAILY_LIMIT` in `rejection-email-agent.js`)
- Dark mode via `@media (prefers-color-scheme: dark)` overriding CSS custom properties on `:root`
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in `app/_headers`

## Local Development

```bash
npm install -g wrangler
wrangler pages dev app   # serves app at localhost:8788, reads .env
```

Required `.env` values: `ANTHROPIC_API_KEY` (required), `ALLOWED_ORIGIN` (recommended, e.g. `http://localhost:8788`).

## Deploy

```bash
wrangler pages deploy app --project-name=rejection-email-agent
```

## Extending the Candidate List

Replace the `candidates` array in `app/rejection-email-agent.js` with a fetch from your ATS (e.g. Greenhouse). Each object needs: `{ id, name, role }` (`notes` is optional and only used to pre-fill the demo textarea).
