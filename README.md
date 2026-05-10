# Rejection Email Agent

I applied for an AI Automation role at a fintech company. A few days later I got a rejection email that thanked me warmly for my time interviewing — except I'd never interviewed. I'd only submitted an application. We'd never spoken.

The email read as though the recruiter had sat across from me, heard my answers, weighed them up, and written considered feedback. But when I got to the feedback section, it looked like this:

```
I thought that you {P}. However, for this role we're looking for someone
that can demonstrate {AI}. I would suggest {D}.
```

The template placeholders hadn't been filled in. The recruiter had the right structure — specific, constructive, designed to actually help the candidate — but hadn't had the time or tool to complete it before hitting send.

I wasn't annoyed. I was curious. The template itself was good. The problem was turning raw interview notes into the polished, grammatically specific phrases that slot into each position. That's the part that takes time and mental effort, and the part most likely to get skipped.

So I built a tool that does it. Paste in raw notes, and Claude extracts the three phrases — a positive quality, an area for improvement, a development tip — phrased to slot directly into the template. The recruiter reviews, copies, and sends.

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
