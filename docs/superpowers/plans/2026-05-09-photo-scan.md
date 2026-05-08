# Photo Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Scan photo" button to the recruiter notes section that OCRs a photo of handwritten notes via Claude vision and populates the textarea for review before parsing.

**Architecture:** A new Netlify serverless function `ocr.js` accepts a base64 image, calls Claude Haiku 4.5 vision, and returns plain transcribed text. The frontend reads the selected file via `FileReader`, POSTs to `/api/ocr`, and drops the result into `#notesInput`. The existing parse flow is unchanged.

**Tech Stack:** Vanilla JS (no build), Netlify Functions (Node 18), Anthropic API (claude-haiku-4-5-20251001 vision), Tabler Icons (already loaded via CDN).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `netlify/functions/ocr.js` | Validate image input, call Claude vision, return `{ text }` |
| Modify | `netlify.toml` | Add `/api/ocr` → `/.netlify/functions/ocr` redirect |
| Modify | `app/rejection-email-agent.html` | Add hidden file input + Scan photo button |
| Modify | `app/rejection-email-agent.js` | Add `runScan()` + file input change handler |

---

## Task 1: Add `/api/ocr` redirect to `netlify.toml`

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Add the redirect**

Open `netlify.toml`. Append this block at the end of the file (after the existing `/api/parse` redirect):

```toml
[[redirects]]
  from = "/api/ocr"
  to   = "/.netlify/functions/ocr"
  status = 200
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "feat: add /api/ocr redirect"
```

---

## Task 2: Create `netlify/functions/ocr.js`

**Files:**
- Create: `netlify/functions/ocr.js`

- [ ] **Step 1: Create the file**

Create `netlify/functions/ocr.js` with this exact content:

```javascript
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BASE64_LENGTH = 6_900_000; // ~5 MB decoded

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let image, mediaType;
  try {
    ({ image, mediaType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!image || typeof image !== "string" || image.trim().length === 0)
    return { statusCode: 400, body: JSON.stringify({ error: "Image is required" }) };
  if (!ALLOWED_MEDIA_TYPES.has(mediaType))
    return { statusCode: 400, body: JSON.stringify({ error: "Unsupported image type" }) };
  if (image.length > MAX_BASE64_LENGTH)
    return { statusCode: 400, body: JSON.stringify({ error: "Image exceeds 5 MB limit" }) };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: image }
          },
          {
            type: "text",
            text: "Transcribe all handwritten or printed text in this image exactly as written. Output plain text only, preserving line breaks. Do not add commentary, labels, or formatting."
          }
        ]
      }]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: data.error?.message || "API error" })
    };
  }

  const text = data.content?.find(b => b.type === "text")?.text || "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  };
};
```

- [ ] **Step 2: Smoke-test the validation logic (no server needed)**

Run `netlify dev` in a separate terminal, then in another terminal:

```bash
# Should return 400 — missing image
curl -s -X POST http://localhost:8888/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"image":"","mediaType":"image/jpeg"}' | cat
# Expected: {"error":"Image is required"}

# Should return 400 — bad media type
curl -s -X POST http://localhost:8888/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"image":"abc","mediaType":"image/bmp"}' | cat
# Expected: {"error":"Unsupported image type"}
```

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/ocr.js
git commit -m "feat: add OCR serverless function"
```

---

## Task 3: Add `runScan()` to `rejection-email-agent.js`

**Files:**
- Modify: `app/rejection-email-agent.js`

- [ ] **Step 1: Append the scan section to the end of the file**

Find the line `buildCandidateGrid();` at the bottom of `app/rejection-email-agent.js` (currently the last lines). Insert the following block **above** those two final calls:

```javascript
// ─── Scan ────────────────────────────────────────
function runScan() {
  document.getElementById("photoInput").click();
}

document.getElementById("photoInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const btn = document.getElementById("scanBtn");
  btn.disabled = true;
  setStatus("blue", "Scanning photo…");

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mediaType: file.type })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "OCR error");

    document.getElementById("notesInput").value = result.text;
    setStatus("green", "Photo scanned — review and edit, then parse");
  } catch (err) {
    setStatus("amber", "Error: " + err.message);
  }

  btn.disabled = false;
  e.target.value = ""; // reset so same file can be re-selected
});
```

- [ ] **Step 2: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: add runScan() and photo input handler"
```

---

## Task 4: Update `rejection-email-agent.html`

**Files:**
- Modify: `app/rejection-email-agent.html`

- [ ] **Step 1: Add the hidden file input**

Directly before the `<div class="action-row">` line, insert:

```html
  <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none" />
```

- [ ] **Step 2: Add the Scan photo button**

Inside `.action-row`, after the closing `</button>` of `#parseBtn` and before the `<div class="status-row">`, insert:

```html
    <button class="parse-btn" id="scanBtn" onclick="runScan()">
      <i class="ti ti-camera" aria-hidden="true"></i>
      Scan photo
    </button>
```

The action-row should now read:

```html
  <div class="action-row">
    <button class="parse-btn" id="parseBtn" onclick="runParse()" disabled>
      <i class="ti ti-sparkles" aria-hidden="true"></i>
      Parse notes
    </button>
    <button class="parse-btn" id="scanBtn" onclick="runScan()">
      <i class="ti ti-camera" aria-hidden="true"></i>
      Scan photo
    </button>
    <div class="status-row">
      <div class="dot" id="statusDot"></div>
      <span id="statusText">Select a candidate to begin</span>
    </div>
  </div>
```

- [ ] **Step 3: Commit**

```bash
git add app/rejection-email-agent.html
git commit -m "feat: add Scan photo button to action row"
```

---

## Task 5: End-to-end browser test

- [ ] **Step 1: Start local dev server**

```bash
netlify dev
# Open http://localhost:8888 in the browser
```

- [ ] **Step 2: Test the happy path**

1. Take a photo of any handwritten text, or use any JPEG/PNG from your machine.
2. Click "Scan photo" — the file picker (or camera on mobile) should open.
3. Select the image.
4. Status indicator should pulse blue with "Scanning photo…" and the scan button should disable.
5. After a few seconds, the textarea should populate with the transcribed text.
6. Status should turn green: "Photo scanned — review and edit, then parse".
7. Edit the text if needed, then select a candidate and click "Parse notes" — confirm the normal parse flow still works.

- [ ] **Step 3: Test the error path**

Open browser DevTools → Network tab. With the dev server running, temporarily break the function by editing `ocr.js` to return early with `statusCode: 500`. Scan a photo — status should turn amber with the error message. Revert the change.

- [ ] **Step 4: Test re-scanning the same file**

Scan the same image twice in a row. It should work both times (the `e.target.value = ""` reset makes this possible).

- [ ] **Step 5: Final commit if any polish fixes were needed**

```bash
git add -p
git commit -m "fix: photo scan polish"
```
