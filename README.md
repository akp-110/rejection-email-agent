# Rejection Email Agent

I applied for an AI Automation role and got a rejection email that thanked me warmly for my time interviewing. Except I'd never interviewed — I'd only submitted an application.

The feedback section looked like this:

```
I thought that you {P}. However, for this role we're looking for someone
that can demonstrate {AI}. I would suggest {D}.
```

The template was good — specific, constructive, designed to actually help. The recruiter just hadn't filled it in. That's the hard part: turning raw interview notes into the polished, grammatically precise phrases that slot into each position. So I built a tool that does it.

The small irony: I was applying for their AI Automation role.

---

## What it does

1. Select a candidate record
2. Paste raw interview notes (or scan a photo of handwritten notes)
3. Claude extracts three structured fields:
   - **P** — a positive quality ("I thought that you...")
   - **AI** — an area for improvement ("someone that can demonstrate...")
   - **D** — a development tip ("I would suggest...")
4. Preview the completed email, edit if needed, and copy

## Stack

- Vanilla HTML / CSS / JS — no build step
- Netlify serverless functions (Node.js) — keeps the API key server-side
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
