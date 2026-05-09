# Email Template Management — Design Spec
**Date:** 2026-05-09
**Status:** Approved

## Overview

Recruiters can create, save, rename, and switch between named email templates. The current hardcoded email structure becomes the protected default template. Custom templates are written as plain text with five tokens (`{name}`, `{role}`, `{P}`, `{AI}`, `{D}`) that the renderer substitutes at email-preview time. All state is stored in `localStorage` — no database, no backend changes.

## Data Model

### Storage keys

| Key | Value |
|-----|-------|
| `rea_templates` | JSON array of custom template objects `{ id, name, body }` |
| `rea_active_template` | String — ID of the active template (`"default"` or a custom UUID) |

The default template is **never stored in localStorage**. It is hardcoded in JS and always available. Custom templates are stored alongside the existing `rea_usage` key.

### Template object shape

```json
{ "id": "abc123", "name": "Warm close", "body": "Hi {name},\n\n..." }
```

- `id` — random string generated at creation time (`Math.random().toString(36).slice(2)`)
- `name` — recruiter-chosen label shown in the pill
- `body` — plain text; double newlines separate paragraphs; single newlines within a paragraph become `<br>` in the rendered output

### Tokens

| Token | Renders as |
|-------|-----------|
| `{name}` | Candidate first name (escaped) |
| `{role}` | Role name (escaped) |
| `{P}` | `<span class="highlight green">` if parsed, empty placeholder span if not |
| `{AI}` | `<span class="highlight amber">` if parsed, empty placeholder span if not |
| `{D}` | `<span class="highlight blue">` if parsed, empty placeholder span if not |

Unknown tokens (e.g. `{foo}`) are left as literal text — no error, no substitution.

### Default template body

```
Hi {name},

Thank you for your time interviewing with me — I really enjoyed learning about your experiences.

Unfortunately, we have decided not to proceed with your application on this occasion.

I thought that you {P}. However, for this role we're looking for someone that can demonstrate {AI}. This is important for success in the role and we feel other candidates have been able to demonstrate this more clearly.

I would suggest {D}.

Feedback is important to us and we want to help you in future processes. Thanks again for your time and interest, and best of luck in your search.

Best wishes,
[Recruiter name]
```

## UI Behaviour

### Step-4 header row

The existing `.section-label-row` is extended to three zones:

1. **Left:** `4 — email preview` section label (unchanged)
2. **Centre-right:** Template pills — one per template plus a dashed `+ New` pill
3. **Far right:** Divider (`|`), then action buttons

The pills are built dynamically by `buildTemplatePills()`, called on page load and after any template change.

**When default template is active:**
- Default pill is highlighted (active style)
- Action button reads "Duplicate"
- Clicking "Duplicate" creates a copy of the default named "Copy of Standard", saves it to localStorage, sets it as active, and immediately opens the editor

**When a custom template is active:**
- That pill is highlighted
- Action button reads "Edit"
- Clicking "Edit" opens the inline editor panel for the active template

"Copy email" button remains unchanged at the far right, hidden until after parse (existing behaviour).

### Template editor panel

A collapsible `<div id="templateEditor">` sits between the step-4 header row and `#emailPreview`. Hidden by default (`display:none`). Opens/closes in place — no modal, no navigation.

**Editor header:**
- `<input id="templateNameInput">` — editable template name, auto-focused on open
- Five token chips: `{P}` (green), `{AI}` (amber), `{D}` (blue), `{name}` (neutral), `{role}` (neutral). Clicking a chip inserts the token text at the current cursor position in the textarea.

**Editor body:**
- `<textarea id="templateBodyInput">` — monospace, resizable, pre-filled with current template body

**Validation line** (updates on every `input` event):
- All three AI tokens present → quiet "All tokens present" message
- Any missing → "Missing `{P}`" / "Missing `{AI}`" / "Missing `{D}`" (space-separated, all missing tokens listed)
- Validation is a nudge only — does not block saving

**Editor footer:**
- **Left:** "Delete" button — visible only for custom templates, not for the default. Clicking shows an inline confirmation: "Delete this template?" with a "Confirm" text button. On confirm: deletes the template from localStorage, switches active to `"default"`, rebuilds pills, closes editor.
- **Right:** "Done" button — saves the current name and body, closes the panel, calls `buildTemplatePills()` and `renderEmail()` so the preview updates immediately.

### Creating a new template

Clicking `+ New`:
1. Creates a new template object with `id = Math.random().toString(36).slice(2)`, `name = "New template"`, `body = getDefaultTemplateBody()`
2. Saves to `rea_templates`
3. Sets as active template
4. Calls `buildTemplatePills()`
5. Opens editor with name input focused

### Persistence on page load

On load, `activeTemplateId` is read from `rea_active_template` (defaults to `"default"` if absent). `buildTemplatePills()` is called before `renderEmail()`.

## Rendering Logic

`renderEmail()` is updated to use the active template body instead of a hardcoded template literal.

New flow:
1. Get active template body (`getDefaultTemplateBody()` if `activeTemplateId === "default"`, else look up from localStorage)
2. Split by `\n\n` to get paragraphs
3. For each paragraph:
   a. Replace `{name}` → `esc(selected.name.split(" ")[0])`
   b. Replace `{role}` → `esc(selected.role)`
   c. Replace `{P}` → highlight span (green if `parsed.P` is set, empty placeholder if not)
   d. Replace `{AI}` → highlight span (amber if `parsed.AI` is set, empty placeholder if not)
   e. Replace `{D}` → highlight span (blue if `parsed.D` is set, empty placeholder if not)
   f. Replace remaining `\n` within the paragraph → `<br>`
   g. Wrap in `<div class="email-line">`
4. Prepend `<div class="email-meta">` (generated from candidate data, unchanged)
5. Set `preview.innerHTML` to the assembled HTML
6. Call `enableEdit(preview)` or `disableEdit(preview)` as today

The `!selected` early-return branch remains unchanged — it shows the empty-state message and calls `disableEdit`.

All user-supplied values (`parsed.P`, `parsed.AI`, `parsed.D`, candidate name, role) continue to be passed through `esc()` before insertion — no new XSS surface is introduced.

## CSS

New classes:

| Class | Purpose |
|-------|---------|
| `.template-pills` | Flex row container for pill buttons |
| `.template-pill` | Individual pill — outline style (inactive) |
| `.template-pill.active` | Active pill — filled/highlighted style |
| `.template-pill.new` | Dashed border, muted colour — the `+ New` pill |
| `.template-editor` | The collapsible editor panel — card style, blue border when open |
| `.template-name-input` | Inline name input in editor header |
| `.token-chips` | Flex row of token reference chips |
| `.token-chip` | Individual token chip |
| `.token-chip.green / .amber / .blue` | Coloured variants matching highlight colours |
| `.template-validation` | Small validation line below textarea |
| `.template-editor-footer` | Footer row with Delete (left) and Done (right) |
| `.template-actions` | Flex row wrapping pills + divider + Edit/Duplicate + Copy buttons |
| `.template-divider` | Thin vertical line separating pills from action buttons |

The step-4 header `.section-label-row` gains a `gap` and wraps the right-hand controls in a `.template-actions` container (pills + divider + Edit/Duplicate + Copy).

## JS Functions

| Function | Purpose |
|----------|---------|
| `getDefaultTemplateBody()` | Returns the hardcoded default template body string |
| `getTemplates()` | Returns full list: `[defaultObj, ...customFromLocalStorage]` |
| `saveCustomTemplates(arr)` | Writes custom templates array to `rea_templates` in localStorage |
| `getActiveTemplateBody()` | Returns the active template body string |
| `setActiveTemplate(id)` | Updates `activeTemplateId`, saves to `rea_active_template`, calls `buildTemplatePills()` and `renderEmail()` |
| `buildTemplatePills()` | Clears and rebuilds the pills container and Edit/Duplicate button |
| `openEditor(id)` | Populates editor inputs from template, shows panel, focuses name input |
| `closeEditor()` | Hides editor panel |
| `saveCurrentTemplate()` | Reads name + body from editor inputs, updates localStorage, closes editor, calls `buildTemplatePills()` + `renderEmail()` |
| `deleteCurrentTemplate()` | Shows inline confirm; on confirm deletes from localStorage, switches to default, closes editor |
| `createTemplate()` | Creates new template from default body, saves, sets active, opens editor |
| `insertToken(token)` | Inserts token string at cursor in `#templateBodyInput` |
| `validateTemplate(body)` | Returns array of missing token names from `{P}`, `{AI}`, `{D}` |
| `onTemplateBodyInput()` | `input` event handler on `#templateBodyInput` — calls `validateTemplate()` and updates `#templateValidation` text |

`renderEmail()` is updated as described in the Rendering Logic section. All other existing functions (`enableEdit`, `disableEdit`, `copyEmail`, `runParse`, `runScan`, etc.) are unchanged.

## HTML Changes

```html
<!-- Step 4 — extended header row -->
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

<!-- Template editor panel (hidden by default) -->
<div class="template-editor" id="templateEditor" style="display:none">
  <div class="template-editor-header">
    <input class="template-name-input" id="templateNameInput" type="text" />
    <div class="token-chips" id="tokenChips">
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

<!-- Email preview (unchanged) -->
<div class="email-preview" id="emailPreview">
  <p class="empty-state">Select a candidate and parse notes to see the completed email.</p>
</div>
```

## Files Changed

| File | Change |
|------|--------|
| `app/rejection-email-agent.js` | Template state + 12 new functions; updated `renderEmail()`; updated page-load init |
| `app/rejection-email-agent.css` | 10 new CSS classes for pills, editor panel, token chips |
| `app/rejection-email-agent.html` | Extended step-4 header; new `#templateEditor` div |

## Out of Scope

- Cross-device sync or shared team templates (no database — localStorage only)
- Importing/exporting templates as files
- Per-field token constraints (any token can appear anywhere in the template)
- Rich text or WYSIWYG editing (monospace plain text only)
- Template versioning or undo history
