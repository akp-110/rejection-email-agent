# Editable Email Preview — Design Spec
**Date:** 2026-05-09
**Status:** Approved

## Overview

After a parse has been performed, the email preview becomes directly editable. The recruiter can click anywhere in the rendered email and type freely — adjusting wording, fixing tone, or personalising beyond what the parsed fields provide. A copy button lets them transfer the final text to the clipboard in one click.

## Behaviour

**Before parse / on candidate change:**
- `#emailPreview` is not editable (`contenteditable` absent or `"false"`)
- No copy button visible
- Renders as today: empty-state message or placeholder spans

**After a successful parse:**
- `#emailPreview` gains `contenteditable="true"` and the CSS class `is-editable`
- A faint "click to edit" hint appears in the top-right corner of the preview, visible on hover, hidden on focus (so it doesn't distract while typing)
- The copy button appears next to the "4 — email preview" section label
- The highlight spans (green P, amber AI, blue D) remain styled and are editable inline

**Re-parsing:**
- `renderEmail()` re-renders as normal — this clears any manual edits
- `contenteditable` and `is-editable` are re-applied after the new render
- This is the expected workflow: parse → edit → copy. Cmd+Z in the browser restores overwritten edits if needed.

**On candidate change (`selectCandidate`):**
- `parsed` resets to `{ P: null, AI: null, D: null }`
- `renderEmail()` runs, showing placeholder state
- `contenteditable` is removed and the copy button is hidden

## Copy Button

- Positioned inline with the "4 — email preview" section label (right-aligned, same row)
- Hidden by default; shown only when `is-editable` is active
- Icon: `ti ti-copy` (Tabler Icons, already loaded)
- Label: "Copy email"
- On click: `navigator.clipboard.writeText(preview.innerText)` — `innerText` reads the visible plain text of the preview, stripping all HTML tags, giving clean text suitable for pasting into Greenhouse or any email client
- After copy: button label changes to "Copied" for 1.5 seconds, then reverts
- No emojis

## CSS

New class `.is-editable` on `#emailPreview`:
- `outline: none` (suppress browser default focus ring)
- On `:hover`: subtle border colour shift (`--border-mid` instead of `--border-light`) to hint interactivity
- On `:focus-within`: same border treatment, no extra ring
- `"click to edit"` hint: `::after` pseudo-element, `position: absolute`, top-right corner, `opacity: 0` by default, `opacity: 1` on `.is-editable:hover:not(:focus-within)`
- `#emailPreview` needs `position: relative` to anchor the pseudo-element

New `.section-label-row`:
- `display: flex; align-items: center; justify-content: space-between`
- Used to place the copy button flush-right alongside the section label

New `.copy-btn`:
- Same visual style as `.parse-btn` (existing secondary button)
- Smaller: `font-size: 12px`, `padding: 5px 12px`

## JS Changes

**`renderEmail()`:**
- After rendering, check `parsed.P || parsed.AI || parsed.D` — if any field is filled, call `enableEdit(preview)`; otherwise call `disableEdit(preview)`
- Note: all user-supplied values (candidate name, role, parsed fields) are already passed through `esc()` before being used in the rendered output, so no new XSS surface is introduced

**`enableEdit(el)`** — new helper:
- `el.contentEditable = "true"`
- `el.classList.add("is-editable")`
- `document.getElementById("copyBtn").style.display = ""`

**`disableEdit(el)`** — new helper:
- `el.contentEditable = "false"`
- `el.classList.remove("is-editable")`
- `document.getElementById("copyBtn").style.display = "none"`

**`copyEmail()`** — new function, called by copy button `onclick`:
- Reads `preview.innerText` (safe plain-text read, no HTML parsing)
- Writes to clipboard via `navigator.clipboard.writeText()`
- Temporarily changes button label to "Copied" for 1.5 seconds, then restores icon + label

## HTML Changes

Wrap the step-4 section label in a row div and add the copy button:

```html
<div class="section-label-row">
  <div class="section-label">4 — email preview</div>
  <button class="copy-btn" id="copyBtn" onclick="copyEmail()" style="display:none">
    <i class="ti ti-copy" aria-hidden="true"></i>
    Copy email
  </button>
</div>
```

`#emailPreview` itself is unchanged in the HTML — editability is toggled entirely in JS.

## Files Changed

| File | Change |
|------|--------|
| `app/rejection-email-agent.html` | Wrap step-4 label in `.section-label-row`, add `#copyBtn` |
| `app/rejection-email-agent.css` | `.section-label-row`, `.copy-btn`, `.is-editable` styles |
| `app/rejection-email-agent.js` | `enableEdit()`, `disableEdit()`, `copyEmail()`, update `renderEmail()` |

## Out of Scope

- Persisting edited email text across page reloads
- Diff view showing what the recruiter changed vs the original render
- Per-field editing constraints (all text in the preview is freely editable)
