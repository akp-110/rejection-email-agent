# Rejection Email Agent

Job searching is tough. Standard rejection emails are the norm — and most of us have learned to accept them.

Recently I applied for a role and got one. The recruiter thanked me for my time interviewing, said they'd enjoyed hearing about my experiences, and wished me the best in my search. Pretty standard. Except in this instance, while I had applied for the role, I had not actually interviewed. We'd never spoken.

Had the recruiter made a mistake? Got me confused with another candidate? I wasn't sure. But what I found more interesting was a structured feedback template sitting in the body of the email — with the placeholders still in it:

```
I thought that you {P}. However, for this role we're looking for someone
that can demonstrate {AI}. I would suggest {D}.
```

Had the template not been filled in? Had an automation failed partway through? I couldn't tell. But the structure itself was thoughtful — specific, constructive, the kind of feedback that would actually help a candidate. It just hadn't been completed.

The role I'd applied for was an AI Automation position. So I built a tool to explore the problem: paste in raw interview notes, and Claude extracts the three phrases that slot into each position — a positive quality, an area for improvement, a development tip — phrased to fit the template grammatically. The recruiter reviews, copies, and sends. No unfilled placeholders.

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
- Cloudflare Pages Functions (Web API format) — keeps the API key server-side
- Claude Haiku 4.5 via the Anthropic API
- Deployed on Cloudflare Pages

## Local development

```bash
npm install -g wrangler
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_api_key_here
ALLOWED_ORIGIN=http://localhost:8788
```

Then run:

```bash
wrangler pages dev app
```

The app is served at `http://localhost:8788`.

## Deploy

```bash
wrangler pages deploy app --project-name=rejection-email-agent
```

## Structure

```
app/
  rejection-email-agent.html
  rejection-email-agent.css
  rejection-email-agent.js
  _redirects                   # / → rejection-email-agent.html
  _headers                     # security headers
functions/
  api/
    parse.js                   # extracts P, AI, D from notes
    ocr.js                     # transcribes handwritten notes from an image
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ALLOWED_ORIGIN` | Recommended | Your production URL — restricts API calls by origin |
