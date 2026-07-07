// ===== src/supabase.jsx =====
// Supabase client + clinic branding + custom sections store.
// Runs before every other file so window.SB, window.CLINIC, and
// window.CUSTOM_SECTIONS are available to Sidebar / SettingsPage / App.
//
// Falls back to localStorage transparently if Supabase env is not set,
// so the app remains fully functional offline / in demo mode.

// ── Config ────────────────────────────────────────────────────
const SUPABASE_URL = window.SUPABASE_URL || "https://yjtyvtyqyiqnqdctxpyz.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_doulZchKq9zleY_fTGhq-Q_5l3KTAv9";
const LS_CLINIC = "kinetic.clinic";
const LS_SECTIONS = "kinetic.sections";
const LS_BRANCHES = "kinetic.branches";
const LS_ACTIVE_BRANCH = "kinetic.active_branch";

// ── Supabase client (nullable) ────────────────────────────────
// Demo mode (?demo=1) forces the localStorage fallback so the app stays
// interactive without a live Supabase backend (schema/RLS may not match).
function __isDemo() {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; }
  catch { return false; }
}
let sb = null;
if (!__isDemo() && SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
window.SB = sb;

// ── Default clinic branding ───────────────────────────────────
const DEFAULT_CLINIC = {
  name: "كينيتك",
  subtitle: "نظام العيادة",
  logo: null,           // data-URL when uploaded
  primary: "#7BBDE8",
};

// ── Default custom sections (empty) ───────────────────────────
const DEFAULT_SECTIONS = [];

// ── Local persistence helpers ─────────────────────────────────
function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { console.warn("readLS failed", key, e); return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn("writeLS failed", key, e); }
}
// Escape untrusted text for interpolation into HTML.
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Clinic branding: load / save ──────────────────────────────
async function loadClinic() {
  if (sb) {
    const { data, error } = await sb.from("clinic_settings").select("*").limit(1).single();
    if (!error && data) {
      const merged = { ...DEFAULT_CLINIC, ...data };
      window.CLINIC = merged;
      writeLS(LS_CLINIC, merged);
      return merged;
    }
  }
  const cached = readLS(LS_CLINIC, DEFAULT_CLINIC);
  window.CLINIC = cached;
  return cached;
}

async function saveClinic(patch) {
  const next = { ...(window.CLINIC || DEFAULT_CLINIC), ...patch, updated_at: new Date().toISOString() };
  window.CLINIC = next;
  writeLS(LS_CLINIC, next);
  if (sb) {
    // Upsert on singleton row id=1
    await sb.from("clinic_settings").upsert({ id: 1, ...next });
  }
  window.dispatchEvent(new CustomEvent("kinetic:clinic-updated", { detail: next }));
  return next;
}

// ── Custom sections: load / save / add / remove / update ──────
async function loadSections() {
  if (sb) {
    const { data, error } = await sb.from("custom_sections").select("*").order("position", { ascending: true });
    if (!error && Array.isArray(data)) {
      window.CUSTOM_SECTIONS = data;
      writeLS(LS_SECTIONS, data);
      return data;
    }
  }
  const cached = readLS(LS_SECTIONS, DEFAULT_SECTIONS);
  window.CUSTOM_SECTIONS = cached;
  return cached;
}

function nextSectionId() {
  return "sec_" + Math.random().toString(36).slice(2, 9);
}

async function addSection(section) {
  const list = window.CUSTOM_SECTIONS || [];
  // Slug collision guard: schema enforces UNIQUE on custom_sections.slug.
  const baseSlug = (section.slug || section.label || "")
    .toString().trim().toLowerCase()
    .replace(/\s+/g, "-").replace(/[^a-z0-9\-_\u0600-\u06FF]/g, "") || "section";
  const existing = new Set(list.map(s => s.slug));
  let slug = baseSlug, n = 2;
  while (existing.has(slug)) { slug = `${baseSlug}-${n++}`; }
  const item = {
    id: section.id || nextSectionId(),
    slug,
    label: section.label || "قسم جديد",
    icon: section.icon || "Layers",
    group: section.group || "مخصص",
    description: section.description || "",
    content: section.content || "",
    position: section.position ?? list.length,
    visible: section.visible !== false,
    created_at: new Date().toISOString(),
  };
  const next = [...list, item];
  window.CUSTOM_SECTIONS = next;
  writeLS(LS_SECTIONS, next);
  if (sb) {
    const { error } = await sb.from("custom_sections").insert(item);
    if (error) console.warn("addSection insert failed", error);
  }
  window.dispatchEvent(new CustomEvent("kinetic:sections-updated", { detail: next }));
  return item;
}

async function updateSection(id, patch) {
  const list = window.CUSTOM_SECTIONS || [];
  const next = list.map(s => s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s);
  window.CUSTOM_SECTIONS = next;
  writeLS(LS_SECTIONS, next);
  if (sb) await sb.from("custom_sections").update(patch).eq("id", id);
  window.dispatchEvent(new CustomEvent("kinetic:sections-updated", { detail: next }));
}

async function removeSection(id) {
  const list = window.CUSTOM_SECTIONS || [];
  const next = list.filter(s => s.id !== id);
  window.CUSTOM_SECTIONS = next;
  writeLS(LS_SECTIONS, next);
  if (sb) await sb.from("custom_sections").delete().eq("id", id);
  window.dispatchEvent(new CustomEvent("kinetic:sections-updated", { detail: next }));
}

// ── Branches (multi-branch support, LS-backed) ────────────────
const DEFAULT_BRANCHES = [
  { id: "br_heliopolis", name: "فرع مصر الجديدة", therapists: 4, rooms: 5, address: "14 ش صلاح سالم، مصر الجديدة، القاهرة", phone: "+20 2 2638 1100" },
];

function nextBranchId() {
  return "br_" + Math.random().toString(36).slice(2, 9);
}

async function loadBranches() {
  if (sb) {
    const { data, error } = await sb.from("branches").select("*").order("created_at", { ascending: true });
    if (!error && Array.isArray(data) && data.length) {
      window.BRANCHES = data;
      writeLS(LS_BRANCHES, data);
      window.dispatchEvent(new CustomEvent("kinetic:branches-updated", { detail: data }));
      return data;
    }
    if (error) console.warn("loadBranches failed", error.message || error);
  }
  const cached = readLS(LS_BRANCHES, DEFAULT_BRANCHES);
  window.BRANCHES = cached;
  return cached;
}

async function addBranch(branch) {
  const list = window.BRANCHES || [];
  const item = {
    id: branch.id || nextBranchId(),
    name: (branch.name || "فرع جديد").trim(),
    therapists: Number(branch.therapists) || 0,
    rooms: Number(branch.rooms) || 0,
    address: branch.address || "",
    phone: branch.phone || "",
    created_at: new Date().toISOString(),
  };
  const next = [...list, item];
  window.BRANCHES = next;
  writeLS(LS_BRANCHES, next);
  if (sb) {
    const { error } = await sb.from("branches").insert(item);
    if (error) console.warn("addBranch insert failed", error.message || error);
  }
  window.dispatchEvent(new CustomEvent("kinetic:branches-updated", { detail: next }));
  return item;
}

async function updateBranch(id, patch) {
  const list = window.BRANCHES || [];
  const cleanPatch = { ...patch, updated_at: new Date().toISOString() };
  if (cleanPatch.therapists !== undefined) cleanPatch.therapists = Number(cleanPatch.therapists) || 0;
  if (cleanPatch.rooms !== undefined) cleanPatch.rooms = Number(cleanPatch.rooms) || 0;
  if (typeof cleanPatch.name === "string") cleanPatch.name = cleanPatch.name.trim();
  const next = list.map(b => b.id === id ? { ...b, ...cleanPatch } : b);
  window.BRANCHES = next;
  writeLS(LS_BRANCHES, next);
  if (sb) {
    const { error } = await sb.from("branches").update(cleanPatch).eq("id", id);
    if (error) console.warn("updateBranch failed", error.message || error);
  }
  window.dispatchEvent(new CustomEvent("kinetic:branches-updated", { detail: next }));
  return next.find(b => b.id === id);
}

function setActiveBranch(id) {
  const list = window.BRANCHES || [];
  if (!list.some(b => b.id === id)) return;
  window.ACTIVE_BRANCH_ID = id;
  writeLS(LS_ACTIVE_BRANCH, id);
  window.dispatchEvent(new CustomEvent("kinetic:branches-updated", { detail: { activeId: id } }));
}

async function removeBranch(id) {
  const list = window.BRANCHES || [];
  if (list.length <= 1) return; // never allow removing the last branch
  const next = list.filter(b => b.id !== id);
  window.BRANCHES = next;
  writeLS(LS_BRANCHES, next);
  if (window.ACTIVE_BRANCH_ID === id) {
    window.ACTIVE_BRANCH_ID = next[0].id;
    writeLS(LS_ACTIVE_BRANCH, next[0].id);
  }
  if (sb) {
    const { error } = await sb.from("branches").delete().eq("id", id);
    if (error) console.warn("removeBranch failed", error.message || error);
  }
  window.dispatchEvent(new CustomEvent("kinetic:branches-updated", { detail: next }));
}

// ── Kick off initial hydration (fire-and-forget, but log failures) ─
window.CLINIC = readLS(LS_CLINIC, DEFAULT_CLINIC);
window.CUSTOM_SECTIONS = readLS(LS_SECTIONS, DEFAULT_SECTIONS);
window.BRANCHES = readLS(LS_BRANCHES, DEFAULT_BRANCHES);
window.ACTIVE_BRANCH_ID = readLS(LS_ACTIVE_BRANCH, window.BRANCHES[0]?.id || null);
loadClinic().catch(e => console.warn("loadClinic failed", e));
loadSections().catch(e => console.warn("loadSections failed", e));
loadBranches().catch(e => console.warn("loadBranches failed", e));

// ══════════════════════════════════════════════════════════════
// Supabase Auth wrappers (PRD 4.3)
// ══════════════════════════════════════════════════════════════
async function signInEmail(email, password) {
  if (!sb) return { ok: false, error: "supabase-not-configured" };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  let role = null, staffRow = null;
  const uid = data.user && data.user.id;
  const meta = (data.user && data.user.user_metadata) || {};
  role = meta.role || null;
  if (uid) {
    const q = await sb.from("staff").select("*").eq("auth_uid", uid).maybeSingle();
    if (!q.error && q.data) { staffRow = q.data; role = role || q.data.role; }
  }
  return { ok: true, session: data.session, user: data.user, role, staff: staffRow };
}

async function signOut() {
  if (sb) await sb.auth.signOut();
  // Clear identity + any cached role-scoped domain data so the next login
  // doesn't see the previous session's patients/appts/etc.
  window.ME = null;
  try {
    for (const cfg of Object.values(DATA_TABLES)) {
      localStorage.removeItem(cfg.ls);
      if (window.DATA) window.DATA[friendlyName(cfg.key)] = [];
    }
  } catch (e) { console.warn("signOut cache clear failed", e); }
  window.dispatchEvent(new CustomEvent("kinetic:data-updated", { detail: { table: "*" } }));
}

async function getSession() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session || null;
}

function onAuthChange(cb) {
  if (!sb) return () => {};
  const sub = sb.auth.onAuthStateChange((_evt, session) => cb(session));
  return () => sub.data.subscription.unsubscribe();
}

// ══════════════════════════════════════════════════════════════
// Voice dictation (PRD 9.3) — single shared helper
// Usage: const stop = startDictation({ onText, lang, onEnd })
// Call stop() to abort mid-recognition (e.g. component unmount).
// ══════════════════════════════════════════════════════════════
function startDictation(opts) {
  const { onText, lang = "ar-EG", onEnd } = opts || {};
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (window.showToast) window.showToast("المتصفح لا يدعم الإملاء الصوتي", "error");
    return () => {};
  }
  const r = new SR();
  r.lang = lang;
  r.continuous = false;
  r.interimResults = false;
  let aborted = false;
  r.onresult = (e) => {
    try { onText && onText(e.results[0][0].transcript); }
    catch (err) { console.warn("dictation onText failed", err); }
  };
  r.onerror = (e) => {
    if (!aborted && window.showToast) window.showToast("خطأ في الإملاء الصوتي", "error");
    console.warn("dictation error", e && e.error);
  };
  r.onend = () => { onEnd && onEnd(); };
  try { r.start(); }
  catch (e) { console.warn("dictation start failed", e); return () => {}; }
  if (window.showToast) window.showToast("الإملاء الصوتي نشط…", "success");
  return () => { aborted = true; try { r.abort(); } catch {} };
}

// ══════════════════════════════════════════════════════════════
// Print / PDF helper (PRD 5.11)
// Opens a print window with brand chrome; user picks "Save as PDF"
// ══════════════════════════════════════════════════════════════
// title is treated as UNTRUSTED text (escaped). bodyHtml is treated as
// pre-sanitized HTML — callers MUST escape any user-controlled substrings.
function printHTML(title, bodyHtml) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { if (window.showToast) window.showToast("متصفح النافذة المنبثقة محجوب", "error"); return; }
  const brand = escHtml((window.CLINIC && window.CLINIC.name) || "Kinetic");
  const safeTitle = escHtml(title);
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>
    <title>${safeTitle}</title>
    <style>
      body{font-family:'IBM Plex Sans Arabic', system-ui, sans-serif; color:#0F1E2B; padding:32px; background:#fff}
      h1{font-size:20px;margin:0 0 4px}
      .sub{color:#647686;font-size:12px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse;font-size:12.5px}
      th,td{border-bottom:1px solid #EEF2F6;padding:8px 10px;text-align:right}
      th{background:#F7F9FB;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.04em;color:#647686}
      @media print { .no-print{display:none} body{padding:12px} }
    </style></head><body>
    <h1>${brand} — ${safeTitle}</h1>
    <div class="sub">${escHtml(new Date().toLocaleString("ar-EG"))}</div>
    ${bodyHtml || ""}
    <div class="no-print" style="margin-top:24px"><button onclick="window.print()">طباعة / حفظ PDF</button></div>
    </body></html>`);
  w.document.close();
  // Wait for load rather than fixed 250ms; falls back to timeout for older browsers.
  const doPrint = () => { try { w.focus(); w.print(); } catch (e) { console.warn("print failed", e); } };
  if (w.document.readyState === "complete") doPrint();
  else {
    w.addEventListener("load", doPrint, { once: true });
    setTimeout(doPrint, 800);
  }
}

// ══════════════════════════════════════════════════════════════
// Domain data API (PRD Section 6)
// Same LS-fallback pattern used for clinic branding. Each table
// mirrors to `window.DATA[key]` so existing UI keeps working.
// ══════════════════════════════════════════════════════════════
// The client uses friendly names ("appts", "payments") while the DB uses
// canonical names ("bookings", "invoices"). Seeds use `id` as a legacy PK;
// we translate to the real PK column on every read/write so LS and DB stay
// in sync and Supabase never sees a stray `id` column.
// `cols` whitelists which columns to actually send to Supabase — anything
// else in the row is UI-only seed metadata (patient name, doctor, room…)
// that would trip PGRST204 on the strict schema.
const DATA_TABLES = {
  patients:   { key: "patients",   pk: "patient_id",  ls: "kinetic.patients",
                cols: ["patient_id","name","phone","age","gender","diagnosis","notes","created_at"] },
  appts:      { key: "bookings",   pk: "booking_id",  ls: "kinetic.bookings",
                cols: ["booking_id","patient_id","therapist_id","date","time","status","notes","created_at"] },
  sessions:   { key: "sessions",   pk: "session_id",  ls: "kinetic.sessions",
                cols: ["session_id","patient_id","therapist_id","date","pain_score","session_notes","session_number","created_at"] },
  payments:   { key: "invoices",   pk: "invoice_id",  ls: "kinetic.invoices",
                cols: ["invoice_id","patient_id","amount","paid","payment_method","status","created_at"] },
  staff:      { key: "staff",      pk: "staff_id",    ls: "kinetic.staff",
                cols: ["staff_id","name","role","phone","email","auth_uid"] },
  therapists: { key: "therapists", pk: "id",          ls: "kinetic.therapists",
                cols: ["id","name","spec","load","max","color"] },
  packages:   { key: "packages",   pk: "id",          ls: "kinetic.packages",
                cols: ["id","name","sessions","price","active","popular","color","sold"] },
  campaigns:  { key: "campaigns",  pk: "id",          ls: "kinetic.campaigns",
                cols: ["id","name","audience","sent","read","replied","status","template","schedule","best"] },
};

// Map a DATA_TABLES key back to its window.DATA.* alias. Two friendly names
// diverge from the DB name (bookings→appts, invoices→payments); everything
// else matches. Used by signOut cache clear.
function friendlyName(key) {
  if (key === "bookings") return "appts";
  if (key === "invoices") return "payments";
  return key;
}

// Legacy alias: some seeds use `id` instead of the real PK. Read PK from
// either, prefer the real one.
function pkOf(cfg, row) {
  return row[cfg.pk] != null ? row[cfg.pk] : row.id;
}

async function listTable(name) {
  const cfg = DATA_TABLES[name];
  if (!cfg) return [];
  if (sb) {
    const { data, error } = await sb.from(cfg.key).select("*");
    // On success (no error), trust the server — even if the response is [].
    // That way a deleted row on the server actually clears the LS cache.
    if (!error && Array.isArray(data)) {
      writeLS(cfg.ls, data);
      return data;
    }
    if (error) console.warn(`listTable ${name} failed`, error.message || error);
  }
  return readLS(cfg.ls, (window.DATA && window.DATA[name]) || []);
}

async function upsertRow(name, row) {
  const cfg = DATA_TABLES[name];
  if (!cfg) throw new Error("unknown table: " + name);
  const list = (window.DATA && window.DATA[name]) || readLS(cfg.ls, []);

  // Normalize: ensure the row carries both the real PK and the legacy `id`
  // (some UI code still filters/matches on `id`).
  const pk = pkOf(cfg, row);
  const normalized = { ...row };
  if (pk != null) { normalized[cfg.pk] = pk; normalized.id = pk; }

  const idx = list.findIndex(r => pkOf(cfg, r) === pk);
  const next = idx === -1
    ? [...list, normalized]
    : list.map((r, i) => i === idx ? { ...r, ...normalized } : r);
  if (window.DATA) window.DATA[name] = next;
  writeLS(cfg.ls, next);

  if (sb) {
    // Only send columns the DB knows about.
    const dbRow = {};
    for (const c of cfg.cols) {
      if (normalized[c] !== undefined) dbRow[c] = normalized[c];
    }
    if (dbRow[cfg.pk] == null) {
      console.warn(`upsertRow ${name}: missing PK ${cfg.pk}`, row);
    } else {
      const { error } = await sb.from(cfg.key).upsert(dbRow, { onConflict: cfg.pk });
      if (error) console.warn(`upsertRow ${name} failed`, error.message || error);
    }
  }
  window.dispatchEvent(new CustomEvent("kinetic:data-updated", { detail: { table: name } }));
  return normalized;
}

async function removeRow(name, id) {
  const cfg = DATA_TABLES[name];
  if (!cfg) return;
  const list = (window.DATA && window.DATA[name]) || readLS(cfg.ls, []);
  const next = list.filter(r => pkOf(cfg, r) !== id);
  if (window.DATA) window.DATA[name] = next;
  writeLS(cfg.ls, next);
  if (sb) {
    const { error } = await sb.from(cfg.key).delete().eq(cfg.pk, id);
    if (error) console.warn(`removeRow ${name} failed`, error.message || error);
  }
  window.dispatchEvent(new CustomEvent("kinetic:data-updated", { detail: { table: name } }));
}

// Hydrate domain tables from Supabase (if configured) into window.DATA
// on boot. Non-blocking: seed data renders first, real data swaps in.
async function hydrateDomainTables() {
  if (!sb) return;
  for (const name of Object.keys(DATA_TABLES)) {
    try {
      const rows = await listTable(name);
      if (rows && rows.length && window.DATA) window.DATA[name] = rows;
    } catch (e) { console.warn("hydrate", name, "failed", e); }
  }
  window.dispatchEvent(new CustomEvent("kinetic:data-updated", { detail: { table: "*" } }));
}
setTimeout(() => hydrateDomainTables().catch(e => console.warn("hydrate failed", e)), 0);

const KineticData = {
  list: listTable,
  upsert: upsertRow,
  remove: removeRow,
  tables: DATA_TABLES,
};

// ── Public API ────────────────────────────────────────────────
Object.assign(window, {
  loadClinic, saveClinic,
  loadSections, addSection, updateSection, removeSection,
  loadBranches, addBranch, updateBranch, setActiveBranch, removeBranch,
  signInEmail, signOut, getSession, onAuthChange,
  startDictation, printHTML, escHtml,
  KineticData,
});
