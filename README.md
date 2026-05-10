# Rejection Email Agent

I got a rejection email from a company I never interviewed with. The template placeholders hadn't been filled in.

```
"I thought that you {P}. However, for this role we're looking for someone
that can demonstrate {AI}. I would suggest {D}."
```

I found the underlying problem interesting enough to build something about it. This tool takes raw recruiter interview notes and uses Claude to extract the three phrases that slot into a structured rejection email — so the personalised fields actually get filled in before the email goes out.

## What it does

1. Select a candidate record
2. Paste raw interview notes
3. Claude extracts three structured fields:
   - **P** — a positive quality ("I thought that you...")
   - **AI** — an area for improvement ("someone that can demonstrate...")
   - **D** — a development tip ("I would suggest...")
4. Preview and copy the completed email

Notes can also be scanned from a photo of handwritten interview notes via the OCR endpoint.

## Stack

- Vanilla HTML / CSS / JS — no build step
- Netlify serverless functions (Node.js) — keep the API key server-side
- Claude Haiku 4.5 via the Anthropic API
- Deployed on Netlify

## Local development

```bash
npm install -g netlify-cli
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
ALLOWED_ORIGIN=http://localhost:8888
```

Then run:

```bash
netlify dev
```

The app is served at `http://localhost:8888`.

## Structure

```
app/
  rejection-email-agent.html
  rejection-email-agent.css
  rejection-email-agent.js
netlify/
  functions/
    parse.js   # extracts P, AI, D from notes
    ocr.js     # transcribes handwritten notes from an image
netlify.toml
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ALLOWED_ORIGIN` | Recommended | Your production URL — restricts API calls by origin |
