"use strict";

// =====================================================================
// Tiện ích
// =====================================================================
const $ = (s) => document.querySelector(s);

/** Tạo phần tử DOM an toàn — text luôn đi qua textNode, không dùng innerHTML. */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const MEALS = ["sang", "trua", "toi"];
const MEAL_LABEL = { sang: "Sáng", trua: "Trưa", toi: "Tối" };
const MEAL_ICON = { sang: "🌅", trua: "☀️", toi: "🌙" };
const WHO = ["both", "vo", "chong"];
const WHO_LABEL = { both: "Cả hai", vo: "Vợ", chong: "Chồng" };
const LIKE_ICON = ["🚫", "🙂", "❤️"];
const PERIODS = { day: 1, week: 7, month: 30, year: 365 };
const RECENT_DAYS = 3;
const DAY_MS = 864e5;

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const todayKey = () => dateKey(new Date());
const fmtDay = (k) => parseKey(k).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

// =====================================================================
// Dữ liệu + kiểm tra hợp lệ (localStorage có thể bị sửa tay / hỏng)
// =====================================================================
const KNOWN_ICON = Object.fromEntries([...EXTRA_DISHES, ...DEFAULT_DISHES].map((d) => [d.name, d.icon]));
const iconFor = (d) => KNOWN_ICON[d.name] || TYPE_ICON[d.type] || "🍽️";
const like = (v) => ([0, 1, 2].includes(v) ? v : 1);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function cleanDish(d) {
  if (!d || typeof d !== "object") return null;
  const name = str(d.name, 60);
  if (!name) return null;
  const type = TYPES.includes(d.type) ? d.type : "Khác";
  const meals = Array.isArray(d.meals) ? MEALS.filter((m) => d.meals.includes(m)) : [];
  const icon = str(d.icon, 8) || iconFor({ name, type });
  const u = Number.isFinite(d.u) && d.u > 0 ? d.u : 0; // thời điểm sửa gần nhất (để đồng bộ)
  return { name, type, icon, vo: like(d.vo), chong: like(d.chong), meals: meals.length ? meals : [...MEALS], u };
}
function cleanHistory(x) {
  if (!x || typeof x !== "object") return null;
  const name = str(x.name, 60);
  if (!name || !Number.isFinite(x.at)) return null;
  return { name, who: WHO.includes(x.who) ? x.who : "both", meal: MEALS.includes(x.meal) ? x.meal : "trua", at: x.at };
}
function cleanPlan(p) {
  if (!p || typeof p !== "object" || !Array.isArray(p.days)) return null;
  const days = p.days
    .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d.d))
    .map((d) => ({ d: d.d, sang: str(d.sang, 60) || null, trua: str(d.trua, 60) || null, toi: str(d.toi, 60) || null }))
    .slice(0, 400);
  const u = Number.isFinite(p.u) && p.u > 0 ? p.u : 0;
  return days.length ? { who: WHO.includes(p.who) ? p.who : "both", days, u } : null;
}
/** Dữ liệu phụ cho đồng bộ: món đã xoá (tombstone) và thời điểm xoá lịch sử. */
function cleanMeta(m) {
  const out = { deletedDishes: {}, historyClearedAt: 0 };
  if (!m || typeof m !== "object") return out;
  if (m.deletedDishes && typeof m.deletedDishes === "object") {
    for (const [k, v] of Object.entries(m.deletedDishes).slice(0, 1000)) {
      const key = str(k, 60).toLowerCase();
      if (key && Number.isFinite(v) && v > 0) out.deletedDishes[key] = v;
    }
  }
  if (Number.isFinite(m.historyClearedAt) && m.historyClearedAt > 0) out.historyClearedAt = m.historyClearedAt;
  return out;
}
function dedupe(list) {
  const seen = new Set();
  return list.filter((d) => d && !seen.has(d.name.toLowerCase()) && seen.add(d.name.toLowerCase()));
}

let dishes = dedupe((store.get("hnag.dishes", null) || DEFAULT_DISHES).map(cleanDish));
if (!dishes.length) dishes = DEFAULT_DISHES.map(cleanDish);
let history = (store.get("hnag.history", []) || []).map(cleanHistory).filter(Boolean).slice(-500);
const rawPlans = store.get("hnag.plans", {}) || {};
let plans = Object.fromEntries(Object.keys(PERIODS).map((p) => [p, cleanPlan(rawPlans[p])]));
let prefs = store.get("hnag.prefs", {}) || {};
let meta = cleanMeta(store.get("hnag.meta", {}));

const state = {
  who: WHO.includes(prefs.who) ? prefs.who : "both",
  meal: mealFromClock(),
  period: PERIODS[prefs.period] ? prefs.period : "week",
  types: new Set(),
  current: null,
  skipped: new Set(),
  discover: null,
  discoverSeen: new Set(),
  spinning: false,
};

/** Ghi xuống máy (không kích hoạt đồng bộ). */
const persist = () => {
  store.set("hnag.dishes", dishes);
  store.set("hnag.history", history);
  store.set("hnag.plans", plans);
  store.set("hnag.meta", meta);
  store.set("hnag.prefs", { who: state.who, period: state.period });
};
/** Ghi xuống máy rồi hẹn đồng bộ lên mây (nếu đã bật). */
const save = () => {
  persist();
  if (typeof scheduleSync === "function") scheduleSync();
};

function mealFromClock() {
  const hr = new Date().getHours();
  return hr < 10 ? "sang" : hr < 15 ? "trua" : "toi";
}
const findDish = (name) => dishes.find((d) => d.name === name) || EXTRA_DISHES.find((d) => d.name === name);
const iconOf = (name) => findDish(name)?.icon || KNOWN_ICON[name] || "🍽️";

// =====================================================================
// Thuật toán chọn món
// =====================================================================
/** Cả hai: cả 2 phải ăn được, điểm = vo + chong. Một người: điểm của người đó. */
function score(d, who = state.who) {
  if (who === "both") return d.vo > 0 && d.chong > 0 ? d.vo + d.chong : 0;
  return d[who];
}

/** Chọn ngẫu nhiên có trọng số; món "thích" nổi trội hơn món "ăn được". */
function weightedPick(pool, weightFn) {
  const w = pool.map(weightFn);
  const total = w.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) if ((r -= w[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}

function recentNames() {
  const since = Date.now() - RECENT_DAYS * DAY_MS;
  return new Set(history.filter((x) => x.at >= since).map((x) => x.name));
}

function todayPool(avoidRecent) {
  const recent = avoidRecent ? recentNames() : new Set();
  return dishes.filter((d) =>
    d.meals.includes(state.meal) &&
    (state.types.size === 0 || state.types.has(d.type)) &&
    score(d) > 0 &&
    !state.skipped.has(d.name) &&
    !recent.has(d.name));
}

function pickToday() {
  let pool = todayPool(true), note = "";
  if (!pool.length) {
    pool = todayPool(false);
    if (pool.length) note = `Đã ăn hết món hợp lệ trong ${RECENT_DAYS} ngày qua — chọn lại món cũ nhé.`;
  }
  if (!pool.length && state.skipped.size) { state.skipped.clear(); return pickToday(); }
  if (!pool.length) return { dish: null, note: "Không có món nào phù hợp. Thử bỏ bớt bộ lọc nhé!" };
  return { dish: weightedPick(pool, (d) => score(d) ** 2), note };
}

// =====================================================================
// Tab Hôm nay
// =====================================================================
function likesText(d) {
  return `👩 ${LIKE_ICON[d.vo]}  ·  👨 ${LIKE_ICON[d.chong]}`;
}

function showDish(d) {
  $("#r-icon").textContent = d.icon;
  $("#r-name").textContent = d.name;
}

async function spin(isReroll = false) {
  if (state.spinning) return;
  if (!isReroll) state.skipped.clear();
  else if (state.current) state.skipped.add(state.current.name);

  const { dish, note } = pickToday();
  $("#hint").textContent = "";
  const card = $("#result");
  if (!dish) {
    $("#r-icon").textContent = "🤷";
    $("#r-type").textContent = "";
    $("#r-name").textContent = "Hết món rồi!";
    $("#r-likes").textContent = note;
    $("#r-actions").classList.add("hidden");
    $("#r-places").classList.add("hidden");
    state.current = null;
    return;
  }

  // Hiệu ứng "quay số"
  state.spinning = true;
  $("#spin").disabled = $("#reroll").disabled = $("#accept").disabled = true;
  card.classList.remove("landed");
  card.classList.add("spinning");
  $("#r-places").classList.add("hidden");
  const reel = dishes.filter((d) => score(d) > 0);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (let i = 0, delay = 50; !reduce && i < 14; i++, delay *= 1.15) {
    showDish(reel[Math.floor(Math.random() * reel.length)]);
    await new Promise((r) => setTimeout(r, delay));
  }
  card.classList.remove("spinning");
  void card.offsetWidth;
  card.classList.add("landed");

  state.current = dish;
  showDish(dish);
  $("#r-type").textContent = `${dish.type} · bữa ${MEAL_LABEL[state.meal].toLowerCase()} · ${WHO_LABEL[state.who]}`;
  $("#r-likes").textContent = likesText(dish);
  $("#r-actions").classList.remove("hidden");
  renderMiniPlaces(dish);
  $("#hint").textContent = note;
  state.spinning = false;
  $("#spin").disabled = $("#reroll").disabled = $("#accept").disabled = false;
}

function acceptToday() {
  if (!state.current) return;
  history.push({ name: state.current.name, who: state.who, meal: state.meal, at: Date.now() });
  history = history.slice(-500);
  save();
  $("#hint").textContent = `Đã chốt ${state.current.icon} ${state.current.name}. Chúc ngon miệng! 😋`;
  $("#r-actions").classList.add("hidden");
  $("#r-type").textContent = "Đã chốt món ✅";
  state.current = null;
}

function renderTypes() {
  const wrap = $("#types");
  wrap.replaceChildren();
  const used = new Set(dishes.map((d) => d.type));
  for (const t of TYPES.filter((x) => used.has(x))) {
    const b = h("button", {
      type: "button",
      class: state.types.has(t) ? "on" : "",
      "aria-pressed": String(state.types.has(t)),
      onclick: () => {
        state.types.has(t) ? state.types.delete(t) : state.types.add(t);
        b.classList.toggle("on");
        b.setAttribute("aria-pressed", String(state.types.has(t)));
        state.skipped.clear();
      },
    }, `${TYPE_ICON[t]} ${t}`);
    wrap.append(b);
  }
}

// ---------- Gợi ý món khác (ngoài danh sách) ----------
function nextDiscover() {
  const have = new Set(dishes.map((d) => d.name.toLowerCase()));
  const base = EXTRA_DISHES.filter((d) => !have.has(d.name.toLowerCase()) && score(d) > 0);
  if (!base.length) {
    state.discover = null;
    $("#discover-card").classList.add("hidden");
    $("#hint").textContent = "Bạn đã thêm hết các món gợi ý rồi! 🎉";
    return;
  }
  let pool = base.filter((d) => !state.discoverSeen.has(d.name));
  if (!pool.length) { state.discoverSeen.clear(); pool = base; }
  const forMeal = pool.filter((d) => d.meals.includes(state.meal));
  const d = weightedPick(forMeal.length ? forMeal : pool, (x) => score(x) ** 2);
  state.discover = d;
  state.discoverSeen.add(d.name);

  const card = $("#discover-card");
  card.classList.remove("hidden", "landed");
  void card.offsetWidth;
  card.classList.add("landed");
  $("#d-icon").textContent = d.icon;
  $("#d-type").textContent = `${d.type} · hợp bữa ${d.meals.map((m) => MEAL_LABEL[m].toLowerCase()).join(", ")}`;
  $("#d-name").textContent = d.name;
  $("#d-desc").textContent = d.desc || "";
  $("#d-likes").textContent = likesText(d);
  $("#d-add").disabled = false;
  $("#d-add").textContent = "➕ Thêm món";
}

function addDiscover() {
  const d = state.discover;
  if (!d || dishes.some((x) => x.name.toLowerCase() === d.name.toLowerCase())) return;
  dishes.push(cleanDish({ ...d, u: Date.now() }));
  save();
  renderTypes();
  $("#d-add").disabled = true;
  $("#d-add").textContent = "✓ Đã thêm";
  $("#hint").textContent = `Đã thêm ${d.icon} ${d.name} vào danh sách.`;
}

// =====================================================================
// Quán ăn (places.js) — link Google Maps tạo từ tên + địa chỉ
// =====================================================================
const placeState = { types: new Set(), parking: false, q: "", radius: 0 };

// ---------- Khu nhà & khoảng cách ----------
// Vị trí nhà chỉ lưu trên máy (localStorage), không đưa lên repo công khai và không đồng bộ.
const HOME_KEY = "hnag.home";
const validLatLng = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && la > 8 && la < 24 && lo > 102 && lo < 110;
let home = (() => {
  const x = store.get(HOME_KEY, null);
  return x && validLatLng(x.lat, x.lng) ? { lat: x.lat, lng: x.lng } : null;
})();

/** Khoảng cách đường chim bay (km). null nếu chưa đặt nhà hoặc quán chưa có toạ độ. */
function distKm(p) {
  if (!home || !validLatLng(p.lat, p.lng)) return null;
  const R = 6371, t = Math.PI / 180;
  const dLa = (p.lat - home.lat) * t, dLo = (p.lng - home.lng) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(home.lat * t) * Math.cos(p.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const byDistance = (a, b) => {
  const da = distKm(a), db = distKm(b);
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  return da - db;
};

/** Nhận "10.73, 106.73" hoặc link Google Maps bản đầy đủ (có @lat,lng hoặc !3d…!4d…). */
function parseLatLng(text) {
  const s = String(text || "").trim().slice(0, 2000);
  const m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ||
    s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
    s.match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = +m[1], lng = +m[2];
  return validLatLng(lat, lng) ? { lat, lng } : null;
}

function setHome(h) {
  // Làm tròn ~100 m: đủ để tính khoảng cách quán, không lưu vị trí chính xác của nhà.
  home = h ? { lat: Math.round(h.lat * 1000) / 1000, lng: Math.round(h.lng * 1000) / 1000 } : null;
  store.set(HOME_KEY, home);
  renderPlaces();
}

function renderHome() {
  $("#home-label").textContent = home
    ? `🏠 Khu nhà: đã đặt (${home.lat.toFixed(3)}, ${home.lng.toFixed(3)})`
    : "🏠 Chưa đặt khu nhà — đặt để xem khoảng cách";
  $("#home-clear").classList.toggle("hidden", !home);
}
const mapsQuery = (p) => encodeURIComponent(`${p.name}, ${p.address}, TP. Hồ Chí Minh`);
const mapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${mapsQuery(p)}`;
const dirUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery(p)}`;
const httpsOnly = (u) => (typeof u === "string" && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/** Quán bán đúng món trước, rồi tới quán cùng loại món. */
function placesFor(dish, limit = 3) {
  const near = (p) => { const d = distKm(p); return d == null || d <= 8; };
  const exact = PLACES.filter((p) => p.dishes.includes(dish.name) && near(p)).sort(byDistance);
  const sameType = PLACES.filter((p) => !exact.includes(p) && p.type === dish.type && near(p)).sort(byDistance);
  return [...exact, ...sameType].slice(0, limit);
}
const kmText = (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

function extLink(href, label, cls = "btn ghost small-btn") {
  const safe = httpsOnly(href);
  return safe ? h("a", { class: cls, href: safe, target: "_blank", rel: "noopener noreferrer" }, label) : null;
}

function placeCard(p) {
  return h("div", { class: "place" },
    h("div", { class: "place-head" },
      h("b", {}, p.name),
      p.g ? h("span", { class: "rating", title: `Google Maps, kiểm tra ngày ${PLACES_CHECKED}` }, `⭐ ${p.g.rating.toFixed(1)} · ${p.g.reviews.toLocaleString("vi-VN")}`) : null),
    h("p", { class: "addr" }, `📍 ${p.address}`),
    home ? h("p", { class: "dist" }, distKm(p) != null ? `📏 ~${kmText(distKm(p))} từ nhà (đường chim bay)` : "📏 Chưa có toạ độ để tính khoảng cách") : null,
    h("p", { class: "meta" },
      [p.hours ? `🕘 ${p.hours}` : null, p.parking ? PARKING_LABEL[p.parking] : null].filter(Boolean).join("  ·  ")),
    p.note ? h("p", { class: "pnote" }, p.note) : null,
    h("div", { class: "tags" }, p.dishes.map((d) => h("span", { class: "tag" }, `${iconOf(d)} ${d}`))),
    h("div", { class: "row" },
      extLink(dirUrl(p), "🗺️ Chỉ đường", "btn primary small-btn"),
      extLink(mapsUrl(p), "⭐ Đánh giá"),
      extLink(p.source, "📰 Nguồn")));
}

function renderMiniPlaces(dish) {
  const box = $("#r-places");
  const list = placesFor(dish);
  box.replaceChildren();
  if (!list.length) { box.classList.add("hidden"); return; }
  box.append(
    h("p", { class: "mini-title" }, "📍 Ăn ở đâu quanh Quận 7?"),
    ...list.map((p) => h("a", {
      class: "mini-place", href: dirUrl(p), target: "_blank", rel: "noopener noreferrer",
    },
    h("span", { class: "mp-name" }, p.name, p.g ? ` · ⭐${p.g.rating.toFixed(1)}` : "", p.parking === "oto" ? " 🚗" : ""),
    h("span", { class: "mp-addr" }, distKm(p) != null ? `~${kmText(distKm(p))} · ${p.address}` : p.address),
    h("span", { class: "mp-go", "aria-hidden": "true" }, "↗"))));
  box.classList.remove("hidden");
}

function renderPlaceTypes() {
  const wrap = $("#place-types");
  if (wrap.childElementCount) return;
  const used = TYPES.filter((t) => PLACES.some((p) => p.type === t));
  for (const t of used) {
    const b = h("button", {
      type: "button", "aria-pressed": "false",
      onclick: () => {
        placeState.types.has(t) ? placeState.types.delete(t) : placeState.types.add(t);
        b.classList.toggle("on");
        b.setAttribute("aria-pressed", String(placeState.types.has(t)));
        renderPlaces();
      },
    }, `${TYPE_ICON[t]} ${t}`);
    wrap.append(b);
  }
}

function renderPlaces() {
  renderPlaceTypes();
  // Chỉ hiện bộ lọc đậu ô tô khi có quán được xác nhận
  $("#place-parking").closest("label").classList.toggle("hidden", !PLACES.some((p) => p.parking === "oto"));
  renderHome();
  const q = fold(placeState.q.trim());
  const base = PLACES.filter((p) =>
    (placeState.types.size === 0 || placeState.types.has(p.type)) &&
    (!placeState.parking || p.parking === "oto") &&
    (!q || fold([p.name, p.address, p.dishes.join(" ")].join(" ")).includes(q)));
  let list = base;
  let hiddenNoCoord = 0;
  if (placeState.radius && home) {
    list = base.filter((p) => { const d = distKm(p); if (d == null) hiddenNoCoord++; return d != null && d <= placeState.radius; });
  }
  list = [...list].sort(byDistance);
  const wrap = $("#places");
  const items = list.map(placeCard);
  if (hiddenNoCoord) items.push(h("p", { class: "note" }, `Đã ẩn ${hiddenNoCoord} quán chưa có toạ độ. Chọn "Tất cả" để xem.`));
  wrap.replaceChildren(...(list.length || hiddenNoCoord
    ? items
    : [h("div", { class: "empty" }, h("b", {}, "🔍"), "Không có quán phù hợp.")]));
}

// =====================================================================
// Tab Thực đơn (ngày / tuần / tháng / năm)
// =====================================================================
function planPick(meal, who, exclude, avoid) {
  const pool = dishes.filter((d) => d.meals.includes(meal) && score(d, who) > 0 && !exclude.has(d.name));
  for (const recent of [avoid, avoid.slice(-3), []]) {
    const p = pool.filter((d) => !recent.includes(d.name));
    if (p.length) return p;
  }
  return pool;
}

function generatePlan(period, who) {
  const n = PERIODS[period];
  const start = new Date();
  const days = [];
  const recent = []; // tên món theo thứ tự, để tránh lặp trong ~3 ngày
  for (let i = 0; i < n; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const day = { d: dateKey(date) };
    const usedToday = new Set(), typesToday = new Set();
    for (const meal of MEALS) {
      const pool = planPick(meal, who, usedToday, recent.slice(-9));
      // Ưu tiên đổi loại món trong cùng một ngày (sáng phở thì trưa bớt phở)
      const d = weightedPick(pool, (x) => score(x, who) ** 2 * (typesToday.has(x.type) ? 0.15 : 1));
      day[meal] = d ? d.name : null;
      if (d) { usedToday.add(d.name); typesToday.add(d.type); recent.push(d.name); }
    }
    days.push(day);
  }
  return { who, days, u: Date.now() };
}

function rerollSlot(period, dayIndex, meal) {
  const plan = plans[period];
  const day = plan.days[dayIndex];
  const exclude = new Set(MEALS.map((m) => day[m]).filter(Boolean));
  const near = plan.days.slice(Math.max(0, dayIndex - 2), dayIndex + 3).flatMap((x) => MEALS.map((m) => x[m]));
  const pool = planPick(meal, plan.who, exclude, near);
  const d = weightedPick(pool, (x) => score(x, plan.who) ** 2);
  if (!d) return;
  day[meal] = d.name;
  plan.u = Date.now();
  save();
  renderPlan(`${dayIndex}-${meal}`);
}

/** Bỏ các ngày đã qua; nếu hết ngày thì tạo mới. */
function currentPlan(period) {
  const tk = todayKey();
  let plan = plans[period];
  if (plan) plan.days = plan.days.filter((d) => d.d >= tk);
  if (!plan || !plan.days.length) {
    plan = plans[period] = generatePlan(period, state.who);
    save();
  }
  return plan;
}

function slotButton(period, idx, day, meal, flashKey) {
  const name = day[meal];
  return h("button", {
    type: "button",
    class: "slot" + (flashKey === `${idx}-${meal}` ? " flash" : ""),
    title: "Chạm để đổi món",
    onclick: () => rerollSlot(period, idx, meal),
  },
  h("span", { class: "meal" }, `${MEAL_ICON[meal]} ${MEAL_LABEL[meal]}`),
  h("span", { class: "ic" }, name ? iconOf(name) : "—"),
  h("span", { class: "nm" }, name || "Không có món phù hợp"),
  h("span", { class: "re", "aria-hidden": "true" }, "↻"));
}

function dayCard(period, idx, day, flashKey, big = false) {
  const isToday = day.d === todayKey();
  return h("div", { class: `day${isToday ? " is-today" : ""}${big ? " day-big" : ""}` },
    h("div", { class: "day-head" },
      h("b", {}, fmtDay(day.d)),
      isToday ? h("small", {}, "HÔM NAY") : null),
    MEALS.map((m) => slotButton(period, idx, day, m, flashKey)));
}

function renderPlan(flashKey) {
  const period = state.period;
  const plan = currentPlan(period);
  const wrap = $("#plan");
  wrap.replaceChildren();

  const info = `Thực đơn cho ${WHO_LABEL[plan.who]} · ${plan.days.length} ngày · chạm vào món để đổi.`;
  $("#plan-info").textContent = plan.who !== state.who
    ? `${info} (Đang chọn "${WHO_LABEL[state.who]}" — bấm Tạo thực đơn mới để áp dụng.)`
    : info;

  if (period === "day") {
    wrap.append(dayCard(period, 0, plan.days[0], flashKey, true));
    return;
  }
  if (period === "week") {
    plan.days.forEach((d, i) => wrap.append(dayCard(period, i, d, flashKey)));
    return;
  }
  if (period === "month") {
    plan.days.forEach((d, i) => {
      if (i % 7 === 0) wrap.append(h("p", { class: "week-label" }, `Tuần ${i / 7 + 1}`));
      wrap.append(dayCard(period, i, d, flashKey));
    });
    return;
  }
  // Năm: gom theo tháng, chỉ vẽ ngày khi mở tháng (cho nhẹ)
  const groups = new Map();
  plan.days.forEach((d, i) => {
    const k = d.d.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const openMonth = flashKey ? plan.days[+flashKey.split("-")[0]].d.slice(0, 7) : [...groups.keys()][0];
  for (const [k, idxs] of groups) {
    const [y, m] = k.split("-");
    const inner = h("div", { class: "inner" });
    const fill = () => {
      if (inner.childElementCount) return;
      idxs.forEach((i) => inner.append(dayCard(period, i, plan.days[i], flashKey)));
    };
    const det = h("details", { class: "month", ontoggle: () => det.open && fill() },
      h("summary", {}, `Tháng ${+m}/${y} · ${idxs.length} ngày`), inner);
    if (k === openMonth) { det.open = true; fill(); }
    wrap.append(det);
  }
}

// =====================================================================
// Tab Danh sách
// =====================================================================
function renderList() {
  const wrap = $("#list");
  wrap.replaceChildren();
  for (const t of TYPES) {
    const items = dishes.filter((d) => d.type === t);
    if (!items.length) continue;
    wrap.append(h("div", { class: "group" },
      h("h3", {}, `${TYPE_ICON[t]} ${t} (${items.length})`),
      items.map((d) => h("div", { class: "dish" },
        h("span", { class: "ic", "aria-hidden": "true" }, d.icon),
        h("span", { class: "name" }, d.name),
        ["vo", "chong"].map((p) => h("button", {
          type: "button",
          title: `Mức thích của ${p === "vo" ? "vợ" : "chồng"}`,
          onclick: () => { d[p] = (d[p] + 1) % 3; d.u = Date.now(); save(); renderList(); },
        }, `${p === "vo" ? "👩" : "👨"}${LIKE_ICON[d[p]]}`)),
        h("button", {
          type: "button", class: "del", title: "Xoá món", "aria-label": `Xoá ${d.name}`,
          onclick: () => {
            if (!confirm(`Xoá "${d.name}"?`)) return;
            dishes = dishes.filter((x) => x !== d);
            meta.deletedDishes[d.name.toLowerCase()] = Date.now();
            save(); renderList(); renderTypes();
          },
        }, "✕")))));
  }
}

// =====================================================================
// Tab Đã ăn
// =====================================================================
function renderHistory() {
  const stats = $("#stats"), wrap = $("#history");
  stats.replaceChildren();
  wrap.replaceChildren();
  $("#clear-history").classList.toggle("hidden", !history.length);
  if (!history.length) {
    wrap.append(h("div", { class: "empty" }, h("b", {}, "🍽️"), "Chưa chốt món nào. Qua tab Hôm nay chọn thử nhé!"));
    return;
  }
  const month = history.filter((x) => x.at >= Date.now() - 30 * DAY_MS);
  const count = {};
  month.forEach((x) => (count[x.name] = (count[x.name] || 0) + 1));
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  stats.append(h("div", { class: "stats" },
    h("div", { class: "stat" }, h("b", {}, month.length), h("span", {}, "bữa / 30 ngày")),
    h("div", { class: "stat" }, h("b", {}, Object.keys(count).length), h("span", {}, "món khác nhau")),
    h("div", { class: "stat" }, h("b", {}, top ? iconOf(top[0]) : "—"), h("span", {}, top ? `${top[0]} (${top[1]})` : "ăn nhiều nhất"))));

  wrap.append(h("div", { class: "card flush" },
    [...history].reverse().slice(0, 60).map((x) => h("div", { class: "hist" },
      h("span", { class: "ic", "aria-hidden": "true" }, iconOf(x.name)),
      h("span", { class: "nm" }, x.name),
      h("small", {}, `${fmtDay(dateKey(new Date(x.at)))} · ${MEAL_LABEL[x.meal]}`, h("br"), WHO_LABEL[x.who])))));
}

// =====================================================================
// Sự kiện
// =====================================================================
function bindSeg(el, get, set) {
  const paint = () => el.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", b.dataset.v === get());
    b.setAttribute("aria-pressed", String(b.dataset.v === get()));
  });
  el.addEventListener("click", (e) => {
    const v = e.target.closest("button")?.dataset.v;
    if (!v || v === get()) return;
    set(v); paint();
  });
  paint();
}

bindSeg($("#who"), () => state.who, (v) => {
  state.who = v; state.skipped.clear(); persist();
  if ($("#tab-plan").classList.contains("active")) renderPlan();
  if (!$("#discover-card").classList.contains("hidden")) nextDiscover();
});
bindSeg($("#meal"), () => state.meal, (v) => { state.meal = v; state.skipped.clear(); });
bindSeg($("#period"), () => state.period, (v) => { state.period = v; persist(); renderPlan(); });

$("#spin").addEventListener("click", () => spin(false));
$("#reroll").addEventListener("click", () => spin(true));
$("#accept").addEventListener("click", acceptToday);
$("#discover").addEventListener("click", nextDiscover);
$("#d-next").addEventListener("click", nextDiscover);
$("#d-add").addEventListener("click", addDiscover);

$("#plan-gen").addEventListener("click", () => {
  const p = state.period;
  if (p === "year" && plans.year && !confirm("Tạo lại thực đơn cả năm? Các món bạn đã đổi sẽ mất.")) return;
  plans[p] = generatePlan(p, state.who);
  save();
  renderPlan();
});

$("#add-type").replaceChildren(...TYPES.map((t) => h("option", { value: t }, `${TYPE_ICON[t]} ${t}`)));
$("#add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = str($("#add-name").value, 60);
  if (!name) return;
  if (dishes.some((d) => d.name.toLowerCase() === name.toLowerCase())) { alert("Món này có rồi!"); return; }
  const type = $("#add-type").value;
  dishes.push(cleanDish({ name, type, vo: type === "Fast food" ? 0 : 1, chong: 1, meals: MEALS, u: Date.now() }));
  $("#add-name").value = "";
  save(); renderList(); renderTypes();
});
$("#reset").addEventListener("click", () => {
  if (!confirm("Khôi phục danh sách món mặc định? Các món bạn thêm sẽ mất (lịch sử vẫn giữ).")) return;
  const now = Date.now();
  const defaults = new Set(DEFAULT_DISHES.map((d) => d.name.toLowerCase()));
  dishes.forEach((d) => { if (!defaults.has(d.name.toLowerCase())) meta.deletedDishes[d.name.toLowerCase()] = now; });
  dishes = DEFAULT_DISHES.map((d) => cleanDish({ ...d, u: now }));
  save(); renderList(); renderTypes();
});
$("#clear-history").addEventListener("click", () => {
  if (!confirm("Xoá toàn bộ lịch sử đã ăn?")) return;
  history = []; meta.historyClearedAt = Date.now(); save(); renderHistory();
});

$("#place-parking").addEventListener("change", (e) => { placeState.parking = e.target.checked; renderPlaces(); });
$("#place-radius").addEventListener("change", (e) => { placeState.radius = Number(e.target.value) || 0; renderPlaces(); });
$("#home-gps").addEventListener("click", () => {
  if (!navigator.geolocation) { alert("Máy không hỗ trợ định vị."); return; }
  $("#home-gps").disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => { $("#home-gps").disabled = false; setHome({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
    () => { $("#home-gps").disabled = false; alert("Không lấy được vị trí. Hãy cho phép quyền vị trí, hoặc dùng nút Nhập."); },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
});
$("#home-edit").addEventListener("click", () => {
  const v = prompt("Dán link Google Maps (bản đầy đủ, mở trong trình duyệt rồi chép) hoặc toạ độ dạng: 10.736, 106.737");
  if (v == null) return;
  const hl = parseLatLng(v);
  if (!hl) { alert("Không đọc được toạ độ. Link rút gọn maps.app.goo.gl không đọc được — hãy mở link rồi chép địa chỉ đầy đủ, hoặc nhập toạ độ."); return; }
  setHome(hl);
});
$("#home-clear").addEventListener("click", () => setHome(null));
$("#place-q").addEventListener("input", (e) => { placeState.q = e.target.value.slice(0, 40); renderPlaces(); });

const TAB_RENDER = { plan: () => renderPlan(), places: renderPlaces, list: renderList, history: renderHistory };
function showTab(name) {
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x.dataset.tab === name));
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${name}`));
  TAB_RENDER[name]?.();
  if (name === "sync" && typeof renderSync === "function") renderSync();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
$("#open-sync").addEventListener("click", () => showTab("sync"));

/** Vẽ lại tab đang mở — dùng sau khi đồng bộ kéo dữ liệu mới về. */
function refreshUI() {
  renderTypes();
  const active = document.querySelector(".tab.active")?.id.replace("tab-", "");
  if (active && active !== "pick") TAB_RENDER[active]?.();
}

$("#today").textContent = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
renderTypes();
persist(); // lưu lại dữ liệu đã được làm sạch

// ---------- Tự cập nhật khi có bản mới ----------
// sw.js mới (VERSION đổi) được cài ngay (skipWaiting + clients.claim) → sự kiện controllerchange
// → tải lại trang 1 lần để dùng code mới. Lần cài đầu tiên (chưa có controller) thì không tải lại.
if ("serviceWorker" in navigator && window.isSecureContext) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    if (state.spinning) setTimeout(() => location.reload(), 2500); // đợi quay số xong
    else location.reload();
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    // Kiểm tra bản mới mỗi khi mở lại app (iPhone hay giữ app chạy ngầm nhiều ngày)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    });
  }).catch(() => {});
}
