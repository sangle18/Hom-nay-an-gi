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
  return { name, type, icon, vo: like(d.vo), chong: like(d.chong), meals: meals.length ? meals : [...MEALS] };
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
  return days.length ? { who: WHO.includes(p.who) ? p.who : "both", days } : null;
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

const save = () => {
  store.set("hnag.dishes", dishes);
  store.set("hnag.history", history);
  store.set("hnag.plans", plans);
  store.set("hnag.prefs", { who: state.who, period: state.period });
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
    state.current = null;
    return;
  }

  // Hiệu ứng "quay số"
  state.spinning = true;
  $("#spin").disabled = $("#reroll").disabled = $("#accept").disabled = true;
  card.classList.remove("landed");
  card.classList.add("spinning");
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
  dishes.push(cleanDish(d));
  save();
  renderTypes();
  $("#d-add").disabled = true;
  $("#d-add").textContent = "✓ Đã thêm";
  $("#hint").textContent = `Đã thêm ${d.icon} ${d.name} vào danh sách.`;
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
  return { who, days };
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
          onclick: () => { d[p] = (d[p] + 1) % 3; save(); renderList(); },
        }, `${p === "vo" ? "👩" : "👨"}${LIKE_ICON[d[p]]}`)),
        h("button", {
          type: "button", class: "del", title: "Xoá món", "aria-label": `Xoá ${d.name}`,
          onclick: () => {
            if (!confirm(`Xoá "${d.name}"?`)) return;
            dishes = dishes.filter((x) => x !== d);
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
  state.who = v; state.skipped.clear(); save();
  if ($("#tab-plan").classList.contains("active")) renderPlan();
  if (!$("#discover-card").classList.contains("hidden")) nextDiscover();
});
bindSeg($("#meal"), () => state.meal, (v) => { state.meal = v; state.skipped.clear(); });
bindSeg($("#period"), () => state.period, (v) => { state.period = v; save(); renderPlan(); });

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
  dishes.push(cleanDish({ name, type, vo: type === "Fast food" ? 0 : 1, chong: 1, meals: MEALS }));
  $("#add-name").value = "";
  save(); renderList(); renderTypes();
});
$("#reset").addEventListener("click", () => {
  if (!confirm("Khôi phục danh sách món mặc định? Các món bạn thêm sẽ mất (lịch sử vẫn giữ).")) return;
  dishes = DEFAULT_DISHES.map(cleanDish);
  save(); renderList(); renderTypes();
});
$("#clear-history").addEventListener("click", () => {
  if (!confirm("Xoá toàn bộ lịch sử đã ăn?")) return;
  history = []; save(); renderHistory();
});

document.querySelectorAll("nav button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${b.dataset.tab}`));
    ({ plan: renderPlan, list: renderList, history: renderHistory })[b.dataset.tab]?.();
    window.scrollTo({ top: 0 });
  });
});

$("#today").textContent = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
renderTypes();
save(); // lưu lại dữ liệu đã được làm sạch

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
