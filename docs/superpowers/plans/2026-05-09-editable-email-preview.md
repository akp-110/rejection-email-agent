# Editable Email Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a successful parse the email preview becomes click-to-edit, and a "Copy email" button copies the plain text to clipboard.

**Architecture:** Three targeted changes — CSS adds the editable and copy-button styles, HTML wraps the step-4 label in a flex row and adds the hidden copy button, JS adds `enableEdit()` / `disableEdit()` / `copyEmail()` helpers and wires them into the existing `renderEmail()` function. No new files, no serverless changes.

**Tech Stack:** Vanilla CSS custom properties, vanilla JS (`contenteditable`, `navigator.clipboard`, `innerText`), Tabler Icons (already loaded via CDN).

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Modify | `app/rejection-email-agent.css` | Add `.section-label-row`, `.copy-btn`, `.is-editable` block |
| Modify | `app/rejection-email-agent.html` | Wrap step-4 label in `.section-label-row`, add `#copyBtn` |
| Modify | `app/rejection-email-agent.js` | Add `enableEdit()`, `disableEdit()`, `copyEmail()`; update `renderEmail()` |

---

## Task 1: CSS — editable state and copy button styles

**Files:**
- Modify: `app/rejection-email-agent.css`

- [ ] **Step 1: Add styles between the `hr` block and the `/* Email preview */` comment**

The `hr` rule ends around line 294. The `/* Email preview */` comment follows it. Insert this block between them:

```css
/* Section label row — label + inline action button */
.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-label-row .section-label {
  margin-bottom: 0;
}

.copy-btn {
  background: var(--bg-primary);
  border: 0.5px solid var(--border-mid);
  border-radius: var(--radius-md);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s;
  white-space: nowrap;
}

.copy-btn:hover {
  background: var(--bg-secondary);
}

/* Editable email preview */
.email-preview.is-editable {
  position: relative;
  cursor: text;
}

.email-preview.is-editable:hover {
  border-color: var(--border-mid);
}

.email-preview.is-editable:focus-within {
  border-color: var(--border-mid);
  outline: none;
}

.email-preview.is-editable::after {
  content: "click to edit";
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.email-preview.is-editable:hover:not(:focus-within)::after {
  opacity: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/rejection-email-agent.css
git commit -m "feat: add is-editable and copy-btn styles"
```

---

## Task 2: HTML — wrap step-4 label, add copy button

**Files:**
- Modify: `app/rejection-email-agent.html`

- [ ] **Step 1: Replace the step-4 section label (around line 68-69)**

Find this block:
```html
  <!-- Step 4 -->
  <div class="section-label">4 — email preview</div>
```

Replace it with:
```html
  <!-- Step 4 -->
  <div class="section-label-row">
    <div class="section-label">4 — email preview</div>
    <button class="copy-btn" id="copyBtn" onclick="copyEmail()" style="display:none">
      <i class="ti ti-copy" aria-hidden="true"></i>
      Copy email
    </button>
  </div>
```

The `#emailPreview` div on the next line is unchanged.

- [ ] **Step 2: Commit**

```bash
git add app/rejection-email-agent.html
git commit -m "feat: add copy email button to step-4 header"
```

---

## Task 3: JS — helpers and renderEmail() update

**Files:**
- Modify: `app/rejection-email-agent.js`

- [ ] **Step 1: Add the three new functions above the Scan section**

Find the line `// ─── Scan ────────────────────────────────────────` in the file. Insert this block directly above it:

```javascript
// ─── Edit & copy ─────────────────────────────────
function enableEdit(el) {
  el.contentEditable = "true";
  el.classList.add("is-editable");
  document.getElementById("copyBtn").style.display = "";
}

function disableEdit(el) {
  el.contentEditable = "false";
  el.classList.remove("is-editable");
  document.getElementById("copyBtn").style.display = "none";
}

function copyEmail() {
  const preview = document.getElementById("emailPreview");
  const btn = document.getElementById("copyBtn");
  navigator.clipboard.writeText(preview.innerText).then(() => {
    btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copied';
    setTimeout(() => {
      btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy email';
    }, 1500);
  });
}

```

- [ ] **Step 2: Add `disableEdit` to the early-return branch of `renderEmail()`**

In `renderEmail()` (around line 129), find the `!selected` early-return block:

```javascript
  if (!selected) {
    preview.innerHTML = `<p class="empty-state">Select a candidate and parse notes to see the completed email.</p>`;
    return;
  }
```

Add `disableEdit(preview);` before the `return`:

```javascript
  if (!selected) {
    preview.innerHTML = `<p class="empty-state">Select a candidate and parse notes to see the completed email.</p>`;
    disableEdit(preview);
    return;
  }
```

- [ ] **Step 3: Add `enableEdit`/`disableEdit` call at the end of `renderEmail()`**

`renderEmail()` ends at the closing `};` after the `preview.innerHTML = ...` template literal. Directly after that template literal assignment and before the closing `}`, add:

```javascript
  if (parsed.P || parsed.AI || parsed.D) {
    enableEdit(preview);
  } else {
    disableEdit(preview);
  }
```

The end of `renderEmail()` should now read:

```javascript
    <div class="email-line" style="margin-top:1.25rem;">Best wishes,<br><strong>[Recruiter name]</strong></div>
  `;

  if (parsed.P || parsed.AI || parsed.D) {
    enableEdit(preview);
  } else {
    disableEdit(preview);
  }
}
```

- [ ] **Step 4: Verify `disableEdit` is called on page load automatically**

The last two lines of the file call `buildCandidateGrid()` then `renderEmail()`. On load, `selected` is `null`, so `renderEmail()` hits the `!selected` branch and calls `disableEdit` — no extra wiring needed. Confirm these final lines are unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: enable contenteditable and copy after parse"
```

---

## Task 4: Browser verification

No test framework — verify manually via `netlify dev`.

- [ ] **Step 1: Start the dev server**

```bash
netlify dev
# Open http://localhost:8888
```

- [ ] **Step 2: Verify edit is disabled before parse**

1. Page loads — confirm no "click to edit" hint, copy button not visible
2. Select a candidate — email renders with placeholders. No copy button, clicking in the preview should not produce a text cursor

- [ ] **Step 3: Verify edit enables after parse**

1. Paste any notes, click "Parse notes"
2. "Copy email" button appears next to "4 — email preview" label
3. Hover the email preview — "click to edit" hint fades in top-right
4. Click into the email — text cursor appears, typing works. Hint disappears while focused.

- [ ] **Step 4: Verify copy**

1. Click "Copy email"
2. Button label changes to "Copied" for ~1.5 seconds then reverts
3. Paste into any plain text editor — no HTML tags, clean paragraph spacing

- [ ] **Step 5: Verify re-parse clears edits and keeps edit mode**

1. Edit some text in the preview
2. Click "Parse notes" again
3. Email re-renders with fresh values, manual edits gone, but edit mode and copy button remain active

- [ ] **Step 6: Verify candidate change resets edit mode**

1. After parse (edit mode active), select a different candidate
2. Email shows placeholder state — copy button disappears, preview is no longer editable
