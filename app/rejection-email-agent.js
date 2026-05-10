// Mock candidate database.
// In production, swap this for a Greenhouse API call.
const candidates = [
  {
    id: "REC-2847", name: "James Okafor", role: "Customer Success Exec",
    notes: "Really warm and personable, built rapport quickly. Great at telling customer stories and showed genuine empathy. Struggled to give specific metrics around retention or upsell — a lot of vague answers when pushed on numbers. Would benefit from preparing a couple of data-backed examples before his next process.",
  },
  {
    id: "REC-3012", name: "Priya Sharma", role: "Data Analyst",
    notes: "Strong SQL fundamentals, talked through her query logic clearly. Presentation was well structured. Confidence dipped when asked about stakeholder management — felt like she's used to working heads-down rather than communicating findings upward. Suggest she seeks out more cross-functional projects or practice presenting to non-technical audiences.",
  },
  {
    id: "REC-3156", name: "Tom Baxter", role: "Sales Development Rep",
    notes: "High energy, clearly loves the hustle. Good understanding of outbound sequencing and objection handling. Got a bit flustered during the roleplay when the prospect pushed back hard — needs to work on staying composed under pressure. Cold call coaching or a rejection training programme would really help him.",
  },
  {
    id: "REC-3289", name: "Lena Müller", role: "Product Manager",
    notes: "Impressive product thinking, asked sharp clarifying questions in the case study. Roadmap prioritisation answer was excellent. Weaker on the engineering collaboration side — couldn't give a strong example of navigating technical debt conversations with a dev team. Worth reading up on agile rituals and practicing that framing before her next PM interview.",
  },
  {
    id: "REC-3301", name: "Dan Whitfield", role: "Backend Engineer",
    notes: "Solid on system design, talked confidently about distributed systems and trade-offs. Got caught out on the debugging exercise — took a long time and skipped writing tests entirely. Testing discipline and debugging under time pressure are the gaps. LeetCode is fine but suggest focusing on test-driven development practice specifically.",
  },
  {
    id: "REC-3378", name: "Aisha Conteh", role: "Marketing Executive",
    notes: "Creative thinker with a strong portfolio — the campaign examples she brought were genuinely impressive. Struggled on the analytics side, couldn't speak to CAC or attribution models clearly. For a role that's increasingly data-driven this was a gap. Suggest she gets hands-on with GA4 or HubSpot reporting to build that side up.",
  },
];

let selected = null;
let parsed   = { P: null, AI: null, D: null };
let activeTemplateId     = localStorage.getItem("rea_active_template") || "default";
let editingTemplateId    = null;
let deleteConfirmPending = false;

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
    el.textContent = "Missing " + missing.join(" ");
    el.className = "template-validation warn";
  }
}

function onTemplateBodyInput() {
  validateTemplateUI(document.getElementById("templateBodyInput").value);
}

function saveCurrentTemplate() {
  const name   = document.getElementById("templateNameInput").value.trim() || "Untitled";
  const body   = document.getElementById("templateBodyInput").value;
  const custom = getTemplates().filter(t => !t.protected);
  const idx    = custom.findIndex(t => t.id === editingTemplateId);
  if (idx >= 0) custom[idx] = { ...custom[idx], name, body };
  else custom.push({ id: editingTemplateId, name, body });
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
  const custom = getTemplates().filter(t => !t.protected);
  const name   = "Template " + (custom.length + 1);
  const t      = { id, name, body: getDefaultTemplateBody() };
  custom.push(t);
  saveCustomTemplates(custom);
  activeTemplateId = id;
  localStorage.setItem("rea_active_template", id);
  buildTemplatePills();
  renderEmail();
  openEditor(id);
}

// ─── Usage & limits ──────────────────────────────
const TRIAL_LIMIT = 3;
const DAILY_LIMIT = 20;

function getUsage() {
  try { return JSON.parse(localStorage.getItem("rea_usage") || "{}"); }
  catch { return {}; }
}

function saveUsage(u) {
  localStorage.setItem("rea_usage", JSON.stringify(u));
}

function isSignedIn() { return !!getUsage().email; }

function trialUsesLeft() {
  const u = getUsage();
  if (u.email) return Infinity;
  return Math.max(0, TRIAL_LIMIT - (u.trialCount || 0));
}

function isDailyLimitHit() {
  const u = getUsage();
  const today = new Date().toISOString().slice(0, 10);
  return u.dailyDate === today && (u.dailyCount || 0) >= DAILY_LIMIT;
}

function recordUse() {
  const u = getUsage();
  const today = new Date().toISOString().slice(0, 10);
  if (!u.email) u.trialCount = (u.trialCount || 0) + 1;
  if (u.dailyDate !== today) { u.dailyDate = today; u.dailyCount = 1; }
  else { u.dailyCount = (u.dailyCount || 0) + 1; }
  saveUsage(u);
}

// ─── Signup modal ────────────────────────────────
function showModal() {
  document.getElementById("modalOverlay").style.display = "flex";
  setTimeout(() => document.getElementById("signupEmail").focus(), 50);
}

function hideModal() {
  document.getElementById("modalOverlay").style.display = "none";
}

function handleSignup() {
  const email = document.getElementById("signupEmail").value.trim();
  if (!email || !email.includes("@")) {
    document.getElementById("signupEmail").classList.add("input-error");
    return;
  }
  const u = getUsage();
  u.email = email;
  saveUsage(u);
  hideModal();
  runParse();
}

document.getElementById("signupEmail")?.addEventListener("keydown", e => {
  e.target.classList.remove("input-error");
  if (e.key === "Enter") handleSignup();
});

document.getElementById("modalOverlay")?.addEventListener("click", e => {
  if (e.target === e.currentTarget) hideModal();
});

// ─── Helpers ─────────────────────────────────────
function esc(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildCandidateGrid() {
  const grid = document.getElementById("candidateGrid");
  candidates.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "candidate-btn";
    btn.id = "cand-" + i;
    btn.innerHTML = `
      <div class="c-name">${esc(c.name)}</div>
      <div class="c-role">${esc(c.role)}</div>
      <div class="c-id">${esc(c.id)}</div>
    `;
    btn.addEventListener("click", () => selectCandidate(i));
    grid.appendChild(btn);
  });
}

function selectCandidate(i) {
  selected = candidates[i];
  document.querySelectorAll(".candidate-btn").forEach((b, j) => {
    b.classList.toggle("selected", j === i);
  });
  parsed = { P: null, AI: null, D: null };
  resetFields();
  document.getElementById("parseBtn").disabled = false;
  document.getElementById("notesInput").value = selected.notes || "";
  setStatus("green", `${selected.name} selected · ${selected.id}`);
  renderEmail();
}

function setStatus(color, text) {
  document.getElementById("statusDot").className = "dot" + (color ? " " + color : "");
  document.getElementById("statusText").textContent = text;
}

function resetFields() {
  ["P", "AI", "D"].forEach(f => {
    const el = document.getElementById("field" + f);
    el.textContent = "Not yet parsed";
    el.className   = "field-val empty";
  });
}

function renderEmail() {
  const preview = document.getElementById("emailPreview");

  if (!selected) {
    preview.innerHTML = `<p class="empty-state">Select a candidate and parse notes to see the completed email.</p>`;
    disableEdit(preview);
    return;
  }

  const fname    = esc(selected.name.split(" ")[0]);
  const lastName = esc((selected.name.split(" ")[1] ?? "").toLowerCase());
  const recordId = esc(selected.id);
  const role     = esc(selected.role);

  const pSpan  = parsed.P
    ? `<span class="highlight green">${esc(parsed.P)}</span>`
    : `<span class="highlight empty">[positive quality — parse notes to fill]</span>`;

  const aiSpan = parsed.AI
    ? `<span class="highlight amber">${esc(parsed.AI)}</span>`
    : `<span class="highlight empty">[area for improvement — parse notes to fill]</span>`;

  const dSpan  = parsed.D
    ? `<span class="highlight blue">${esc(parsed.D)}</span>`
    : `<span class="highlight empty">[development tip — parse notes to fill]</span>`;

  preview.innerHTML = `
    <div class="email-meta">
      Record ID: ${recordId} &nbsp;·&nbsp; ${role} &nbsp;·&nbsp; To: ${fname.toLowerCase()}.${lastName}@example.com
    </div>
    ${(() => {
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
      return paragraphs;
    })()}
  `;

  if (parsed.P || parsed.AI || parsed.D) {
    enableEdit(preview);
  } else {
    disableEdit(preview);
  }
}

// ─── Parse ───────────────────────────────────────
async function runParse() {
  const notes = document.getElementById("notesInput").value.trim();
  if (!notes || !selected) return;

  if (isDailyLimitHit()) {
    setStatus("amber", `Daily limit of ${DAILY_LIMIT} parses reached — try again tomorrow`);
    return;
  }

  if (trialUsesLeft() === 0) {
    showModal();
    return;
  }

  const btn = document.getElementById("parseBtn");
  btn.disabled = true;
  setStatus("blue", "Parsing notes with Claude…");
  resetFields();

  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-By": "rea" },
      body: JSON.stringify({ notes })
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || "API error");

    parsed = { P: result.P || null, AI: result.AI || null, D: result.D || null };

    ["P", "AI", "D"].forEach(f => {
      const el = document.getElementById("field" + f);
      if (parsed[f]) { el.textContent = parsed[f]; el.className = "field-val"; }
      else { el.textContent = "Could not extract from notes"; el.className = "field-val empty"; }
    });

    recordUse();

    const left = trialUsesLeft();
    if (!isSignedIn() && isFinite(left)) {
      const noun = left === 1 ? "parse" : "parses";
      setStatus("green", `Parsed · ${selected.id} · ${left} free ${noun} remaining`);
    } else {
      setStatus("green", `Parsed successfully · ${selected.id}`);
    }

    renderEmail();

  } catch (err) {
    setStatus("amber", "Error: " + err.message);
  }

  btn.disabled = false;
}

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
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy email'; }, 1500);
  }).catch(() => {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy email'; }, 1500);
  });
}

// ─── Scan ────────────────────────────────────────
function runScan() {
  document.getElementById("photoInput").click();
}

document.getElementById("photoInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const btn = document.getElementById("scanBtn");

  if (!file.type.startsWith("image/")) {
    setStatus("amber", "Error: please select an image file");
    return;
  }

  btn.disabled = true;
  document.getElementById("notesInput").disabled = true;
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
      headers: { "Content-Type": "application/json", "X-Requested-By": "rea" },
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
  document.getElementById("notesInput").disabled = false;
  e.target.value = ""; // reset so same file can be re-selected
});

buildCandidateGrid();
buildTemplatePills();
document.getElementById("templateBodyInput")?.addEventListener("input", onTemplateBodyInput);
renderEmail();
