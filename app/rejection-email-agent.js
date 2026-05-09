// Mock candidate database.
// In production, swap this for a Greenhouse API call.
const candidates = [
  { id: "REC-2847", name: "James Okafor",   role: "Customer Success Exec" },
  { id: "REC-3012", name: "Priya Sharma",   role: "Data Analyst" },
  { id: "REC-3156", name: "Tom Baxter",     role: "Sales Development Rep" },
  { id: "REC-3289", name: "Lena Müller",    role: "Product Manager" },
  { id: "REC-3301", name: "Dan Whitfield",  role: "Backend Engineer" },
  { id: "REC-3378", name: "Aisha Conteh",   role: "Marketing Executive" },
];

let selected = null;
let parsed   = { P: null, AI: null, D: null };

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
  const lastName = esc(selected.name.split(" ")[1].toLowerCase());
  const recordId = esc(selected.id);
  const role     = esc(selected.role);

  const P  = parsed.P
    ? `<span class="highlight green">${esc(parsed.P)}</span>`
    : `<span class="highlight empty">[positive quality — parse notes to fill]</span>`;

  const AI = parsed.AI
    ? `<span class="highlight amber">${esc(parsed.AI)}</span>`
    : `<span class="highlight empty">[area for improvement — parse notes to fill]</span>`;

  const D  = parsed.D
    ? `<span class="highlight blue">${esc(parsed.D)}</span>`
    : `<span class="highlight empty">[development tip — parse notes to fill]</span>`;

  preview.innerHTML = `
    <div class="email-meta">
      Record ID: ${recordId} &nbsp;·&nbsp; ${role} &nbsp;·&nbsp; To: ${fname.toLowerCase()}.${lastName}@example.com
    </div>
    <div class="email-line">Hi ${fname},</div>
    <div class="email-line">Thank you for your time interviewing with me — I really enjoyed learning about your experiences.</div>
    <div class="email-line">Unfortunately, we have decided not to proceed with your application on this occasion.</div>
    <div class="email-line">I thought that you ${P}. However, for this role we're looking for someone that can demonstrate ${AI}. This is important for success in the role and we feel other candidates have been able to demonstrate this more clearly.</div>
    <div class="email-line">I would suggest ${D}.</div>
    <div class="email-line">Feedback is important to us and we want to help you in future processes. Thanks again for your time and interest, and best of luck in your search.</div>
    <div class="email-line" style="margin-top:1.25rem;">Best wishes,<br><strong>[Recruiter name]</strong></div>
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
      headers: { "Content-Type": "application/json" },
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
    setTimeout(() => {
      btn.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Copy email';
    }, 1500);
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
  document.getElementById("notesInput").disabled = false;
  e.target.value = ""; // reset so same file can be re-selected
});

buildCandidateGrid();
renderEmail();
