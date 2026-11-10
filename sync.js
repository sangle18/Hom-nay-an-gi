"use strict";
// =====================================================================
// Đồng bộ 2 điện thoại qua Firestore (REST API + đăng nhập ẩn danh).
// Không dùng SDK ngoài → giữ CSP chặt (chỉ mở connect-src tới 3 domain Google).
// Cả hai máy dùng chung một "mã gia đình" ngẫu nhiên 24 ký tự (~120 bit).
// Dùng biến/hàm của app.js: dishes, history, plans, meta, persist, save, refreshUI…
// =====================================================================
const SYNC_KEY = "hnag.sync";
const AUTH_KEY = "hnag.auth";
const CODE_RE = /^[a-z0-9]{24}$/;
const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // 32 ký tự, bỏ l/o/0/1 dễ nhầm
const MAX_DOC = 900_000;

const syncState = { timer: null, busy: false, lastAt: 0, error: "" };
let syncCfg = store.get(SYNC_KEY, {}) || {};
if (!CODE_RE.test(syncCfg.code || "")) syncCfg = {};

const syncConfigured = () =>
  typeof SYNC_CONFIG === "object" &&
  /^[A-Za-z0-9_-]{20,60}$/.test(SYNC_CONFIG.apiKey || "") &&
  /^[a-z0-9-]{4,40}$/.test(SYNC_CONFIG.projectId || "");

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % 32]).join("");
}
const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

// ---------- Dữ liệu: chụp, làm sạch, gộp ----------
function snapshot() { return { v: 1, dishes, history, plans, meta }; }

function cleanSnapshot(x) {
  if (!x || typeof x !== "object") return null;
  return {
    dishes: dedupe((Array.isArray(x.dishes) ? x.dishes : []).slice(0, 500).map(cleanDish)),
    history: (Array.isArray(x.history) ? x.history : []).slice(-1000).map(cleanHistory).filter(Boolean),
    plans: Object.fromEntries(Object.keys(PERIODS).map((p) => [p, cleanPlan(x.plans && x.plans[p])])),
    meta: cleanMeta(x.meta),
  };
}

/**
 * Gộp hai bản dữ liệu, không mất thay đổi của bên nào:
 * - Món: theo tên, bản sửa sau (u lớn hơn) thắng; món đã xoá (tombstone) bị bỏ trừ khi được thêm lại sau đó.
 * - Lịch sử: hợp hai bên, bỏ trùng; bỏ các bữa trước lần "Xoá lịch sử" gần nhất.
 * - Thực đơn: mỗi khoảng thời gian lấy bản tạo/sửa sau.
 */
function mergeSnap(a, b) {
  const tomb = { ...a.meta.deletedDishes };
  for (const [k, v] of Object.entries(b.meta.deletedDishes)) tomb[k] = Math.max(tomb[k] || 0, v);
  const cleared = Math.max(a.meta.historyClearedAt, b.meta.historyClearedAt);

  const byName = new Map();
  for (const d of [...a.dishes, ...b.dishes]) {
    const k = d.name.toLowerCase();
    const cur = byName.get(k);
    if (!cur || d.u > cur.u) byName.set(k, d);
  }
  const mergedDishes = [...byName].filter(([k, d]) => !(tomb[k] && tomb[k] >= d.u)).map(([, d]) => d);

  const seen = new Set();
  const hist = [];
  for (const x of [...a.history, ...b.history]) {
    const k = `${x.at}|${x.name}`;
    if (x.at > cleared && !seen.has(k)) { seen.add(k); hist.push(x); }
  }
  hist.sort((p, q) => p.at - q.at);

  const mergedPlans = {};
  for (const p of Object.keys(PERIODS)) {
    const x = a.plans[p], y = b.plans[p];
    mergedPlans[p] = !x ? y : !y ? x : (y.u > x.u ? y : x);
  }
  return { dishes: mergedDishes, history: hist.slice(-500), plans: mergedPlans, meta: { deletedDishes: tomb, historyClearedAt: cleared } };
}

function applySnap(s) {
  dishes = s.dishes;
  history = s.history;
  plans = s.plans;
  meta = s.meta;
  persist();
  refreshUI();
}

// ---------- Firebase REST ----------
async function idToken(forceNew = false) {
  let a = forceNew ? null : store.get(AUTH_KEY, null);
  const now = Date.now();
  if (a && typeof a.idToken === "string" && a.exp > now + 60_000) return a.idToken;
  const key = encodeURIComponent(SYNC_CONFIG.apiKey);
  if (a && typeof a.refreshToken === "string") {
    const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: a.refreshToken }),
    });
    if (r.ok) {
      const j = await r.json();
      a = { idToken: j.id_token, refreshToken: j.refresh_token, exp: now + Number(j.expires_in) * 1000 };
      store.set(AUTH_KEY, a);
      return a.idToken;
    }
  }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!r.ok) throw new Error(`Không đăng nhập được Firebase (${r.status}). Đã bật Anonymous sign-in chưa?`);
  const j = await r.json();
  a = { idToken: j.idToken, refreshToken: j.refreshToken, exp: now + Number(j.expiresIn) * 1000 };
  store.set(AUTH_KEY, a);
  return a.idToken;
}

const docUrl = () =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(SYNC_CONFIG.projectId)}` +
  `/databases/(default)/documents/households/${syncCfg.code}`;

async function getRemote(token) {
  const r = await fetch(docUrl(), { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (r.status === 401) throw Object.assign(new Error("auth"), { retryAuth: true });
  if (!r.ok) throw new Error(`Không đọc được dữ liệu (${r.status})`);
  const j = await r.json();
  return { data: j.fields?.data?.stringValue || "", updateTime: j.updateTime };
}

/** Ghi có điều kiện: chỉ ghi nếu bản trên mây chưa bị máy kia đổi. Trả false nếu xung đột. */
async function putRemote(token, dataStr, updateTime) {
  const cond = updateTime
    ? `currentDocument.updateTime=${encodeURIComponent(updateTime)}`
    : "currentDocument.exists=false";
  const r = await fetch(`${docUrl()}?${cond}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { data: { stringValue: dataStr }, updatedAt: { integerValue: String(Date.now()) } } }),
  });
  if (r.ok) return true;
  if ([400, 409, 412].includes(r.status)) return false;
  if (r.status === 401) throw Object.assign(new Error("auth"), { retryAuth: true });
  throw new Error(`Không ghi được dữ liệu (${r.status})`);
}

async function syncNow() {
  if (!syncConfigured() || !syncCfg.code || syncState.busy) return;
  if (!navigator.onLine) { syncState.error = "Đang offline — sẽ đồng bộ khi có mạng."; renderSyncStatus(); return; }
  syncState.busy = true;
  syncState.error = "";
  renderSyncStatus();
  let forceNew = false;
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const token = await idToken(forceNew);
        const remote = await getRemote(token);
        const local = cleanSnapshot(snapshot());
        const remoteSnap = remote ? cleanSnapshot(safeParse(remote.data)) : null;
        const merged = remoteSnap ? mergeSnap(local, remoteSnap) : local;
        const mergedStr = JSON.stringify(merged);
        if (mergedStr !== JSON.stringify(local)) applySnap(merged);
        if (remoteSnap && mergedStr === JSON.stringify(remoteSnap)) break; // đã giống nhau
        if (mergedStr.length > MAX_DOC) throw new Error("Dữ liệu quá lớn để đồng bộ.");
        if (await putRemote(token, mergedStr, remote?.updateTime)) break;
        // xung đột: máy kia vừa ghi → đọc lại và gộp tiếp
      } catch (e) {
        if (e.retryAuth && !forceNew) { forceNew = true; continue; }
        throw e;
      }
    }
    syncState.lastAt = Date.now();
  } catch (e) {
    syncState.error = String(e.message || e).slice(0, 160);
  } finally {
    syncState.busy = false;
    renderSyncStatus();
  }
}

/** Gọi từ save() của app.js — gom nhiều thay đổi liên tiếp thành 1 lần đồng bộ. */
function scheduleSync() {
  if (!syncConfigured() || !syncCfg.code) return;
  clearTimeout(syncState.timer);
  syncState.timer = setTimeout(syncNow, 1500);
}

// ---------- Giao diện ----------
function renderSyncStatus() {
  const dot = $("#sync-dot");
  const on = syncConfigured() && !!syncCfg.code;
  dot.className = "dot" + (!on ? "" : syncState.error ? " err" : syncState.busy ? " busy" : " ok");
  let msg;
  if (!syncConfigured()) msg = "Đồng bộ online chưa bật: cần điền Firebase vào sync-config.js (xem README). Bạn vẫn dùng được sao lưu bằng file bên dưới.";
  else if (!syncCfg.code) msg = "Chưa kết nối. Tạo mã trên 1 máy, rồi nhập mã đó trên máy còn lại.";
  else if (syncState.busy) msg = "Đang đồng bộ…";
  else if (syncState.error) msg = `⚠️ ${syncState.error}`;
  else if (syncState.lastAt) msg = `✅ Đã đồng bộ lúc ${new Date(syncState.lastAt).toLocaleTimeString("vi-VN")}`;
  else msg = "Đã kết nối.";
  $("#sync-status").textContent = msg;
}

function renderSync() {
  const on = !!syncCfg.code;
  $("#sync-off").classList.toggle("hidden", on || !syncConfigured());
  $("#sync-on").classList.toggle("hidden", !on || !syncConfigured());
  $("#sync-code").textContent = on ? syncCfg.code.replace(/(.{4})(?=.)/g, "$1 ") : "";
  renderSyncStatus();
}

function connect(code) {
  syncCfg = { code };
  store.set(SYNC_KEY, syncCfg);
  renderSync();
  syncNow();
}

$("#sync-create").addEventListener("click", () => connect(newCode()));
$("#sync-join").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("#sync-code-in").value.toLowerCase().replace(/[\s-]/g, "");
  if (!CODE_RE.test(code)) { alert("Mã không đúng: cần 24 ký tự chữ thường và số."); return; }
  $("#sync-code-in").value = "";
  connect(code);
});
$("#sync-now").addEventListener("click", syncNow);
$("#sync-leave").addEventListener("click", () => {
  if (!confirm("Ngắt đồng bộ trên máy này? Dữ liệu trên máy vẫn giữ nguyên.")) return;
  syncCfg = {};
  store.set(SYNC_KEY, syncCfg);
  syncState.error = "";
  syncState.lastAt = 0;
  renderSync();
});
$("#sync-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(syncCfg.code);
    $("#sync-copy").textContent = "✓ Đã chép";
    setTimeout(() => ($("#sync-copy").textContent = "📋 Chép"), 1500);
  } catch {
    alert(`Mã của bạn: ${syncCfg.code}`);
  }
});

// ---------- Sao lưu bằng file (không cần mạng) ----------
$("#backup-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "hom-nay-an-gi", ...snapshot() })], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: `hom-nay-an-gi-${todayKey()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("#backup-import").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.size > 2_000_000) { alert("File quá lớn."); return; }
  const parsed = safeParse(await file.text());
  const snap = parsed && parsed.app === "hom-nay-an-gi" ? cleanSnapshot(parsed) : null;
  if (!snap) { alert("File không đúng định dạng sao lưu của app."); return; }
  applySnap(mergeSnap(cleanSnapshot(snapshot()), snap));
  save();
  alert(`Đã gộp dữ liệu: ${snap.dishes.length} món, ${snap.history.length} bữa đã ăn.`);
});

// ---------- Khởi động ----------
// syncNow() tự bỏ qua khi chưa cấu hình / chưa có mã, nên gắn listener luôn.
renderSyncStatus();
setTimeout(syncNow, 300);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", syncNow);
setInterval(() => { if (document.visibilityState === "visible") syncNow(); }, 120_000);
