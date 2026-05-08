# Photo Scan Feature — Design Spec
**Date:** 2026-05-09
**Status:** Approved

## Overview

Add a "Scan photo" button to the recruiter notes section. The recruiter takes or uploads a photo of handwritten interview notes; the image is sent to Claude's vision API, the transcribed text is placed into the notes textarea for review and editing, and the existing "Parse notes" flow continues unchanged.

## UI

- A secondary button — `<i class="ti ti-camera"></i> Scan photo` — is added to the existing `.action-row` alongside the "Parse notes" button.
- A hidden `<input type="file" id="photoInput" accept="image/*" capture="environment">` is placed in the HTML (not visible). The scan button triggers a click on it.
- On mobile, `capture="environment"` opens the rear camera directly. On desktop it opens a file picker.
- No emojis anywhere. Tabler Icons only (already loaded via CDN).

**Button states:**
- **Idle:** `Scan photo` with camera icon, enabled at all times (no candidate required — scanning is independent of candidate selection).
- **Scanning:** Button text changes to `Scanning…`, disabled. The textarea shows a subtle placeholder text `Reading handwriting…` while empty, or is replaced with that text if populated (the textarea is set to disabled during scanning to prevent edits).
- **Done:** Textarea is re-enabled and populated with the transcribed text. `setStatus("green", "Photo scanned — review and edit, then parse")` is called. The "Parse notes" button enables normally once a candidate is selected.
- **Error:** `setStatus("amber", "Error: ...")` — same pattern as parse errors.

## Data Flow

1. User clicks "Scan photo" → JS triggers the hidden file input.
2. User selects or photographs an image.
3. JS reads the file via `FileReader.readAsDataURL`, extracts the base64 payload and MIME type.
4. JS POSTs `{ image: "<base64>", mediaType: "image/jpeg" }` to `/api/ocr`.
5. Netlify redirects `/api/ocr` → `/.netlify/functions/ocr`.
6. `ocr.js` validates the payload, calls Claude Haiku 4.5 with the image and a transcription prompt, returns `{ text }`.
7. JS populates `#notesInput` with the returned text, removes the scanning state.

## New Serverless Function — `netlify/functions/ocr.js`

**Route:** `/api/ocr` (redirect added to `netlify.toml`)

**Input:** `POST { image: string (base64), mediaType: string }`

**Validation:**
- Method must be POST.
- `image` must be a non-empty string.
- `mediaType` must be one of `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- Image payload capped at ~5 MB (base64 length ≤ 6,900,000 chars) to prevent token abuse.

**Claude call:**
- Model: `claude-haiku-4-5-20251001` (same as parse.js).
- Vision message: image block + text prompt asking Claude to transcribe all handwritten or printed text exactly as written, preserving line breaks, outputting plain text only.
- `max_tokens: 1024` (generous for dense notes).

**Output:** `{ text: string }` on success, `{ error: string }` with appropriate status on failure.

**Rate limiting:** None added on OCR — the existing parse-level limits are sufficient. OCR calls are cheap (Haiku vision) and the recruiter needs to scan before they can parse anyway.

## `netlify.toml` Change

Add one redirect:

```toml
[[redirects]]
  from = "/api/ocr"
  to   = "/.netlify/functions/ocr"
  status = 200
```

## Frontend Changes

Files modified: `rejection-email-agent.html`, `rejection-email-agent.js`

- **HTML:** Add the `<input type="file">` element and the "Scan photo" button inside `.action-row`.
- **JS:** Add `runScan()` function — reads file, base64-encodes, calls `/api/ocr`, populates textarea, handles errors via `setStatus()`.

No CSS changes required — the scan button uses the same secondary button style as other existing secondary elements.

## Out of Scope

- Rate limiting OCR calls separately.
- Showing a preview of the uploaded photo.
- Supporting PDF uploads.
- Multi-page scans.
