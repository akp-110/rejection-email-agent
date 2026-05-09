# Email Template Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add template management to the email preview — recruiters can create, name, save, and switch between custom email templates using plain text with `{name}`, `{role}`, `{P}`, `{AI}`, `{D}` token substitution.

**Architecture:** Three targeted file changes — CSS adds pill, editor, and token chip styles; HTML extends the step-4 header with template pills and a collapsible editor panel; JS adds 13 new functions for template CRUD and updates `renderEmail()` to substitute tokens from the active template body. The default template is hardcoded in JS and protected; custom templates live in `localStorage` under `rea_templates`. No serverless changes.

**Tech Stack:** Vanilla CSS custom properties, vanilla JS (`localStorage`, token substitution via `.replace()`), Tabler Icons (already loaded).

---

## File Map

| Action | Path | Change |
|--------|------|--------|
| Modify | `app/rejection-email-agent.css` | 12 new classes for pills, editor panel, token chips |
| Modify | `app/rejection-email-agent.html` | Extend step-4 header; add `#templateEditor` div between header and `#emailPreview` |
| Modify | `app/rejection-email-agent.js` | 2 new state vars + 13 functions; updated `renderEmail()`; updated page-load init |

---

## Task 1: CSS — template management styles

**Files:**
- Modify: `app/rejection-email-agent.css`

The CSS file currently has `/* Email preview */` around line 360. Insert the new template styles immediately above that comment.

- [ ] **Step 1: Add template management styles**

Find this exact comment in `app/rejection-email-agent.css`:

```css
/* Email preview */
```

Insert the following block directly above it:

```css
/* Template management */
.template-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.template-pills {
  display: flex;
  align-items: center;
  gap: 4px;
}

.template-pill {
  background: var(--bg-primary);
  border: 0.5px solid var(--border-mid);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-secondary);
  transition: background 0.15s;
  white-space: nowrap;
}

.template-pill:hover {
  background: var(--bg-secondary);
}

.template-pill.active {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}

.template-pill.new {
  border-style: dashed;
  color: var(--text-tertiary);
}

.template-pill.new:hover {
  color: var(--text-secondary);
  background: var(--bg-secondary);
}

.template-divider {
  width: 1px;
  height: 14px;
  background: var(--border-light);
  flex-shrink: 0;
}

.template-editor {
  background: var(--bg-primary);
  border: 0.5px solid #93b4f5;
  border-radius: var(--radius-lg);
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}

.template-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
}

.template-name-input {
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  border-bottom: 1px solid var(--border-light);
  padding: 2px 0;
  min-width: 120px;
  transition: border-color 0.15s;
}

.template-name-input:focus {
  border-bottom-color: var(--border-strong);
}

.token-chips {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.token-chip {
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  transition: opacity 0.15s;
  user-select: none;
}

.token-chip:hover { opacity: 0.75; }

.token-chip.green { background: var(--green-bg); color: var(--green-text); }
.token-chip.amber { background: var(--amber-bg); color: var(--amber-text); }
.token-chip.blue  { background: var(--blue-bg);  color: var(--blue-text); }

#templateBodyInput {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 0.5px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  outline: none;
  line-height: 1.7;
  margin-bottom: 0.5rem;
}

#templateBodyInput:focus { border-color: var(--border-strong); }

.template-editor-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-validation {
  flex: 1;
  font-size: 11px;
  color: var(--text-tertiary);
}

.template-validation.warn { color: var(--amber-text); }
.template-validation.ok   { color: var(--green-text); }

.template-delete-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.template-delete-btn:hover { color: #ef4444; }
.template-delete-btn.danger { color: #ef4444; font-weight: 500; }

```

- [ ] **Step 2: Commit**

```bash
git add app/rejection-email-agent.css
git commit -m "feat: add template management CSS"
```

---

## Task 2: HTML — extend step-4 header and add editor panel

**Files:**
- Modify: `app/rejection-email-agent.html`

The current step-4 block (around line 68–78) looks like this:

```html
  <!-- Step 4 -->
  <div class="section-label-row">
    <div class="section-label">4 — email preview</div>
    <button class="copy-btn" id="copyBtn" onclick="copyEmail()" style="display:none">
      <i class="ti ti-copy" aria-hidden="true"></i>
      Copy email
    </button>
  </div>
  <div class="email-preview" id="emailPreview">
    <p class="empty-state">Select a candidate and parse notes to see the completed email.</p>
  </div>
```

- [ ] **Step 1: Replace the step-4 block**

Replace the entire block above with:

```html
  <!-- Step 4 -->
  <div class="section-label-row">
    <div class="section-label">4 — email preview</div>
    <div class="template-actions">
      <div class="template-pills" id="templatePills"></div>
      <div class="template-divider"></div>
      <button class="copy-btn" id="editTemplateBtn"></button>
      <button class="copy-btn" id="copyBtn" onclick="copyEmail()" style="display:none">
        <i class="ti ti-copy" aria-hidden="true"></i>
        Copy email
      </button>
    </div>
  </div>

  <!-- Template editor panel -->
  <div class="template-editor" id="templateEditor" style="display:none">
    <div class="template-editor-header">
      <input class="template-name-input" id="templateNameInput" type="text" placeholder="Template name" />
      <div class="token-chips">
        <span class="token-chip green" onclick="insertToken('{P}')">{P}</span>
        <span class="token-chip amber" onclick="insertToken('{AI}')">{AI}</span>
        <span class="token-chip blue" onclick="insertToken('{D}')">{D}</span>
        <span class="token-chip" onclick="insertToken('{name}')">{name}</span>
        <span class="token-chip" onclick="insertToken('{role}')">{role}</span>
      </div>
    </div>
    <textarea id="templateBodyInput"></textarea>
    <div class="template-editor-footer">
      <button class="template-delete-btn" id="deleteTemplateBtn" onclick="deleteCurrentTemplate()">Delete</button>
      <span class="template-validation" id="templateValidation"></span>
      <button class="copy-btn" onclick="saveCurrentTemplate()">Done</button>
    </div>
  </div>

  <div class="email-preview" id="emailPreview">
    <p class="empty-state">Select a candidate and parse notes to see the completed email.</p>
  </div>
```

- [ ] **Step 2: Commit**

```bash
git add app/rejection-email-agent.html
git commit -m "feat: add template pills and editor panel to step-4 HTML"
```

---

## Task 3: JS — template storage and state

**Files:**
- Modify: `app/rejection-email-agent.js`

State variables live at the top of the file. Template functions go just above `// ─── Usage & limits ───`.

- [ ] **Step 1: Add state variables after `let parsed`**

Find:

```javascript
let parsed   = { P: null, AI: null, D: null };
```

Add directly after it:

```javascript
let activeTemplateId     = localStorage.getItem("rea_active_template") || "default";
let editingTemplateId    = null;
let deleteConfirmPending = false;
```

- [ ] **Step 2: Add template storage functions above `// ─── Usage & limits ───`**

Find:

```javascript
// ─── Usage & limits ──────────────────────────────
```

Insert the following block directly above it:

```javascript
// ─── Templates ───────────────────────────────────
function getDefaultTemplateBody() {
  return `Hi {name},

Thank you for your time interviewing with me — I really enjoyed learning about your experiences.

Unfortunately, we have decided not to proceed with your application on this occasion.

I thought that you {P}. However, for this role we're looking for someone that can demonstrate {AI}. This is important for success in the role and we feel other candidates have been able to demonstrate this more clearly.

I would suggest {D}.

Feedback is important to us and we want to help you in future processes. Thanks again for your time and interest, and best of luck in your search.

Best wishes,
[Recruiter name]`;
}

function getTemplates() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem("rea_templates") || "[]"); }
  catch { custom = []; }
  return [{ id: "default", name: "Standard rejection", body: getDefaultTemplateBody(), protected: true }, ...custom];
}

function saveCustomTemplates(arr) {
  localStorage.setItem("rea_templates", JSON.stringify(arr));
}

function getActiveTemplateBody() {
  if (activeTemplateId === "default") return getDefaultTemplateBody();
  const t = getTemplates().find(t => t.id === activeTemplateId);
  return t ? t.body : getDefaultTemplateBody();
}

function setActiveTemplate(id) {
  activeTemplateId = id;
  localStorage.setItem("rea_active_template", id);
  buildTemplatePills();
  renderEmail();
}

```

- [ ] **Step 3: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: add template storage and state functions"
```

---

## Task 4: JS — pill builder and page-load init

**Files:**
- Modify: `app/rejection-email-agent.js`

`buildTemplatePills()` goes in the Templates section, after `setActiveTemplate`.

- [ ] **Step 1: Add `buildTemplatePills()` after `setActiveTemplate`**

Find:

```javascript
function setActiveTemplate(id) {
  activeTemplateId = id;
  localStorage.setItem("rea_active_template", id);
  buildTemplatePills();
  renderEmail();
}
```

Add directly after it:

```javascript
function buildTemplatePills() {
  const container = document.getElementById("templatePills");
  const editBtn   = document.getElementById("editTemplateBtn");
  container.replaceChildren();

  getTemplates().forEach(t => {
    const pill = document.createElement("button");
    pill.className = "template-pill" + (t.id === activeTemplateId ? " active" : "");
    pill.textContent = t.name;
    pill.addEventListener("click", () => setActiveTemplate(t.id));
    container.appendChild(pill);
  });

  const newPill = document.createElement("button");
  newPill.className = "template-pill new";
  newPill.textContent = "+ New";
  newPill.addEventListener("click", createTemplate);
  container.appendChild(newPill);

  const isDefault = activeTemplateId === "default";
  editBtn.textContent = isDefault ? "Duplicate" : "Edit";
  editBtn.onclick = isDefault ? createTemplate : () => openEditor(activeTemplateId);
}
```

- [ ] **Step 2: Update the page-load init at the bottom of the file**

Find the final two lines of the file:

```javascript
buildCandidateGrid();
renderEmail();
```

Replace with:

```javascript
buildCandidateGrid();
buildTemplatePills();
document.getElementById("templateBodyInput")?.addEventListener("input", onTemplateBodyInput);
renderEmail();
```

- [ ] **Step 3: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: add buildTemplatePills and wire page-load init"
```

---

## Task 5: JS — template editor functions

**Files:**
- Modify: `app/rejection-email-agent.js`

All editor functions go in the Templates section, after `buildTemplatePills()`.

- [ ] **Step 1: Add `openEditor`, `closeEditor`, and `insertToken`**

After `buildTemplatePills()`, add:

```javascript
function openEditor(id) {
  const t = getTemplates().find(t => t.id === id);
  if (!t) return;
  editingTemplateId = id;
  document.getElementById("templateNameInput").value = t.name;
  document.getElementById("templateBodyInput").value = t.body;
  document.getElementById("deleteTemplateBtn").style.display = t.protected ? "none" : "";
  validateTemplateUI(t.body);
  document.getElementById("templateEditor").style.display = "";
  document.getElementById("templateNameInput").focus();
}

function closeEditor() {
  document.getElementById("templateEditor").style.display = "none";
  editingTemplateId = null;
  deleteConfirmPending = false;
  const btn = document.getElementById("deleteTemplateBtn");
  btn.textContent = "Delete";
  btn.classList.remove("danger");
}

function insertToken(token) {
  const ta    = document.getElementById("templateBodyInput");
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + token.length;
  ta.focus();
  validateTemplateUI(ta.value);
}
```

- [ ] **Step 2: Add validation functions**

After `insertToken`, add:

```javascript
function validateTemplate(body) {
  return ["{P}", "{AI}", "{D}"].filter(tok => !body.includes(tok));
}

function validateTemplateUI(body) {
  const missing = validateTemplate(body);
  const el = document.getElementById("templateValidation");
  if (missing.length === 0) {
    el.textContent = "All tokens present";
    el.className = "template-validation ok";
  } else {
    el.textContent = "Missing: " + missing.join(", ");
    el.className = "template-validation warn";
  }
}

function onTemplateBodyInput() {
  validateTemplateUI(document.getElementById("templateBodyInput").value);
}
```

- [ ] **Step 3: Add `saveCurrentTemplate`, `deleteCurrentTemplate`, and `createTemplate`**

After `onTemplateBodyInput`, add:

```javascript
function saveCurrentTemplate() {
  const name   = document.getElementById("templateNameInput").value.trim() || "Untitled";
  const body   = document.getElementById("templateBodyInput").value;
  const custom = getTemplates().filter(t => !t.protected);
  const idx    = custom.findIndex(t => t.id === editingTemplateId);
  if (idx >= 0) custom[idx] = { ...custom[idx], name, body };
  saveCustomTemplates(custom);
  closeEditor();
  buildTemplatePills();
  renderEmail();
}

function deleteCurrentTemplate() {
  const btn = document.getElementById("deleteTemplateBtn");
  if (!deleteConfirmPending) {
    deleteConfirmPending = true;
    btn.textContent = "Confirm delete";
    btn.classList.add("danger");
    setTimeout(() => {
      if (deleteConfirmPending) {
        deleteConfirmPending = false;
        btn.textContent = "Delete";
        btn.classList.remove("danger");
      }
    }, 3000);
    return;
  }
  const custom = getTemplates().filter(t => !t.protected && t.id !== editingTemplateId);
  saveCustomTemplates(custom);
  activeTemplateId = "default";
  localStorage.setItem("rea_active_template", "default");
  closeEditor();
  buildTemplatePills();
  renderEmail();
}

function createTemplate() {
  const id     = Math.random().toString(36).slice(2);
  const t      = { id, name: "New template", body: getDefaultTemplateBody() };
  const custom = getTemplates().filter(t => !t.protected);
  custom.push(t);
  saveCustomTemplates(custom);
  activeTemplateId = id;
  localStorage.setItem("rea_active_template", id);
  buildTemplatePills();
  renderEmail();
  openEditor(id);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: add template editor, validation, save, delete, and create functions"
```

---

## Task 6: JS — update `renderEmail()` with token substitution

**Files:**
- Modify: `app/rejection-email-agent.js`

`renderEmail()` starts at around line 129. The `!selected` early-return branch is unchanged. This task has three targeted edits inside the function.

- [ ] **Step 1: Rename the span variables from `P/AI/D` to `pSpan/aiSpan/dSpan`**

Find:

```javascript
  const P  = parsed.P
    ? `<span class="highlight green">${esc(parsed.P)}</span>`
    : `<span class="highlight empty">[positive quality — parse notes to fill]</span>`;

  const AI = parsed.AI
    ? `<span class="highlight amber">${esc(parsed.AI)}</span>`
    : `<span class="highlight empty">[area for improvement — parse notes to fill]</span>`;

  const D  = parsed.D
    ? `<span class="highlight blue">${esc(parsed.D)}</span>`
    : `<span class="highlight empty">[development tip — parse notes to fill]</span>`;
```

Replace with:

```javascript
  const pSpan  = parsed.P
    ? `<span class="highlight green">${esc(parsed.P)}</span>`
    : `<span class="highlight empty">[positive quality — parse notes to fill]</span>`;

  const aiSpan = parsed.AI
    ? `<span class="highlight amber">${esc(parsed.AI)}</span>`
    : `<span class="highlight empty">[area for improvement — parse notes to fill]</span>`;

  const dSpan  = parsed.D
    ? `<span class="highlight blue">${esc(parsed.D)}</span>`
    : `<span class="highlight empty">[development tip — parse notes to fill]</span>`;
```

- [ ] **Step 2: Insert the `paragraphs` builder just before the `preview.innerHTML` assignment**

Find this line (it immediately precedes the template literal):

```javascript
  preview.innerHTML = `
```

Insert the following block directly above it:

```javascript
  const paragraphs = esc(getActiveTemplateBody())
    .split("\n\n")
    .map(para => {
      const html = para
        .replace(/\{name\}/g, fname)
        .replace(/\{role\}/g, role)
        .replace(/\{P\}/g, pSpan)
        .replace(/\{AI\}/g, aiSpan)
        .replace(/\{D\}/g, dSpan)
        .replace(/\n/g, "<br>");
      return `<div class="email-line">${html}</div>`;
    })
    .join("");

```

**Security note:** `esc()` is called on the raw template body before token substitution. `esc()` encodes `&`, `<`, `>`, `"` but leaves curly braces untouched, so `{P}`, `{AI}`, `{D}` survive the escaping and are replaced correctly in the next step. The highlight spans (`pSpan`, `aiSpan`, `dSpan`) are generated by trusted code, not user input.

- [ ] **Step 3: Replace the 7 hardcoded email-line divs with `${paragraphs}`**

Inside the template literal, find the 7 hardcoded lines:

```
    <div class="email-line">Hi ${fname},</div>
    <div class="email-line">Thank you for your time interviewing with me — I really enjoyed learning about your experiences.</div>
    <div class="email-line">Unfortunately, we have decided not to proceed with your application on this occasion.</div>
    <div class="email-line">I thought that you ${P}. However, for this role we're looking for someone that can demonstrate ${AI}. This is important for success in the role and we feel other candidates have been able to demonstrate this more clearly.</div>
    <div class="email-line">I would suggest ${D}.</div>
    <div class="email-line">Feedback is important to us and we want to help you in future processes. Thanks again for your time and interest, and best of luck in your search.</div>
    <div class="email-line" style="margin-top:1.25rem;">Best wishes,<br><strong>[Recruiter name]</strong></div>
```

Replace those 7 lines with:

```
    ${paragraphs}
```

The `<div class="email-meta">` line above them and the closing `` `; `` below them are unchanged.

- [ ] **Step 4: Commit**

```bash
git add app/rejection-email-agent.js
git commit -m "feat: replace hardcoded renderEmail template with token substitution"
```

---

## Task 7: Browser verification

No test framework — verify manually via `netlify dev`.

- [ ] **Step 1: Start the dev server**

```bash
netlify dev
# Open http://localhost:8888
```

- [ ] **Step 2: Verify default template on page load**

1. Page loads — "Standard rejection" pill appears in the step-4 header row, highlighted
2. Button to the right of the divider reads "Duplicate"
3. No editor panel visible
4. Select a candidate — email renders with the same structure as before (the default template)
5. Parse notes — colored highlight spans appear as before

- [ ] **Step 3: Verify creating and switching templates**

1. Click "+ New" — a "New template" pill appears highlighted; editor panel opens; name input is focused and reads "New template"; textarea contains the default body; validation reads "All tokens present"
2. Change name to "Warm close", edit some text, click Done — pill updates to "Warm close"; editor closes; email re-renders using the new body
3. Click "Standard rejection" pill — email switches to the default; button reads "Duplicate"
4. Click "Warm close" pill — email switches to the custom template; button reads "Edit"

- [ ] **Step 4: Verify token chip insertion**

1. While editing a custom template, delete `{AI}` from the textarea — validation reads "Missing: {AI}"
2. Place cursor in the textarea, click the amber `{AI}` chip — `{AI}` is inserted at cursor; validation returns to "All tokens present"
3. Click Done

- [ ] **Step 5: Verify delete with two-click confirmation**

1. With a custom template active, click Edit
2. Click Delete — button changes to "Confirm delete" (red); template is not yet deleted
3. Wait 3 seconds — button reverts to "Delete"
4. Click Delete, then immediately click "Confirm delete" — template is removed; app switches to "Standard rejection"; editor closes; pill disappears

- [ ] **Step 6: Verify default protection**

1. Click "Standard rejection" pill — button reads "Duplicate", not "Edit"
2. Click Duplicate — "New template" pill appears; editor opens with the default body pre-filled
3. The "Standard rejection" pill remains unchanged throughout

- [ ] **Step 7: Verify localStorage persistence**

1. Create a custom template, save it with a unique name
2. Reload the page (Cmd+R) — custom template pill reappears; if it was active, it is still active
3. Parse notes — email renders using the persisted template
