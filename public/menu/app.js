(() => {
/* ------------------------------------------------------------------
   MENU DATA  (sample content — replace with Tressa's real menu)
   Item keys:
     n  name            d  short description     l  long description (sheet)
     v  diet: "v" veg, "n" non-veg, "e" contains egg (kitchen only)
     p  price, or [price, price] matching the section/group "cols"
     r  region / style line for drinks          q  portion
     s  spice 1–3       k  kcal       a  allergens (codes below)
     t  tags: chef, best, new, jain             x  note
     pair  id of an item it pairs with (else the section's pair)
   Group rows: { g: "Group name", cols: [...] }
------------------------------------------------------------------- */
const MENU = window.TRESSA_MENU;
const REMOTE_URL = typeof window.TRESSA_SOURCE === "string" ? window.TRESSA_SOURCE : "";
const REMOTE_KEY = "tressa-menu-doc:" + REMOTE_URL;
function docOk(d) {
  const itemOk = it => it && typeof it === "object" && (typeof it.g === "string" || (typeof it.n === "string" && typeof it.id === "string" && (typeof it.p === "number" || Array.isArray(it.p))));
  const tabOk = t => t && Array.isArray(t.sections) && t.sections.length > 0 && t.sections.every(s => s && typeof s.id === "string" && typeof s.title === "string" && typeof s.short === "string" && Array.isArray(s.items) && s.items.every(itemOk));
  return !!(d && d.menu && tabOk(d.menu.kitchen) && tabOk(d.menu.bar) && d.live && typeof d.live === "object");
}
let REMOTE = null;
if (REMOTE_URL) try {
  const c = JSON.parse(localStorage.getItem(REMOTE_KEY) || "null");
  if (c && typeof c.ver === "string" && docOk(c.doc)) { REMOTE = c; MENU.kitchen.sections = c.doc.menu.kitchen.sections; MENU.bar.sections = c.doc.menu.bar.sections; }
} catch (err) {}
const ALLERGENS = { G: "Gluten", D: "Dairy", N: "Tree nuts", P: "Peanuts", E: "Egg", S: "Soy", F: "Fish", C: "Crustaceans", M: "Mustard", Se: "Sesame", Su: "Sulphites" };
const SPICE = ["", "Mild", "Medium", "Fiery"];
const TAGS = { chef: "Signature", best: "Guest favourite", new: "New", jain: "Jain on request" };
const DIET = { v: "Vegetarian", n: "Non-vegetarian", e: "Contains egg" };
const TABS = { kitchen: "Kitchen", bar: "Bar" };


/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n).toLocaleString("en-IN");
const arr = p => Array.isArray(p) ? p : [p];
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slug = s => norm(s).replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (err) {} };

/* ---------------- index ----------------
   Item ids come from the original names and never change, so banners,
   lists and saved orders keep pointing at the right dish after an edit.
   Staff changes (document "menu/items") are laid over this base menu. */
const INDEX = {}, ORDER = [], TABK = ["kitchen", "bar"];
let BASE = null;
const BASEIX = {}, CATS = {};
function initBase() {
  const used = new Set();
  for (const tab of TABK) for (const sec of MENU[tab].sections) for (const it of sec.items) {
    if (it.g) continue;
    let id = typeof it.id === "string" && /^[a-z0-9-]{1,64}$/.test(it.id) ? it.id : slug(it.n); while (used.has(id)) id += "-x"; used.add(id); it.id = id;
  }
  BASE = JSON.parse(JSON.stringify({ kitchen: MENU.kitchen.sections, bar: MENU.bar.sections }));
  for (const k in BASEIX) delete BASEIX[k];
  for (const k in CATS) delete CATS[k];
  for (const tab of TABK) for (const sec of BASE[tab]) {
  let g = null;
  if (!sec.items.length || !sec.items[0].g) CATS[`${tab}|${sec.id}|`] = { tab, sec: sec.id, label: sec.title, cols: sec.cols || null };
  for (const it of sec.items) {
    if (it.g) { g = it; CATS[`${tab}|${sec.id}|${it.g}`] = { tab, sec: sec.id, label: `${sec.title} · ${it.g}`, cols: it.cols || sec.cols || null }; continue; }
    BASEIX[it.id] = { it, tab, secId: sec.id, cat: `${tab}|${sec.id}|${g ? g.g : ""}` };
  }
  }
}
initBase();
const catKeys = tab => Object.keys(CATS).filter(k => CATS[k].tab === tab);
const ITEM_FIELDS = ["n", "d", "r", "p", "v", "s", "t", "img"];
function mergeItem(it, o) {
  const m = Object.assign({}, it);
  for (const k of ITEM_FIELDS) if (o[k] !== undefined) m[k] = o[k];
  if (o.d !== undefined) delete m.l;
  if (m.img === "") delete m.img;
  return m;
}
let ITEMS = {}, itemsSig = "{}";
function buildMenu(over) {
  const moved = Object.entries(over).filter(([id, o]) => !o.del && (o.add || (o.cat && BASEIX[id] && o.cat !== BASEIX[id].cat)));
  for (const tab of TABK) BASE[tab].forEach((bs, si) => {
    const out = []; let g = "";
    const flush = () => { const key = `${tab}|${bs.id}|${g}`; for (const [id, o] of moved) if (o.cat === key) out.push(o.add ? mergeItem({ id, staff: true }, o) : mergeItem(BASEIX[id].it, o)); };
    for (const it of bs.items) {
      if (it.g) { flush(); g = it.g; out.push(it); continue; }
      const o = over[it.id];
      if (o && (o.del || (o.cat && o.cat !== BASEIX[it.id].cat))) continue;
      out.push(o ? mergeItem(it, o) : it);
    }
    flush();
    MENU[tab].sections[si].items = out;
  });
}
function rebuildIndex() {
  for (const k in INDEX) delete INDEX[k];
  ORDER.length = 0;
  for (const tab of TABK) for (const sec of MENU[tab].sections) {
    let grp = null;
    for (const it of sec.items) {
      if (it.g) { grp = it; continue; }
      const e = { id: it.id, item: it, tab, sec, grp, cols: (grp && grp.cols) || sec.cols || null, ord: ORDER.length };
      e.hay = norm([it.n, it.d, it.r, it.l, sec.title, sec.short, grp && grp.g, TABS[tab]].join(" "));
      e.minP = Math.min(...arr(it.p).filter(p => p != null));
      e.sn = norm(it.n); e.sd = norm(it.d); e.sr = norm(it.r); e.ss = norm(sec.title); e.sg = norm(grp && grp.g);
      INDEX[e.id] = e; ORDER.push(e);
    }
  }
}
function normItems(src) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  const price = v => { const n = Math.round(+v); return Number.isFinite(n) && n > 0 && n <= 200000 ? n : null; };
  for (const [id, o] of Object.entries(src).slice(0, 600)) {
    if (!/^[a-z0-9-]{1,64}$/.test(id) || !o || typeof o !== "object") continue;
    const base = BASEIX[id], add = !base && o.add === true;
    if (!base && !add) continue;
    const r = {};
    if (add) r.add = true;
    if (o.del === true && base) r.del = true;
    if (typeof o.cat === "string" && CATS[o.cat] && (add || (CATS[o.cat].tab === base.tab && o.cat !== base.cat))) r.cat = o.cat;
    if (add && !r.cat) continue;
    const cat = CATS[r.cat || base.cat], tab = cat.tab, many = cat.cols && cat.cols.length > 1;
    if (typeof o.n === "string" && o.n.trim()) r.n = o.n.replace(/\s+/g, " ").trim().slice(0, 60);
    if (typeof o.d === "string") r.d = o.d.replace(/\s+/g, " ").trim().slice(0, 160);
    if (typeof o.r === "string" && tab === "bar") r.r = o.r.replace(/\s+/g, " ").trim().slice(0, 60);
    if (o.p != null) {
      if (many) { const a = (Array.isArray(o.p) ? o.p : [o.p]).slice(0, cat.cols.length).map(price); while (a.length < cat.cols.length) a.push(null); if (a.some(v => v != null)) r.p = a; }
      else { const v = price(Array.isArray(o.p) ? o.p.find(x => x != null) : o.p); if (v) r.p = v; }
    }
    if (tab === "kitchen" && ["v", "n", "e"].includes(o.v)) r.v = o.v;
    if (tab === "kitchen" && Number.isInteger(o.s) && o.s >= 0 && o.s <= 3) r.s = o.s;
    if (Array.isArray(o.t)) r.t = [...new Set(o.t.filter(t => TAGS[t] && (tab === "kitchen" || t !== "jain")))];
    if (typeof o.img === "string" && (o.img === "" || /^\/_blob\/[0-9a-f]{32}$/.test(o.img) || /^https:\/\/[^\s"'<>()]{1,400}$/.test(o.img) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(o.img))) r.img = o.img;
    if (add) { if (!r.n || !r.p) continue; if (tab === "kitchen" && !r.v) r.v = "v"; }
    if (Object.keys(r).length) out[id] = r;
  }
  return out;
}
buildMenu(ITEMS); rebuildIndex();
const has = (e, t) => (e.item.t || []).includes(t);

/* What a category is, read from its name, so drawings, colours, quick picks,
   "Order for me" and the My List tips work for whatever menu is published. */
const ROLE_RULES = {
  kitchen: [[/soup|shorba/, "soup"], [/raita/, "raita"], [/salad/, "salad"], [/bread|roti|naan|paratha|kulcha/, "bread"], [/biryani|rice|pulao/, "rice"],
    [/dessert|sweet/, "dessert"], [/desi mains|curr|gravy/, "curry"], [/pizza/, "pizza"], [/pasta/, "pasta"], [/sushi/, "sushi"], [/dumpling|dim ?sum|bao|momo/, "dumpling"],
    [/desi appetizer|tandoor|kebab|tikka/, "tandoor"], [/appetizer|small plate|bar bite|starter|chaat|nibble/, "starter"], [/large plate|big plate|teppanyaki|oriental|wok|grill|main/, "main"]],
  bar: [[/dessert brew/, "coffee"], [/mocktail|smoothie|shake|iced tea|juice|cooler|^beverages|soft|zero/, "zero"], [/coffee|\btea\b|chai/, "coffee"],
    [/cocktail|2 is enough/, "cocktail"], [/shot|shooter/, "shot"], [/draught|draft/, "draught"], [/beer|breezer|pint/, "beer"], [/wine|champagne|prosecco|sparkling/, "wine"],
    [/single malt|whisk|scotch|bourbon|walker/, "whisky"], [/vodka/, "vodka"], [/\bgin\b/, "gin"], [/\brum\b/, "rum"], [/tequil|mezcal/, "tequila"],
    [/brandy|cognac/, "brandy"], [/liqueur|aperitif/, "liqueur"]]
};
const roleCache = new Map();
function roleOf(tab, sec) {
  const k = `${tab}|${sec.id}|${sec.title}`;
  if (!roleCache.has(k)) { const t = String(sec.title || sec.id).toLowerCase(); const r = ROLE_RULES[tab].find(([re]) => re.test(t)); roleCache.set(k, r ? r[1] : ""); }
  return roleCache.get(k);
}
const role = e => roleOf(e.tab, e.sec);
const SPICY = /chill?i|chilly|schezwan|szechuan|saoji|malwani|kolhapuri|angara|chingari|thecha|peri ?peri|\b65\b|mirch|balchao|hot and sour|hot & sour|tom yum|sukka|kala masala|laal maas|vindaloo|chettinad|dynamite|sriracha|jalape|karwari|ghee roast|gunpowder|podi/i;
const heat = e => e.item.s || (e.tab === "kitchen" && SPICY.test(e.item.n + " " + (e.item.d || "")) ? 2 : 0);
const sizes = e => (e.cols || []).filter((c, i) => arr(e.item.p)[i] != null);

/* quick picks: collections built from the data (empty ones are hidden) */
const COLLECTIONS = {
  kitchen: [
    { id: "sig", label: "Signatures", icon: "star", title: "Chef's Signatures", sub: "The plates Tressa is known for.", test: e => has(e, "chef") },
    { id: "loved", label: "Most loved", icon: "heart", title: "Most Loved", sub: "What our guests order again and again.", test: e => has(e, "best") },
    { id: "share", label: "For sharing", icon: "share", title: "For the Table", sub: "Platters, biryanis and pizzas made for sharing.", test: e => /platter|biryani|pizza|for two|family/i.test(e.item.n) },
    { id: "u500", label: "Under ₹500", icon: "tag", title: "Under ₹500", sub: "Plates priced under ₹500, breads and sides left out.", test: e => e.minP < 500 && !["bread", "raita"].includes(role(e)) },
    { id: "spicy", label: "Spice lovers", icon: "flame", title: "For Spice Lovers", sub: "Chilli, Kolhapuri, Saoji, Malwani and other fiery plates.", test: e => heat(e) >= 2 },
    { id: "light", label: "Light & fresh", icon: "leaf", title: "Light & Fresh", sub: "Soups and salads.", test: e => ["soup", "salad"].includes(role(e)) },
    { id: "jain", label: "Jain friendly", icon: "lotus", title: "Jain Friendly", sub: "Dishes we can prepare without onion, garlic or root vegetables.", test: e => has(e, "jain") },
    { id: "new", label: "New", icon: "spark", title: "New This Season", sub: "Recent additions to the menu.", test: e => has(e, "new") }
  ],
  bar: [
    { id: "sig", label: "Signatures", icon: "star", title: "Bar Signatures", sub: "The pours that define an evening at Tressa.", test: e => has(e, "chef") },
    { id: "loved", label: "Most loved", icon: "heart", title: "Most Loved", sub: "Our guests' most ordered drinks.", test: e => has(e, "best") },
    { id: "zero", label: "Zero proof", icon: "drop", title: "Zero Proof", sub: "Mocktails, shakes and coolers, none of the alcohol.", test: e => role(e) === "zero" },
    { id: "u500", label: "Under ₹500", icon: "tag", title: "Under ₹500", sub: "Drinks with a pour under ₹500.", test: e => e.minP < 500 && role(e) !== "coffee" },
    { id: "share", label: "Bottles & pitchers", icon: "bottle", title: "Bottles & Pitchers", sub: "Pitchers, towers, buckets and bottles for the table.", test: e => sizes(e).some(c => /Bottle|Pitcher|Tower|Barrel|Bucket/.test(c)) || /pitcher|tower|bucket|barrel/i.test(e.item.n) },
    { id: "after", label: "After dinner", icon: "moon", title: "After Dinner", sub: "Brandy, liqueurs and dessert brews.", test: e => ["brandy", "liqueur", "coffee"].includes(role(e)) }
  ]
};

/* Offers shown under "Offers" in the quick picks. Empty until Tressa adds real ones
   (staff can already put an offer on a banner from Live Menu). Times are minutes after midnight, days 0 = Sunday:
   { id, title, line, when, where, days: [0..6], from, to, ids: [item ids] | test: e => ..., always: true } */
const OFFERS = [];
function istNow() {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t).value;
    return { d: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(g("weekday")), m: (+g("hour") % 24) * 60 + +g("minute") };
  } catch (err) { const x = new Date(); return { d: x.getDay(), m: x.getHours() * 60 + x.getMinutes() }; }
}
const offerLive = o => { if (o.always) return false; const n = istNow(); return o.days.includes(n.d) && n.m >= o.from && n.m < o.to; };
const offerItems = o => o.ids ? o.ids.map(i => INDEX[i]).filter(Boolean) : o.test ? ORDER.filter(o.test) : [];

/* ---------------- live content: banners, specials, picks, sold out ----------------
   DEFAULT_LIVE is what the menu shows before (or without) a data source.
   Staff change it from the admin panel (open the menu with #admin).
   Item ids are the slugs of item names, e.g. "dal-tadka". */
const DEFAULT_LIVE = (REMOTE && REMOTE.doc.live) || window.TRESSA_LIVE;
function normLive(x) {
  x = x && typeof x === "object" ? x : {};
  const str = (s, n) => typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "";
  const ids = (a, tab, max = 24) => Array.isArray(a) ? [...new Set(a.filter(id => typeof id === "string" && INDEX[id] && (!tab || INDEX[id].tab === tab)))].slice(0, max) : [];
  const per = (o, f) => ({ kitchen: f(o && o.kitchen, "kitchen"), bar: f(o && o.bar, "bar") });
  const seen = new Set();
  const banners = (Array.isArray(x.banners) ? x.banners : []).slice(0, 12).map((b, i) => {
    if (!b || typeof b !== "object") return null;
    const l = b.link && typeof b.link === "object" ? b.link : {};
    let id = str(b.id, 24) || "b" + (i + 1);
    while (seen.has(id)) id += "x";
    seen.add(id);
    return { id, on: b.on !== false, tab: ["kitchen", "bar", "all"].includes(b.tab) ? b.tab : "all", tag: str(b.tag, 24) || "Today's Special", title: str(b.title, 48), line: str(b.line, 120), link: { type: ["item", "offer", "col"].includes(l.type) ? l.type : "item", id: str(l.id, 64) } };
  }).filter(b => b && b.title);
  const specials = per(x.specials, (a, tab) => {
    const out = [], had = new Set();
    for (const s of Array.isArray(a) ? a : []) {
      const o = typeof s === "string" ? { id: s, note: "" } : s && typeof s === "object" ? { id: str(s.id, 64), note: str(s.note, 48) } : null;
      if (o && INDEX[o.id] && INDEX[o.id].tab === tab && !had.has(o.id)) { had.add(o.id); out.push(o); }
    }
    return out.slice(0, 12);
  });
  return { banners, specials, exclusive: per(x.exclusive, ids), recommended: per(x.recommended, ids), soldOut: ids(x.soldOut, null, 400) };
}
let liveRaw = DEFAULT_LIVE, LIVE = normLive(liveRaw), liveSig = JSON.stringify(LIVE), OUT = new Set(LIVE.soldOut);

/* ---------------- venues: one menu, a QR route per space ----------------
   ?venue=soul|unwind|sky|aura&table=12   or   #sky-table-12
   Sets the opening tab and labels the order for the server. Per-venue menus
   (a Sky-only list, say) can come from the data source at deployment. */
const VENUES = {
  soul: { name: "Soul", line: "Family dining", tab: "kitchen" },
  unwind: { name: "Unwind", line: "The bar", tab: "bar" },
  sky: { name: "The Sky", line: "Rooftop", tab: "kitchen" },
  aura: { name: "Aura", line: "In-suite dining", tab: "kitchen" }
};
let VENUE = null;

/* ---------------- state ---------------- */
const KEY = "tressa-menu-v1" + ((/^\/menu\/(soul|unwind|sky|aura)\/?$/i.exec(location.pathname) || [])[1] ? "-" + /^\/menu\/(soul|unwind|sky|aura)/i.exec(location.pathname)[1].toLowerCase() : "");
const state = { tab: "", veg: false, view: "list", list: {}, pos: { kitchen: 0, bar: 0 } };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && typeof saved === "object") {
    state.veg = !!saved.veg;
    if (saved.view === "grid") state.view = "grid";
    if (saved.list && typeof saved.list === "object") {
      for (const [k, q] of Object.entries(saved.list)) {
        const [id, vi] = k.split("|");
        if (q > 0 && /^[a-z0-9-]{1,64}$/.test(id) && (!INDEX[id] || arr(INDEX[id].item.p)[+vi] != null)) state.list[k] = Math.min(20, q | 0);
      }
    }
  }
} catch (err) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify({ veg: state.veg, view: state.view, list: state.list })); } catch (err) {} }
function qtyOf(id) { let q = 0; for (const k in state.list) if (k.split("|")[0] === id) q += state.list[k]; return q; }
const vegOk = e => e.tab !== "kitchen" || !state.veg || e.item.v === "v";
function colItems(tab, c) { return ORDER.filter(e => e.tab === tab && (c.ids ? c.ids.includes(e.id) : c.test(e)) && vegOk(e)); }

/* ---------------- rendering ---------------- */
const markHTML = v => v ? `<span class="mark ${v}" role="img" aria-label="${DIET[v]}"></span>` : "";
function spiceHTML(s) {
  if (!s) return "";
  let h = ""; for (let i = 1; i <= 3; i++) h += `<i${i <= s ? ' class="f"' : ""}></i>`;
  return `<span class="spice" role="img" aria-label="Spice: ${SPICE[s]}">${h}</span>`;
}
const tagsHTML = it => (it.t || []).map(t => `<span class="tag${t === "jain" ? " soft" : ""}">${TAGS[t]}</span>`).join("");
const countLabel = (n, tab) => tab === "kitchen" ? `${n} ${n === 1 ? "dish" : "dishes"}` : `${n} ${n === 1 ? "drink" : "drinks"}`;
const options = e => arr(e.item.p).map((p, i) => [p, i]).filter(x => x[0] != null);

function ctlHTML(e) {
  if (OUT.has(e.id)) return `<span class="soldout">Sold out</span>`;
  const opts = options(e), name = esc(e.item.n);
  if (opts.length === 1) {
    const key = `${e.id}|${opts[0][1]}`, q = state.list[key] || 0;
    return q
      ? `<span class="mstep"><button type="button" data-act="dec" data-key="${key}" aria-label="One less ${name}">−</button><output>${q}</output><button type="button" data-act="inc" data-key="${key}" aria-label="One more ${name}">+</button></span>`
      : `<button class="add" type="button" data-act="add" data-key="${key}" aria-label="Add ${name}">ADD</button>`;
  }
  const q = qtyOf(e.id);
  return q ? `<button class="add on" type="button" data-id="${e.id}" aria-label="${name}, ${q} in your list">${q} ADDED</button>`
           : `<button class="add" type="button" data-id="${e.id}" aria-label="Choose a size of ${name}">ADD</button><span class="opt">${opts.length} sizes</span>`;
}
/* ---------------- art: an illustrated tile for every dish and drink ----------------
   A glyph says what it is, the palette says where it comes from on the menu.
   Give an item  img: "https://…/photo.webp"  in MENU and the photo replaces the tile. */
const GLYPHS = (() => {
  const F = 'fill="#F6EEDD" fill-opacity=".13"', L = 'fill="#E4C47E" fill-opacity=".42"', G = 'stroke="#E4C47E"', T = 'stroke-width="1.5"', N = 'stroke="none"', D = 'fill="#E4C47E" stroke="none"', W = 'fill="#F6EEDD" stroke="none"';
  const steam = y => `<path d="M38 ${y}c-5-6 5-9 0-16M50 ${y - 2}c-5-6 5-9 0-16M62 ${y}c-5-6 5-9 0-16" ${G} ${T}/>`;
  const stem = `<path d="M50 58v24M36 86c4-3 24-3 28 0"/>`;
  const chunk = (x, y, g) => `<rect x="-8.5" y="-8.5" width="17" height="17" rx="4.5" transform="translate(${x} ${y}) rotate(45)" ${g ? L + " " + G : F}/>`;
  return {
    bowl: `<path d="M14 50c0 19 16 32 36 32s36-13 36-32z" ${F}/><ellipse cx="50" cy="50" rx="36" ry="7.5" ${F}/><ellipse cx="50" cy="50" rx="29.5" ry="4.6" ${L} ${N}/><path d="M41 82l-2 6h22l-2-6"/>${steam(36)}<path d="M55 49.5c3-3.2 7.5-3.4 10.5-1.2-3 3-7.5 3.4-10.5 1.2z" ${T}/>`,
    kadai: `<path d="M14 46c2 19 17 32 36 32s34-13 36-32z" ${F}/><ellipse cx="50" cy="46" rx="36" ry="7" ${F}/><ellipse cx="50" cy="46" rx="29.5" ry="4.3" ${L} ${N}/><path d="M14 45c-5-1-9 1.5-9 5.5s4 6 9.5 4.5M86 45c5-1 9 1.5 9 5.5s-4 6-9.5 4.5"/><circle cx="41" cy="45.5" r="2.2" ${W}/><circle cx="58" cy="46.5" r="1.8" ${W}/><path d="M22 60c18 6 38 6 56 0" ${T} stroke-opacity=".5"/>${steam(32)}`,
    handi: `<path d="M33 36c-16 7-19 30-6 42 6 5 14 7 23 7s17-2 23-7c13-12 10-35-6-42z" ${F}/><path d="M22 58c18 6 38 6 56 0" ${G} ${T}/><path d="M24 66c17 5 35 5 52 0" ${G} ${T} stroke-dasharray="1 5"/><path d="M29 36h42"/><path d="M30 35c0-7 9-11 20-11s20 4 20 11z" ${L} ${G}/><circle cx="50" cy="20" r="3" ${G}/>`,
    skewer: `<path d="M12 88L88 12" ${T}/><circle cx="89.5" cy="10.5" r="3.2"/>${chunk(30, 70, 0)}${chunk(42, 58, 1)}${chunk(54, 46, 0)}${chunk(66, 34, 1)}<circle cx="36" cy="64" r="2.4" ${D}/><circle cx="48" cy="52" r="2.4" ${W}/><circle cx="60" cy="40" r="2.4" ${D}/><path d="M66 80c4-6 11-7 15-4-4 6-11 7-15 4z" ${G} ${T}/>`,
    plate: `<circle cx="50" cy="52" r="36" ${F}/><circle cx="50" cy="52" r="26" ${T} stroke-opacity=".55"/><path d="M35 58c0-9 7-16 16-16 7 0 13 5 13 12 0 6-5 10-12 10H41c-4 0-6-2-6-6z" ${L} ${G}/><path d="M58 40c4-5 10-6 14-4-3 5-9 7-14 4zM56 44l8-6" ${T}/><circle cx="40" cy="45" r="2" ${D}/><circle cx="44" cy="40" r="1.3" ${D}/><circle cx="66" cy="62" r="1.6" ${D}/><path d="M23 38a32 32 0 0 1 17-13" ${T} stroke-opacity=".8"/>`,
    dumpling: `<path d="M16 64c0-20 15-33 34-33s34 13 34 33z" ${F}/><path d="M29 41c3 7 3 15 1 23M40 34c2 9 2 20 0 30M60 34c-2 9-2 20 0 30M71 41c-3 7-3 15-1 23" ${T}/><path d="M46 31c1.5-3 6.5-3 8 0"/><path d="M10 68h80" ${G}/><path d="M14 68v9c0 4 3 7 7 7h58c4 0 7-3 7-7v-9" ${G}/><path d="M14 76h72" ${G} ${T}/>`,
    pizza: `<circle cx="50" cy="50" r="36" ${F}/><circle cx="50" cy="50" r="30" ${T}/><path d="M50 20v60M24 35l52 30M24 65l52-30" ${T} stroke-opacity=".55"/><circle cx="40" cy="31" r="4.2" ${L} ${G}/><circle cx="64" cy="37" r="4.2" ${L} ${G}/><circle cx="67" cy="60" r="4.2" ${L} ${G}/><circle cx="41" cy="68" r="4.2" ${L} ${G}/><circle cx="29" cy="50" r="4.2" ${L} ${G}/><path d="M55 27c3-3 7-3 9-1-2 3-6 4-9 1zM55 71c3-3 7-3 9-1-2 3-6 4-9 1z" ${T}/>`,
    pasta: `<circle cx="50" cy="50" r="36" ${F}/><circle cx="50" cy="50" r="27" ${T} stroke-opacity=".5"/><path d="M47 50a3 3 0 0 1 6 0a6 6 0 0 1-12 0a9.5 9.5 0 0 1 19 0a13 13 0 0 1-26 0a16.5 16.5 0 0 1 33 0" ${G}/><path d="M68 26c3-4 8-5 11-3-2 4-7 6-11 3z" ${T}/><circle cx="33" cy="67" r="1.6" ${D}/><circle cx="69" cy="67" r="1.3" ${D}/><circle cx="29" cy="35" r="1.3" ${D}/>`,
    noodles: `<path d="M60 10L44 46M71 13L50 47" ${G}/><path d="M14 52c0 18 16 30 36 30s36-12 36-30z" ${F}/><ellipse cx="50" cy="52" rx="36" ry="7" ${F}/><path d="M24 52c3.5-3.5 7 3.5 10.5 0s7 3.5 10.5 0 7 3.5 10.5 0 7 3.5 10.5 0 7 3.5 10.5 0" ${T}/><path d="M46 47c-2 3 2 5 0 8" ${T}/><path d="M41 82l-2 6h22l-2-6"/><path d="M22 64c18 6 38 6 56 0" ${T} stroke-dasharray="2 5" stroke-opacity=".7"/>`,
    salad: `<circle cx="50" cy="52" r="36" ${F}/><path d="M28 52c4-13 17-18 26-13-4 12-16 18-26 13z" ${F}/><path d="M28 52l26-13" ${T}/><path d="M46 66c6-11 19-14 27-7-6 10-18 13-27 7z" ${F}/><path d="M46 66l27-7" ${T}/><path d="M50 34c8-7 19-6 24 0-8 7-18 7-24 0z" ${F}/><path d="M50 34h24" ${T}/><circle cx="66" cy="46" r="5" ${L} ${G}/><circle cx="35" cy="66" r="4.5" ${L} ${G}/><rect x="33" y="38" width="5" height="5" rx="1" transform="rotate(14 35.5 40.5)" ${W}/>`,
    kulfi: `<path d="M37 14h26l-4 52c0 3-3 5-6 5h-6c-3 0-6-2-6-5z" ${F}/><path d="M38.6 30h22.8" ${G} ${T}/><path d="M39.6 42h20.8" ${G} ${T} stroke-dasharray="1 4"/><rect x="46" y="71" width="8" height="17" rx="3"/><circle cx="46" cy="22" r="1.6" ${D}/><circle cx="54" cy="25" r="1.3" ${D}/><circle cx="50" cy="53" r="1.5" ${D}/><path d="M57 18l3-3" ${G} ${T}/>`,
    ramekin: `<path d="M26 48h48v28c0 4-3 6-6 6H32c-3 0-6-2-6-6z" ${F}/><path d="M34 50v31M42 50v32M50 50v32M58 50v32M66 50v31" ${T} stroke-opacity=".45"/><path d="M23 48c0-13 12-22 27-22s27 9 27 22z" ${L} ${G}/><path d="M38 34l1.5-3M50 30v-3M61 35l2-3" ${T}/><path d="M16 88h68"/>`,
    sweets: `<circle cx="37" cy="44" r="9.5" ${L} ${G}/><circle cx="57" cy="42" r="9.5" ${L} ${G}/><circle cx="47" cy="33" r="8.5" ${L} ${G}/><path d="M16 50h68c0 18-15 30-34 30S16 68 16 50z" ${F}/><path d="M41 80l-2 6h22l-2-6"/><path d="M33 40a4 4 0 0 1 5-3M53 38a4 4 0 0 1 5-3M44 29a4 4 0 0 1 5-3" ${T}/>`,
    cake: `<rect x="22" y="48" width="56" height="34" rx="4" ${F}/><path d="M22 57c4 5 8 5 10 0s6-5 8 0 6 5 8 0 6-5 8 0 6 5 8 0 6-5 10 0" ${G} ${T}/><path d="M22 70h56" ${T} stroke-opacity=".5"/><path d="M50 48V32" stroke-width="3"/><path d="M50 18c3.5 3.5 3.5 7 0 10-3.5-3-3.5-6.5 0-10z" ${D}/><path d="M14 88h72"/>`,
    coupe: `<path d="M20 30h60c0 17-13 28-30 28S20 47 20 30z" ${F}/><path d="M22.5 37h55c-3 11-13 18-27.5 18S25.5 48 22.5 37z" ${L} ${N}/>${stem}<circle cx="76" cy="27" r="8" ${G}/><path d="M76 19v16M68 27h16M70.3 21.3l11.4 11.4M81.7 21.3L70.3 32.7" ${G} stroke-width="1"/>`,
    martini: `<path d="M18 24h64L50 58z" ${F}/><path d="M25.5 31h49L50 53.5z" ${L} ${N}/>${stem}<path d="M66 12L44 44" ${G} ${T}/><circle cx="53" cy="31" r="5" ${L} ${G}/>`,
    highball: `<path d="M32 18h36l-3 68H35z" ${F}/><path d="M32.7 34h34.6l-2.3 50H35z" ${L} ${N}/><rect x="38" y="40" width="12" height="12" rx="2" transform="rotate(-10 44 46)" ${T}/><rect x="50" y="55" width="11" height="11" rx="2" transform="rotate(12 55.5 60.5)" ${T}/><path d="M57 6l-6 48" ${G}/><path d="M60 18a9 9 0 0 1 16 2z" ${G} ${T}/><circle cx="42" cy="74" r="1.4" ${W}/><circle cx="56" cy="78" r="1.2" ${W}/><circle cx="48" cy="68" r="1" ${W}/>`,
    tumbler: `<path d="M26 40h48l-4 44H30z" ${F}/><path d="M27.3 56h45.4l-2.7 28H30z" ${L} ${N}/><rect x="37" y="45" width="23" height="23" rx="3.5" transform="rotate(8 48.5 56.5)" ${T}/><path d="M64 28c7 1 10 8 6 13s-11 3-11-3" ${G}/><path d="M30 84h40" stroke-width="3.4"/>`,
    balloon: `<path d="M24 22h52c0 27-11 42-26 42S24 49 24 22z" ${F}/><path d="M25.2 38h49.6c-3 15-12 23-24.8 23S28.2 53 25.2 38z" ${L} ${N}/><path d="M50 64v18M36 86c4-3 24-3 28 0"/><circle cx="41" cy="47" r="3.2" ${G} ${T}/><circle cx="57" cy="51" r="2.2" ${D}/><path d="M63 10l-11 38" ${G} ${T}/><path d="M61.2 17l4.5-2.6M59.6 23l4.5-2.6M58 29l4.5-2.6M60.8 16.4l-4.2-1.6M59.2 22.4l-4.2-1.6" ${G} stroke-width="1.2"/>`,
    wine: `<path d="M32 14h36c2 23-4 40-18 40S30 37 32 14z" ${F}/><path d="M32.4 30h35.2c-1 14-7 22-17.6 22S33.4 44 32.4 30z" ${L} ${N}/><path d="M50 54v28M36 86c4-3 24-3 28 0"/><path d="M38 22c0 8 1 14 4 18" ${T} stroke-opacity=".6"/>`,
    flute: `<path d="M41 10h18l-2 42c0 4-3 7-7 7s-7-3-7-7z" ${F}/><path d="M41.5 22h17l-1.5 30c0 3-3 5.5-7 5.5s-7-2.5-7-5.5z" ${L} ${N}/><circle cx="48" cy="44" r="1.3" ${W}/><circle cx="52" cy="36" r="1.1" ${W}/><circle cx="49" cy="29" r=".9" ${W}/><path d="M50 59v24M38 86c3-3 21-3 24 0"/>`,
    beer: `<path d="M28 26h38v56c0 3-3 6-6 6H34c-3 0-6-3-6-6z" ${F}/><rect x="30" y="34" width="34" height="52" rx="4" ${L} ${N}/><path d="M66 38h6c4 0 7 3 7 7v18c0 4-3 7-7 7h-6"/><path d="M25 30c-1-6 4-11 10-10 2-5 8-7 12-4 3-4 10-4 13 1 6-1 10 4 9 9" fill="#F6EEDD" fill-opacity=".28"/><circle cx="40" cy="60" r="1.4" ${W}/><circle cx="52" cy="70" r="1.2" ${W}/><circle cx="46" cy="48" r="1" ${W}/>`,
    cup: `<path d="M24 44h44v14c0 12-10 22-22 22S24 70 24 58z" ${F}/><ellipse cx="46" cy="44" rx="22" ry="4" ${L} ${G} ${T}/><path d="M68 48h4c5 0 8 4 8 8s-3 8-8 8h-6"/><path d="M12 84c12 6 56 6 68 0"/>${steam(34)}`,
    snifter: `<path d="M37 22h26c10 8 14 18 12 29-2 12-12 19-25 19S27 63 25 51c-2-11 2-21 12-29z" ${F}/><path d="M25.5 48h49c-2 11-11 17-24.5 17S27.5 59 25.5 48z" ${L} ${N}/><path d="M50 70v12M38 86c3-3 21-3 24 0"/>`,
    bottle: `<path d="M44 8h12v20c0 5 10 9 10 21v36c0 3-2 5-5 5H39c-3 0-5-2-5-5V49c0-12 10-16 10-21z" ${F}/><rect x="38" y="54" width="24" height="20" rx="2" ${G}/><path d="M43 61h14M45 66.5h10" ${G} ${T}/><path d="M44 15h12" ${G}/>`
  };
})();
const PALETTE = {
  soups: ["#B8742F", "#6A3416"], tandoor: ["#9A3A22", "#481610"], "small-plates": ["#8E5B2C", "#3C2312"], salads: ["#5F7B3B", "#283819"],
  "pizza-pasta": ["#A8492C", "#4E1D12"], curries: ["#B6661E", "#5A280F"], "grills-woks": ["#6F4732", "#2C1B11"], biryani: ["#A97B2F", "#4A3211"],
  breads: ["#A9814C", "#55391B"], desserts: ["#7C3549", "#381320"], cocktails: ["#6E1F30", "#2B0B13"], classics: ["#5C2B1D", "#220F09"],
  "zero-proof": ["#3F6C5B", "#163027"], whisky: ["#8B5B23", "#3A230D"], gin: ["#4F6F6B", "#1D2E2B"], spirits: ["#5C4B3B", "#221911"],
  cognac: ["#7B4B1D", "#301A07"], wine: ["#5E1B2C", "#270A12"], beer: ["#B08B2F", "#544011"], coffee: ["#5B3B29", "#22140C"]
};
(() => {
  const wrap = s => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#F6EEDD" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${s}</svg>`;
  const css = Object.entries(GLYPHS).map(([k, s]) => `.g-${k} .art-g{background-image:url("data:image/svg+xml,${encodeURIComponent(wrap(s))}")}`).join("\n")
    + "\n" + Object.entries(PALETTE).map(([k, [a, b]]) => `.p-${k}{--a1:${a};--a2:${b};--shade:${b}F0}`).join("\n");
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
const GLYPH_RULES = {
  kitchen: [[/biryani/, "handi"], [/pizza|margherita|pepperoni/, "pizza"], [/penne|spaghetti|pappardelle|pasta/, "pasta"], [/dim sum|har gow|bao/, "dumpling"], [/noodle|khow|fried rice|kung pao/, "noodles"], [/kulfi|gelato/, "kulfi"], [/souffl|panna|cheesecake|tiramisu/, "ramekin"], [/salad|som tam|caesar|watermelon|quinoa/, "salad"], [/tikka|kebab|seekh|jhinga|chaap|angaar|bharwan|broccoli/, "skewer"], [/raan|platter|chops|salmon|rawas|steak|supreme/, "plate"], [/soup|shorba|tom kha|manchow|cappuccino|risotto|khichdi|curd rice|jeera|basmati/, "bowl"], [/curry/, "kadai"]],
  bar: [[/martini|cosmopolitan/, "martini"], [/old fashioned|negroni|sour|smoke|whisky|bourbon|old monk/, "tumbler"], [/margarita|the sky/, "coupe"], [/spritz|garden|aura|last light|tonic/, "balloon"], [/collins|mojito|long island|cooler|fizz|bloody|chaas|juice|soda|soft|pina|cold brew/, "highball"], [/brut|prosecco|chandon|moet/, "flute"], [/chai|kahwa|tea|coffee|espresso|americano|cappuccino|latte|flat white|chocolate/, "cup"]]
};
const GLYPH_SEC = { soups: "bowl", tandoor: "skewer", "small-plates": "plate", salads: "salad", "pizza-pasta": "pizza", curries: "kadai", "grills-woks": "plate", biryani: "handi", breads: "plate", desserts: "sweets", cocktails: "coupe", classics: "coupe", "zero-proof": "highball", whisky: "tumbler", gin: "balloon", spirits: "tumbler", cognac: "snifter", wine: "wine", beer: "beer", coffee: "cup" };
const BAR_SECS = new Set(MENU.bar.sections.map(s => s.id));
function plainIds() { return TABK.flatMap(t => MENU[t].sections.filter(s => s.plain === true).map(s => s.id)); }
const PLAIN = new Set(plainIds());
const hashOf = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const PAL_K = Object.keys(PALETTE).slice(0, 10), PAL_B = Object.keys(PALETTE).slice(10);
const ROLE_PAL = { soup: "soups", salad: "salads", raita: "salads", bread: "breads", rice: "biryani", dessert: "desserts", curry: "curries", pizza: "pizza-pasta", pasta: "pizza-pasta",
  sushi: "small-plates", dumpling: "small-plates", tandoor: "tandoor", starter: "small-plates", main: "grills-woks",
  zero: "zero-proof", coffee: "coffee", cocktail: "cocktails", shot: "classics", draught: "beer", beer: "beer", wine: "wine", whisky: "whisky", vodka: "spirits", gin: "gin", rum: "spirits", tequila: "spirits", brandy: "cognac", liqueur: "cognac" };
const ROLE_GLYPH = { soup: "bowl", salad: "salad", raita: "bowl", bread: "plate", rice: "handi", dessert: "sweets", curry: "kadai", pizza: "pizza", pasta: "pasta", sushi: "plate", dumpling: "dumpling",
  tandoor: "skewer", starter: "plate", main: "plate", zero: "highball", coffee: "cup", cocktail: "coupe", shot: "tumbler", draught: "beer", beer: "beer", wine: "wine", whisky: "tumbler",
  vodka: "tumbler", gin: "balloon", rum: "tumbler", tequila: "tumbler", brandy: "snifter", liqueur: "snifter" };
const palOf = e => PALETTE[e.sec.id] ? e.sec.id : ROLE_PAL[role(e)] || (e.tab === "bar" ? PAL_B : PAL_K)[hashOf(e.sec.id) % PAL_K.length];
function glyphOf(e) { const n = norm(e.item.n); for (const [re, g] of GLYPH_RULES[e.tab]) if (re.test(n)) return g; return GLYPH_SEC[e.sec.id] || ROLE_GLYPH[role(e)] || (e.tab === "bar" ? "tumbler" : "plate"); }
const mono = n => (String(n).replace(/^(the|a)\s+/i, "")[0] || "").toUpperCase();
function artTile(a, cls = "", extra = "") {
  const ang = 128 + a.seed % 48, rot = (a.seed >> 4) % 13 - 6;
  return `<span class="art g-${a.g} p-${a.p}${a.bar ? " bar" : ""}${cls ? " " + cls : ""}" style="--ang:${ang}deg;--rot:${rot}deg" aria-hidden="true"><span class="art-g"></span>${a.m ? `<span class="art-m">${esc(a.m)}</span>` : ""}${extra}</span>`;
}
function artHTML(e, cls = "", extra = "") {
  if (e.item.img) return `<span class="art${cls ? " " + cls : ""}" aria-hidden="true"><img src="${esc(e.item.img)}" alt="" loading="lazy" decoding="async">${extra}</span>`;
  return artTile({ g: glyphOf(e), p: palOf(e), bar: e.tab === "bar", seed: hashOf(e.id), m: mono(e.item.n) }, cls, extra);
}

/* ---------------- items: one template for list rows, cards and rails ---------------- */
function priceLine(e) {
  const multi = arr(e.item.p).length > 1;
  return options(e).map(([p, i]) => `<span>${multi && e.cols ? `<small>${esc(e.cols[i])}</small>` : ""}₹${fmt(p)}</span>`).join("");
}
function itemHTML(e, o = {}) {
  const it = e.item, k = e.tab === "kitchen", kind = o.kind || "row", out = OUT.has(e.id);
  const noart = kind === "row" && !it.img && (o.plain != null ? o.plain : PLAIN.has(e.sec.id));
  const cls = ["it", kind !== "row" ? "card " + kind : "", noart ? "noart" : "", o.sm ? "sm" : "", out ? "out" : ""].filter(Boolean).join(" ");
  let art = "";
  if (!noart) {
    const extra = kind === "spc" ? `<span class="ribbon shine">${STAR}${esc(o.ribbon || "Special")}</span>`
      : kind === "ex" ? `<span class="ex-shade"></span><span class="stamp"><span class="logo"></span>Only at Tressa</span>` : "";
    art = artHTML(e, "it-art", extra);
  }
  const top = (k ? markHTML(it.v) : "") + tagsHTML(it) + spiceHTML(it.s);
  const txt = `<span class="it-txt">${o.sec ? `<span class="row-sec">${TABS[e.tab]} · ${esc(e.grp ? e.grp.g : e.sec.short)}</span>` : ""}${top ? `<span class="it-top">${top}</span>` : ""}<span class="it-name">${esc(it.n)}</span>${it.r ? `<span class="it-region">${esc(it.r)}</span>` : ""}${o.note ? `<span class="it-note">${esc(o.note)}</span>` : ""}<span class="it-price">${priceLine(e)}</span>${kind === "row" && it.d ? `<span class="it-desc">${esc(it.d)}</span>` : ""}</span>`;
  return `<li class="${cls}" data-diet="${it.v || ""}"><button class="it-main" type="button" data-id="${e.id}">${art}${txt}</button><div class="it-ctl ctl" data-ctl="${e.id}">${ctlHTML(e)}</div></li>`;
}
const rowHTML = (e, o = {}) => itemHTML(e, { sm: true, sec: o.sec });
function sectionHTML(tab, sec) {
  const id = `${tab[0]}-${sec.id}`, plain = PLAIN.has(sec.id);
  let body = "", cur = [], label = null;
  // dishes with a photo come first in each group (stable, so menu order is kept otherwise)
  const flush = () => { if (cur.length) body += (label ? `<p class="grp-label">${esc(label)}</p>` : "") + `<ul class="group${plain ? " plain" : ""}">${cur.sort((a, b) => !!b.item.img - !!a.item.img).map(e => itemHTML(e)).join("")}</ul>`; cur = []; };
  for (const it of sec.items) { if (it.g) { flush(); label = it.g; continue; } if (INDEX[it.id]) cur.push(INDEX[it.id]); }
  flush();
  const n = sec.items.filter(i => !i.g).length;
  return `<section class="sec pad" id="${id}" data-short="${esc(sec.short)}" aria-labelledby="${id}-h">
    <header class="sec-head"><p class="eyebrow">${esc(sec.eyebrow)}</p><div class="sec-titlerow"><h2 id="${id}-h">${esc(sec.title)}</h2><span class="cnt">${countLabel(n, tab)}</span></div>${sec.sub ? `<p class="sec-sub">${esc(sec.sub)}</p>` : ""}</header>${body}</section>`;
}
const STAR = '<svg class="ostar" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
function quickHTML(tab) {
  const live = OFFERS.filter(offerLive).length;
  const offer = OFFERS.length ? `<button class="qt hl" type="button" data-act="offers"><span class="qt-l">${STAR}Offers</span><span class="qt-s">${live ? `${live} on now` : `${OFFERS.length} offers`}</span></button>` : "";
  const planT = `<button class="qt pl" type="button" data-act="plan"><span class="qt-l">Order for me</span><span class="qt-s">5 quick taps</span></button>`;
  return `<section class="quick" aria-label="Quick picks"><div class="qrow" data-lenis-prevent>${offer}${planT}${COLLECTIONS[tab].map(c => {
    const n = colItems(tab, c).length;
    if (!n) return "";
    return `<button class="qt" type="button" data-col="${c.id}"><span class="qt-l">${esc(c.label)}</span><span class="qt-s">${countLabel(n, tab)}</span></button>`;
  }).join("")}</div></section>`;
}
function railHTML(tab, kind) {
  const sp = kind === "today";
  const items = sp ? LIVE.specials[tab].map(x => [INDEX[x.id], x.note]) : LIVE.exclusive[tab].map(id => [INDEX[id], ""]);
  if (!items.length) return "";
  const id = `${tab[0]}-${kind}`;
  const h = sp ? { eb: tab === "kitchen" ? "Fresh today" : "Tonight at the bar", t: "Today's Specials", s: "Specials" }
               : { eb: "Signatures", t: "Only at Tressa", s: "Only at Tressa", sub: tab === "kitchen" ? "Plates you won't find anywhere else." : "Pours created for Tressa." };
  return `<section class="sec rail" id="${id}" data-short="${h.s}" aria-labelledby="${id}-h"><header class="sec-head"><p class="eyebrow">${h.eb}</p><div class="sec-titlerow"><h2 id="${id}-h">${h.t}</h2><span class="cnt">${countLabel(items.length, tab)}</span></div>${h.sub ? `<p class="sec-sub">${h.sub}</p>` : ""}</header><ul class="track ${sp ? "sp-track" : "ex-track"}" data-lenis-prevent>${items.map(([e, note]) => itemHTML(e, { kind: sp ? "spc" : "ex", note })).join("")}</ul></section>`;
}
function recHTML(tab) {
  const items = LIVE.recommended[tab].map(id => INDEX[id]);
  if (!items.length) return "";
  const id = `${tab[0]}-rec`;
  return `<section class="sec pad" id="${id}" data-short="Recommended" aria-labelledby="${id}-h"><header class="sec-head"><p class="eyebrow">Our picks</p><div class="sec-titlerow"><h2 id="${id}-h">Recommended</h2><span class="cnt">${countLabel(items.length, tab)}</span></div><p class="sec-sub">${tab === "kitchen" ? "What we'd order tonight." : "What we'd pour you tonight."}</p></header><ul class="group">${items.map(e => itemHTML(e, { plain: false })).join("")}</ul></section>`;
}
const panelHTML = tab => railHTML(tab, "today") + railHTML(tab, "only") + recHTML(tab) + MENU[tab].sections.map(s => sectionHTML(tab, s)).join("");

/* banners */
const OFFER_ART = { sunset: ["coupe", "cocktails"], lunch: ["plate", "small-plates"], raan: ["plate", "tandoor"], wine: ["bottle", "wine"], bday: ["cake", "desserts"] };
function bannerArt(b) {
  const shade = '<span class="bn-shade"></span>';
  if (b.link.type === "item" && INDEX[b.link.id]) return artHTML(INDEX[b.link.id], "", shade);
  const [g, p] = b.link.type === "offer" ? (OFFER_ART[b.link.id] || ["coupe", "cocktails"]) : b.tab === "bar" ? ["coupe", "cocktails"] : ["plate", "tandoor"];
  return artTile({ g, p, bar: BAR_SECS.has(p), seed: hashOf(b.id), m: "" }, "", shade);
}
function bannerHTML(list) {
  const slides = list.map((b, i) => {
    const e = b.link.type === "item" ? INDEX[b.link.id] : null;
    const foot = e ? `<span class="bn-price">₹${fmt(e.minP)}</span><div class="bn-ctl ctl" data-ctl="${e.id}">${ctlHTML(e)}</div>` : `<span class="bn-cta">${b.link.type === "offer" ? "VIEW OFFER" : "SEE ALL"}</span>`;
    return `<article class="bn${i ? "" : " on"}" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}">${bannerArt(b)}<button class="bn-hit" type="button" data-bn="${esc(b.id)}" aria-label="${esc(b.tag)}: ${esc(b.title)}"></button><div class="bn-body"><span class="bn-tag shine">${STAR}${esc(b.tag)}</span><h3 class="bn-title">${esc(b.title)}</h3>${b.line ? `<p class="bn-line">${esc(b.line)}</p>` : ""}<div class="bn-foot">${foot}</div></div></article>`;
  }).join("");
  const prog = list.length > 1 ? `<div class="bn-prog" aria-hidden="true">${list.map((_, i) => `<i${i ? "" : ' class="on"'}><b></b></i>`).join("")}</div>` : "";
  return `<section class="bnr" aria-roledescription="carousel" aria-label="Highlights"><div class="bn-track" data-lenis-prevent>${slides}</div>${prog}</section>`;
}

/* ---------------- elements ---------------- */
const root = document.documentElement;
const navbar = $("#navbar"), nbTitle = $("#nbTitle"), chipbar = $("#chipbar"), chips = $("#chips");
const nbCrest = $(".nb-crest");
const vegBtn = $("#vegToggle"), badge = $("#badge"), toastEl = $("#toast");
const sheet = $("#sheet"), sheetBody = $("#sheetBody"), scrim = $("#scrim");
const search = $("#search"), qInput = $("#q"), results = $("#results");
const panels = { kitchen: $("#panel-kitchen"), bar: $("#panel-bar") };
const quickWrap = $("#quickWrap"), bannerWrap = $("#bannerWrap"), adminEl = $("#admin");
const renderQuick = () => { if (state.tab) quickWrap.innerHTML = quickHTML(state.tab); };
panels.kitchen.innerHTML = panelHTML("kitchen");
panels.bar.innerHTML = panelHTML("bar");

/* ---------------- libraries: GSAP, Lenis, Fuse.js ---------------- */
const hasGsap = !reduce && !!window.gsap;
let lenis = null;
if (!reduce && window.Lenis) { try { lenis = new Lenis({ duration: 1.1, smoothWheel: true }); } catch (err) { lenis = null; } }
if (lenis) {
  if (hasGsap) { if (window.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); lenis.on("scroll", ScrollTrigger.update); } gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  else { const loop = t => { lenis.raf(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
let fuse = null;
const buildSearch = () => {
  fuse = window.Fuse ? new Fuse(ORDER, {
    keys: [{ name: "sn", weight: 3 }, { name: "sg", weight: 1.4 }, { name: "ss", weight: 1.2 }, { name: "sr", weight: 1 }, { name: "sd", weight: .8 }],
    threshold: .34, ignoreLocation: true, minMatchCharLength: 2
  }) : null;
};
buildSearch();
const scrollToY = (y, instant) => { if (lenis) lenis.scrollTo(y, instant ? { immediate: true, force: true } : { duration: 1 }); else window.scrollTo({ top: y, behavior: instant || reduce ? "auto" : "smooth" }); };

/* ---------------- top bar glass + sticky category bar ---------------- */
let chipStick = 300;
function measureHero() {
  chipStick = Math.max(0, quickWrap.offsetTop + quickWrap.offsetHeight - navbar.offsetHeight);
}
function onScroll() {
  const s = window.scrollY;
  root.style.setProperty("--nbp", smooth(0, 24, s).toFixed(3));
  root.style.setProperty("--cbp", smooth(chipStick - 36, chipStick, s).toFixed(3));
}

/* ---------------- chips & scrollspy ---------------- */
let activeSec = null;
const stickH = () => navbar.offsetHeight + chipbar.offsetHeight;
const visibleSecs = () => $$(".sec", panels[state.tab]).filter(s => !s.hidden);
function renderChips() {
  chips.innerHTML = visibleSecs().map(s => `<button class="chip" type="button" data-target="${s.id}">${esc(s.dataset.short)}</button>`).join("");
  activeSec = null;
}
function spy(force) {
  const secs = visibleSecs(); if (!secs.length) return;
  const line = stickH() + 24; let cur = secs[0];
  for (const s of secs) { if (s.getBoundingClientRect().top <= line) cur = s; else break; }
  if (cur.id === activeSec && !force) return;
  activeSec = cur.id;
  let on = null;
  $$(".chip", chips).forEach(c => { const a = c.dataset.target === cur.id; c.classList.toggle("on", a); if (a) { c.setAttribute("aria-current", "true"); on = c; } else c.removeAttribute("aria-current"); });
  if (on) chips.scrollTo({ left: on.offsetLeft - 64, behavior: reduce ? "auto" : "smooth" });
}
function goTo(el) { scrollToY(el.getBoundingClientRect().top + window.scrollY - stickH() + 1); }

/* ---------------- tabs ---------------- */
function markTabbar(which) {
  $$(".tb").forEach(b => {
    const on = b.dataset.tab ? b.dataset.tab === which : b.id === "tb-" + which;
    b.classList.toggle("on", on);
    if (b.dataset.tab) { if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
  });
}
function setTab(tab, opts = {}) {
  if (!TABS[tab]) tab = "kitchen";
  const prev = state.tab;
  if (prev && prev !== tab) state.pos[prev] = window.scrollY;
  state.tab = tab;
  document.body.classList.toggle("is-bar", tab === "bar");
  for (const k in panels) panels[k].hidden = k !== tab;
  vegBtn.hidden = tab !== "kitchen";
  markTabbar(tab);
  renderQuick(); renderBanners(); renderChips(); updateStatus();
  try { history.replaceState(null, "", "#" + tab); } catch (err) {}
  if (prev && prev !== tab) scrollToY(state.pos[tab] || 0, true);
  if (hasGsap && opts.animate) gsap.fromTo(panels[tab], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .35, ease: "power2.out", clearProps: "opacity,transform" });
  measureHero(); onScroll(); spy(true);
  if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  reveal(panels[tab]);
}

/* ---------------- veg filter ---------------- */
function applyVeg() {
  const on = state.veg, panel = panels.kitchen;
  vegBtn.setAttribute("aria-pressed", String(on));
  $$(".it", panel).forEach(r => { r.hidden = on && r.dataset.diet !== "v"; });
  $$(".group, .track", panel).forEach(g => {
    const any = $$(".it", g).some(r => !r.hidden);
    g.hidden = !any;
    const lab = g.previousElementSibling; if (lab && lab.classList.contains("grp-label")) lab.hidden = !any;
  });
  $$(".sec", panel).forEach(sec => {
    const n = $$(".it:not([hidden])", sec).length;
    sec.hidden = n === 0;
    const c = $(".cnt", sec); if (c) c.textContent = countLabel(n, "kitchen");
  });
  if (state.tab === "kitchen") { renderQuick(); renderBanners(); renderChips(); spy(true); }
}

/* ---------------- opening status (Pune time) ---------------- */
function istMinutes() {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    return (+parts.find(p => p.type === "hour").value % 24) * 60 + +parts.find(p => p.type === "minute").value;
  } catch (err) { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
}
function updateStatus() {
  const t = istMinutes(), el = $("#status");
  let open = false, text;
  if (t < 720) text = "Opens at 12 PM";
  else if (state.tab === "bar") { open = t < 1425; text = open ? "Last call 11:45 PM" : "Bar closed for tonight"; }
  else { open = t < 1410; text = open ? "Last orders 11:30 PM" : "Kitchen closed · Bar till 12 AM"; }
  el.classList.toggle("closed", !open);
  $("span", el).textContent = (VENUE ? VENUE.name + " · " : "") + text;
}

/* ---------------- my list ---------------- */
function entries() {
  return Object.entries(state.list).map(([k, q]) => {
    const [id, vi] = k.split("|"), e = INDEX[id]; if (!e || q <= 0) return null;
    return { k, id, vi: +vi, q, e, price: arr(e.item.p)[+vi] };
  }).filter(Boolean).sort((a, b) => a.e.ord - b.e.ord || a.vi - b.vi);
}
function updateTray() {
  const es = entries(), count = es.reduce((s, x) => s + x.q, 0);
  badge.hidden = !count; badge.textContent = count;
  $("#tb-list").setAttribute("aria-label", count ? `My List, ${count} ${count === 1 ? "item" : "items"}` : "My List");
}
function updateCtls() { $$(".ctl[data-ctl]").forEach(c => { const e = INDEX[c.dataset.ctl]; if (e) c.innerHTML = ctlHTML(e); }); }
let toastT = null;
const suggested = new Set();
const CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CHEV = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
function hideToastLater(ms) { clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), ms); }
function toast(msg, pair) {
  let html = `<div class="t-top"><span class="t-msg">${CHECK}<span>${esc(msg)}</span></span><button class="t-view" type="button" data-act="tray">View list</button></div>`;
  if (pair) {
    const o = options(pair), [p, i] = o[0];
    html += `<div class="t-pair"><button class="t-pn" type="button" data-id="${pair.id}"><span class="t-pl">Goes well with</span><b>${esc(pair.item.n)}</b><small>${o.length > 1 && pair.cols ? esc(pair.cols[i]) + " · " : ""}₹${fmt(p)}</small></button><button class="t-add" type="button" data-act="pair-add" data-key="${pair.id}|${i}" aria-label="Add ${esc(pair.item.n)}">ADD</button></div>`;
  }
  toastEl.innerHTML = html;
  toastEl.classList.add("show");
  hideToastLater(pair ? 6000 : 2600);
}
toastEl.addEventListener("pointerdown", () => clearTimeout(toastT));
toastEl.addEventListener("pointerleave", () => { if (toastEl.classList.contains("show")) hideToastLater(2400); });

/* pairing: something from the other side of the menu that suits what was just added */
function vegSwap(p) { return ORDER.find(x => x.tab === "kitchen" && x.sec.id === p.sec.id && x.item.v === "v" && (has(x, "best") || has(x, "chef")) && !qtyOf(x.id)) || null; }
function pairFor(e) {
  const want = e.tab === "kitchen" ? "bar" : "kitchen";
  for (const pid of [e.item.pair, e.sec.pair]) {
    let p = INDEX[pid];
    if (!p || p.tab !== want) continue;
    if (p.tab === "kitchen" && state.veg && p.item.v !== "v") p = vegSwap(p);
    if (p && !qtyOf(p.id) && !suggested.has(p.id) && !OUT.has(p.id)) return p;
  }
  return null;
}
function bumpBadge() { if (hasGsap) gsap.fromTo(badge, { scale: 1.4 }, { scale: 1, duration: .5, ease: "back.out(3)" }); }
function setQty(key, q, opts = {}) {
  const before = state.list[key] || 0;
  if (q > before && OUT.has(key.split("|")[0])) return;
  if (q <= 0) delete state.list[key]; else state.list[key] = Math.min(20, q);
  save(); updateTray(); updateCtls();
  if (q > before) {
    buzz(); if (!opts.fly) bumpBadge();
    const e = INDEX[key.split("|")[0]];
    if (opts.fromPair) toast(`${e.item.n} added`);
    else if (!stack.length && before === 0 && qtyOf(e.id) === q) {
      const p = pairFor(e);
      if (p) suggested.add(p.id);
      toast(`${e.item.n} added`, p);
    }
  }
  if (stack.length) renderSheet(false);
}

/* My List: spot a missing course, or a cheaper way to pour */
function listSuggestions(es) {
  const out = [], inList = id => es.some(x => x.id === id);
  const kitchen = es.filter(x => x.e.tab === "kitchen"), bar = es.filter(x => x.e.tab === "bar");
  const vegOnly = state.veg || (kitchen.length > 0 && kitchen.every(x => x.e.item.v === "v"));
  const okFood = e => e.tab !== "kitchen" || !vegOnly || e.item.v === "v";
  const pick = (ids, k = 2) => [...new Set(ids)].map(i => INDEX[i]).filter(e => e && !inList(e.id) && okFood(e) && !OUT.has(e.id)).slice(0, k);
  const inSec = id => kitchen.some(x => x.e.sec.id === id);
  const pairsFrom = (list, tab) => list.map(x => x.e.item.pair || x.e.sec.pair).filter(id => INDEX[id] && INDEX[id].tab === tab);
  for (const x of bar) {
    const cols = x.e.cols, ps = arr(x.e.item.p);
    if (!cols || x.vi !== 0 || ps[1] == null) continue;
    const name = x.e.item.n;
    if (cols[1] === "Bottle" || cols[1] === "Pitcher") {
      const pours = cols[1] === "Bottle" ? 5 : 4.5, word = cols[1].toLowerCase(), many = Math.ceil(x.q / pours);
      const spend = x.q * ps[0], cost = many * ps[1], fill = x.q / (many * pours);
      const sw = { from: x.k, to: `${x.id}|1`, n: many, rest: 0 };
      const pourTxt = cols[1] === "Bottle" ? "5 glasses" : "about 4½ glasses";
      if (spend >= cost) out.push({ t: `Switch to a ${word} and save ₹${fmt(spend - cost)}`, s: `${x.q} glasses of ${name} cost ₹${fmt(spend)}. A ${word} pours ${pourTxt} for ₹${fmt(ps[1])}.`, sw });
      else if (x.q >= 3 && fill >= .75) out.push({ t: `A ${word} is only ₹${fmt(cost - spend)} more`, s: `It pours ${pourTxt} of ${name}. You have ${x.q}.`, sw });
    } else if (cols[0] === "30 ml" && x.q >= 2) {
      const pairs = Math.floor(x.q / 2), save = pairs * (2 * ps[0] - ps[1]);
      if (save > 0) out.push({ t: `Make it 60 ml and save ₹${fmt(save)}`, s: `${pairs * 2} × 30 ml of ${name} is the same pour as ${pairs} × 60 ml.`, sw: { from: x.k, to: `${x.id}|1`, n: pairs, rest: x.q % 2 } });
    }
  }
  const inRole = (r, list = kitchen) => list.some(x => role(x.e) === r);
  const firstOf = (test, k = 2) => pick(ORDER.filter(e => test(e) && !inList(e.id)).sort((x, y) => has(y, "chef") - has(x, "chef")).map(e => e.id), k);
  if (inRole("curry") && !inRole("bread") && !inRole("rice")) out.push({ t: "Breads for your curries", s: "Most tables order one or two per person.", items: firstOf(e => role(e) === "bread" && /butter naan|garlic naan|laccha/i.test(e.item.n), 3) });
  if (bar.length && !kitchen.length) out.push({ t: "Something to go with your drinks", s: "Small plates that suit what you're drinking.", items: [...pick(pairsFrom(bar, "kitchen")), ...firstOf(e => e.tab === "kitchen" && role(e) === "starter")].slice(0, 2) });
  if (kitchen.length && !bar.length) out.push({ t: "Nothing to drink yet", s: "A cocktail to go with your food, or a mocktail.", items: [...firstOf(e => e.tab === "bar" && role(e) === "cocktail", 1), ...firstOf(e => e.tab === "bar" && role(e) === "zero", 1)] });
  if (kitchen.some(x => ["curry", "main", "pizza", "pasta", "rice"].includes(role(x.e))) && !inRole("dessert")) out.push({ t: "Save room for dessert?", s: "Something sweet to finish.", items: firstOf(e => role(e) === "dessert") });
  return out.filter(o => o.sw || (o.items && o.items.length)).slice(0, 3);
}
function suggHTML(es) {
  const list = listSuggestions(es);
  if (!list.length) return "";
  return `<div class="sugg"><p class="sugg-h">Complete your table</p>${list.map(o => {
    if (o.sw) return `<div class="sg"><div class="sg-top"><span class="sg-t">${esc(o.t)}<small>${esc(o.s)}</small></span><button class="add-xs" type="button" data-act="switch" data-from="${o.sw.from}" data-to="${o.sw.to}" data-n="${o.sw.n}" data-rest="${o.sw.rest}">SWITCH</button></div></div>`;
    return `<div class="sg"><span class="sg-t">${esc(o.t)}<small>${esc(o.s)}</small></span><div class="sg-items">${o.items.map(e => {
      const op = options(e), [p, vi] = op[0];
      return `<div class="sg-it"><button class="sg-nm" type="button" data-id="${e.id}">${e.tab === "kitchen" ? markHTML(e.item.v) : ""}<span>${esc(e.item.n)}</span><small>${op.length > 1 && e.cols ? esc(e.cols[vi]) + " · " : ""}₹${fmt(p)}</small></button><button class="add-xs" type="button" data-act="add" data-key="${e.id}|${vi}" aria-label="Add ${esc(e.item.n)}">ADD</button></div>`;
    }).join("")}</div></div>`;
  }).join("")}</div>`;
}

/* ---------------- sheets (stack of views) ---------------- */
let stack = [], lastFocus = null, closeToken = 0, clearTimer = null;
const stepperHTML = (key, q) => `<span class="stepper"><button type="button" data-act="dec" data-key="${key}" aria-label="Remove one">−</button><output aria-live="polite">${q}</output><button type="button" data-act="inc" data-key="${key}" aria-label="Add one">+</button></span>`;
function viewTitle(v) {
  if (v.v === "col") return COLLECTIONS[v.tab].find(c => c.id === v.id).label;
  if (v.v === "tray") return "My List";
  if (v.v === "info") return "About";
  if (v.v === "offers") return "Offers";
  if (v.v === "offer") return OFFERS.find(o => o.id === v.id).title;
  if (v.v === "plan") return "Order for me";
  return INDEX[v.id] ? INDEX[v.id].item.n : "Menu";
}
const backHTML = () => stack.length > 1 ? `<button class="back" type="button" data-act="back">${CHEV}${esc(viewTitle(stack[stack.length - 2]))}</button>` : "";

function itemView(id) {
  if (!INDEX[id]) return { dark: false, html: `${backHTML()}<h3 class="sh-name" id="sh-title"><span>No longer on the menu</span></h3><p class="sh-desc">This item was just taken off the menu. Ask your server for something similar.</p>` };
  const e = INDEX[id], it = e.item, k = e.tab === "kitchen";
  const facts = [], wide = [];
  if (it.q) facts.push(["Portion", it.q]);
  if (k) facts.push(["Diet", DIET[it.v]]);
  if (it.s) facts.push(["Spice", SPICE[it.s]]);
  if (it.k) facts.push(["Energy", `${it.k} kcal`]);
  if (!k && e.cols && arr(it.p).length > 1) facts.push(["Measure", e.cols.join(" · ")]);
  if (it.a) wide.push(["Contains", it.a.split(",").map(c => ALLERGENS[c.trim()]).join(", ")]);
  if (it.x) wide.push(["Good to know", it.x]);
  const fx = facts.map((f, i) => `<div${facts.length % 2 && i === facts.length - 1 ? ' class="w"' : ""}><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join("") + wide.map(f => `<div class="w"><dt>${f[0]}</dt><dd>${esc(f[1])}</dd></div>`).join("");
  const pid = it.pair || e.sec.pair, pe = pid && INDEX[pid];
  const pair = pe ? `<div class="sh-pair"><p>Pairs well with</p><button class="pair-card" type="button" data-id="${pe.id}"><span><b>${esc(pe.item.n)}</b><small>${TABS[pe.tab]} · ${esc(pe.sec.title)}</small></span><span class="pp">₹${fmt(pe.minP)}</span></button></div>` : "";
  const opts = options(e), ps = arr(it.p);
  let act;
  if (opts.length === 1) {
    const [p, i] = opts[0], key = `${id}|${i}`, q = state.list[key] || 0;
    act = q ? `<div class="var-row"><span class="vl">In your list<small>₹${fmt(p)} each</small></span>${stepperHTML(key, q)}</div>`
            : `<button class="btn-primary" type="button" data-act="add" data-key="${key}"><span>Add to My List</span><span class="bp">₹${fmt(p)}</span></button>`;
  } else {
    act = opts.map(([p, i]) => {
      const key = `${id}|${i}`, q = state.list[key] || 0;
      return `<div class="var-row"><span class="vl">${esc(e.cols ? e.cols[i] : "Option " + (i + 1))}<small>₹${fmt(p)}</small></span>${q ? stepperHTML(key, q) : `<button class="add-sm" type="button" data-act="add" data-key="${key}">ADD</button>`}</div>`;
    }).join("");
  }
  if (OUT.has(id)) act = `<button class="btn-primary" type="button" disabled><span>Sold out today</span></button>`;
  const tags = tagsHTML(it) + spiceHTML(it.s), desc = it.l || it.d || e.sec.serve;
  return { dark: false, html: `${backHTML()}<div class="sh-art">${artHTML(e)}</div>
    <p class="sh-eyebrow">${TABS[e.tab]} · ${esc(e.sec.title)}${e.grp ? " · " + esc(e.grp.g) : ""}</p>
    <h3 class="sh-name" id="sh-title">${k ? markHTML(it.v) : ""}<span>${esc(it.n)}</span></h3>
    ${it.r ? `<p class="sh-region">${esc(it.r)}</p>` : ""}
    ${tags ? `<div class="sh-tags">${tags}</div>` : ""}
    ${desc ? `<p class="sh-desc">${esc(desc)}</p>` : ""}
    ${fx ? `<dl class="sh-facts">${fx}</dl>` : ""}
    ${pair}
    <div class="sh-actions">${act}</div>
    <p class="sh-fine">${k ? "Tell your server about any allergy before you order." : "Please drink responsibly."} Your list stays on this phone; your server takes the order.</p>` };
}
function colView(tab, id) {
  const c = COLLECTIONS[tab].find(x => x.id === id), items = colItems(tab, c);
  return { dark: true, html: `${backHTML()}<p class="sh-eyebrow">${TABS[tab]} · Quick pick · ${countLabel(items.length, tab)}</p><h3 class="sh-name" id="sh-title"><span>${esc(c.title)}</span></h3><p class="sh-desc">${esc(c.sub)}${tab === "kitchen" && state.veg ? " Showing vegetarian dishes only." : ""}</p><ul class="group">${items.map(e => rowHTML(e, { sec: true })).join("")}</ul>` };
}
function trayView() {
  const es = entries();
  if (!es.length) return { dark: false, html: `${backHTML()}<p class="sh-eyebrow">Your selection</p><h3 class="sh-name" id="sh-title"><span>My List</span></h3><p class="sh-desc">Nothing here yet. Tap ADD next to any dish or drink, or answer five quick questions and we'll plan the table for you.</p><div class="sh-actions"><button class="btn-primary c" type="button" data-act="plan">Plan my table</button><button class="btn-soft" type="button" data-act="close">Browse the menu</button></div>` };
  const total = es.reduce((s, x) => s + x.q * x.price, 0), count = es.reduce((s, x) => s + x.q, 0);
  const both = es.some(x => x.e.tab === "kitchen") && es.some(x => x.e.tab === "bar");
  let rows = "", last = "";
  for (const x of es) {
    if (x.e.tab !== last) { if (last) rows += "</ul>"; rows += `${both ? `<p class="tr-group">${TABS[x.e.tab]}</p>` : ""}<ul class="tr-list">`; last = x.e.tab; }
    const vlabel = arr(x.e.item.p).length > 1 && x.e.cols ? esc(x.e.cols[x.vi]) + " · " : "";
    rows += `<li class="tr-row"><button class="tr-name" type="button" data-id="${x.id}">${x.e.tab === "kitchen" ? markHTML(x.e.item.v) : ""}<span><b>${esc(x.e.item.n)}</b><small>${vlabel}₹${fmt(x.price)} each</small></span></button>${stepperHTML(x.k, x.q)}</li>`;
  }
  rows += "</ul>";
  return { dark: false, html: `${backHTML()}<p class="sh-eyebrow">Your selection · ${count} ${count === 1 ? "item" : "items"}</p>
    <h3 class="sh-name" id="sh-title"><span>My List</span></h3>
    <p class="sh-desc">When you're ready, tap Show to server and hand over your phone.</p>
    ${rows}
    ${suggHTML(es)}
    <div class="tr-total"><span>Estimated total</span><strong>₹${fmt(total)}</strong></div>
    <p class="sh-fine">Before taxes. Your server confirms the final bill.</p>
    <div class="tr-actions v2"><button class="btn-primary c wide" type="button" data-act="server">Show to server</button><button class="btn-soft" type="button" data-act="clear">Clear</button><button class="btn-soft" type="button" data-act="close">Add more</button></div>` };
}
function infoView() {
  return { dark: false, html: `${backHTML()}<div class="info-top"><span class="info-crest logo" role="img" aria-label="Tressa crest"></span><h3 class="sh-name" id="sh-title"><span>TRESSA</span></h3><p class="sh-eyebrow">A world of experiences</p></div>
    <dl class="ilist">
      <div><dt>Address</dt><dd>Jarvari Road, Pimple Saudagar, Pune 411027</dd></div>
      <div><dt>Hours</dt><dd>12 PM – 12 AM, every day</dd></div>
      <div><dt>Phone</dt><dd>+91 86006 27270</dd></div>
      <div><dt>Instagram</dt><dd>@tressa.experience</dd></div>
    </dl>
    <div class="ibtns"><a class="btn-primary c" href="https://www.tressaworld.com/booking" target="_blank" rel="noopener">Book a table</a><a class="btn-soft" href="https://www.tressaworld.com/suites" target="_blank" rel="noopener">Book suites</a></div>
    ${Source.canWrite ? `<button class="btn-soft staff" type="button" data-act="admin">Manage banners &amp; specials</button>` : ""}
    <div class="legend"><span>${markHTML("v")}Vegetarian</span><span>${markHTML("n")}Non-vegetarian</span><span>${markHTML("e")}Contains egg</span><span>${spiceHTML(2)}Spice level</span></div>
    <div class="inotes">
      <p>Please tell your server about any allergy or dietary need before you order. Many dishes can be made Jain or less spicy on request.</p>
      <p>All prices are in Indian Rupees. Government taxes as applicable. Spirits are listed per 30 ml and 60 ml, wine per 150 ml glass or 750 ml bottle.</p>
      <p>Spirits are served to guests aged 25 and above, beer and wine to guests aged 21 and above, as per Maharashtra excise rules. Please drink responsibly and never drink and drive.</p>
      <p>FSSAI Lic. No. 115XXXXXXXXXXX · Menu effective November 2026</p>
    </div>` };
}
function offersView() {
  const cards = OFFERS.map(o => {
    const live = offerLive(o), n = offerItems(o).length;
    const inner = `<span class="of-top"><span class="of-where">${esc(o.where)}</span>${live ? `<span class="of-live">${STAR}On now</span>` : ""}</span><span class="of-title">${esc(o.title)}</span><span class="of-line">${esc(o.line)}</span><span class="of-foot"><span class="of-when">${esc(o.when)}</span>${n ? `<span class="of-cta">See ${n} ${n === 1 ? "item" : "items"} ›</span>` : ""}</span>`;
    return n ? `<button class="offer" type="button" data-offer="${o.id}">${inner}</button>` : `<div class="offer">${inner}</div>`;
  }).join("");
  return { dark: true, html: `${backHTML()}<p class="sh-eyebrow">Tressa · Offers</p><h3 class="sh-name" id="sh-title"><span>This Week's Offers</span></h3><p class="sh-desc">Your server applies offers to the bill. Offers can't be combined.</p><div class="offers">${cards}</div><p class="sh-fine">Offers exclude government taxes.</p>` };
}
function offerView(id) {
  const o = OFFERS.find(x => x.id === id), items = offerItems(o);
  return { dark: true, html: `${backHTML()}<p class="sh-eyebrow">Offer · ${esc(o.when)}</p><h3 class="sh-name" id="sh-title"><span>${esc(o.title)}</span></h3><p class="sh-desc">${esc(o.line)}</p><ul class="group">${items.map(e => rowHTML(e, { sec: true })).join("")}</ul>` };
}
/* ---------------- order for me: five taps to a planned table ---------------- */
const PLAN_Q = [
  { k: "n", step: "Guests", q: "How many of you are eating?", nums: true, opts: [[1, "1"], [2, "2"], [4, "3–4"], [6, "5–6"], [8, "7+"]] },
  { k: "diet", step: "Food", q: "What does the table eat?", opts: [["veg", "Vegetarian", "Only veg dishes"], ["non", "Non-veg", "Chicken, mutton and seafood"], ["mix", "A mix of both", "Half veg, half non-veg"]] },
  { k: "spice", step: "Spice", q: "How much heat?", opts: [[1, "Mild", "Creamy and gentle"], [2, "Medium", "A little kick"], [3, "Fiery", "Bring on the chilli"]] },
  { k: "drinks", step: "Drinks", q: "Anything to drink?", opts: [["cocktail", "Cocktails", "House signatures and classics"], ["beerwine", "Beer or wine", "Draught, glasses or a bottle"], ["zero", "Zero proof", "Coolers and mocktails"], ["none", "No drinks", "Just the food"]] },
  { k: "budget", step: "Budget", q: "What kind of evening?", opts: [["low", "Keep it light", "About ₹1,000 – 1,500 a head"], ["mid", "The full evening", "About ₹1,500 – 2,500 a head"], ["high", "Go all out", "₹2,500 and up, signatures and premium pours"]] }
];
let plan = null;
function startPlan() { plan = { step: 0, a: { diet: state.veg ? "veg" : undefined }, seed: 1, items: null }; openView({ v: "plan" }, false); }
function composePlan(a, seed) {
  let r = (seed * 7919 + 17) % 4294967296;
  const rnd = () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; };
  const n = a.n, maxS = a.spice, B = a.budget, D = a.diet, low = B === "low";
  const cap = low ? 600 : B === "mid" ? 1000 : Infinity;
  const out = [], used = new Set(OUT);
  const serves = e => { const m = /Serves (\d)/.exec(e.item.q || ""); return m ? +m[1] : 1; };
  const score = e => {
    const t = e.item.t || [], sp = heat(e), p = e.minP;
    let v = (t.includes("chef") ? 3 : 0) + (t.includes("best") ? 2.2 : 0) + (t.includes("new") ? .6 : 0);
    if (maxS === 3) v += sp * .7; else if (maxS === 1) v -= sp * .5;
    v += low ? -p / 350 : B === "high" ? p / 450 : -p / 1400;
    return v + rnd() * 2.4;
  };
  const wantAt = i => D === "veg" ? "veg" : D === "mix" ? (i % 2 ? "veg" : "non") : (i % 3 === 2 ? "veg" : "non");
  const fits = (e, want) => !want || (want === "veg" ? e.item.v === "v" : e.item.v !== "v");
  const add = (e, q, course, vi = 0) => { if (!e) return; used.add(e.id); out.push({ key: `${e.id}|${vi}`, q, course }); };
  const isCurry = x => role(INDEX[x.key.split("|")[0]]) === "curry";
  const byName = (rx, r) => ORDER.find(e => e.tab === "kitchen" && role(e) === r && rx.test(e.item.n) && !OUT.has(e.id) && (D !== "veg" || e.item.v === "v"));
  function take(secs, count, course, o = {}) {
    let slots = count, i = o.i0 || 0, guard = 0;
    while (slots > 0 && guard++ < 20) {
      const want = o.anyDiet && D !== "veg" ? null : wantAt(i);
      const base = ORDER.filter(e => e.tab === "kitchen" && secs.includes(role(e)) && !used.has(e.id) && heat(e) <= maxS && serves(e) <= n && e.minP / Math.min(serves(e), n) <= cap && (!o.filter || o.filter(e)));
      let cands = base.filter(e => fits(e, want));
      if (!cands.length && D !== "veg") cands = base;
      if (!cands.length) break;
      const best = cands.map(e => [score(e), e]).sort((x, y) => y[0] - x[0])[0][1];
      add(best, 1, course);
      slots -= serves(best) >= 2 ? 2 : 1; i++;
    }
  }
  let [st, mn, rc, ds] = { 1: [1, 1, 0, 1], 2: [2, 2, 1, 1], 4: [3, 3, 1, 2], 6: [4, 4, 1, 2], 8: [5, 5, 2, 3] }[n];
  if (low) { st = Math.ceil(st / 2); mn = Math.max(1, mn - (n >= 4 ? 1 : 0)); rc = n >= 4 ? 1 : 0; ds = n >= 4 ? 1 : 0; }
  if (B === "high") { if (n >= 2) st += 1; ds = Math.max(ds, Math.ceil(n / 2)); }
  const rounds = B === "high" ? Math.ceil(n * 1.5) : n;
  take(["tandoor", "starter"], st, "Starters", { filter: e => !/fries|platter/i.test(e.item.n) });
  const dal = n >= 2 && byName(/\bdal\b/i, "curry");
  if (dal) { add(dal, 1, "Mains"); mn--; }
  if (n === 1) take(["curry", "main", "pizza", "pasta"], mn, "Mains");
  else {
    const extra = mn >= 3 ? 1 : 0;
    take(["curry"], mn - extra, "Mains", { filter: e => !/\bdal\b/i.test(e.item.n) });
    if (extra) take(["main", "pizza", "pasta"], extra, "Mains", { i0: 1 });
  }
  if (out.some(x => x.course === "Mains" && isCurry(x))) {
    const c = n === 1 ? 2 : Math.ceil(n * (low ? 1.25 : 1.5)), b = Math.ceil(c / 2);
    add(byName(/butter naan/i, "bread") || byName(/naan|roti/i, "bread"), b, "Breads & rice");
    if (c - b) add(byName(/garlic naan/i, "bread") || byName(/roti|paratha/i, "bread"), c - b, "Breads & rice");
  }
  if (rc) {
    if (n <= 2) { if (out.some(isCurry)) add(byName(/jeera rice/i, "rice") || byName(/steamed|basmati/i, "rice"), 1, "Breads & rice"); }
    else take(["rice"], rc, "Breads & rice", { filter: e => /biryani/i.test(e.item.n) });
  }
  take(["dessert"], ds, "Dessert", { anyDiet: true });
  if (a.drinks === "cocktail" || a.drinks === "zero") {
    const want = a.drinks === "zero" ? "zero" : "cocktail";
    const pool = ORDER.filter(e => e.tab === "bar" && role(e) === want && !OUT.has(e.id) && !/water|soda|soft drink|^juice$|pitcher|tower/i.test(e.item.n) && arr(e.item.p).length < 3)
      .map(e => [score(e) + (/signature/i.test(e.sec.title) ? 1 : 0), e]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
    const k = Math.min(rounds, 4, pool.length);
    for (let j = 0; j < k; j++) add(pool[j], Math.floor(rounds / k) + (j < rounds % k ? 1 : 0), "Drinks");
  } else if (a.drinks === "beerwine") {
    // a draught or a wine, by the glass for one or two, by the pitcher or bottle for a table
    const wine = B !== "low", r = wine ? "wine" : "draught";
    const opts = ORDER.filter(e => e.tab === "bar" && (role(e) === r || (!wine && role(e) === "beer")) && !OUT.has(e.id) && e.cols)
      .sort((x, y) => (B === "high" ? y.minP - x.minP : x.minP - y.minP));
    const big = e => e.cols.findIndex((c, i) => /Bottle|Pitcher/.test(c) && arr(e.item.p)[i] != null);
    const pick1 = opts.find(e => n <= 2 || big(e) > 0) || opts[0];
    if (pick1) { const bi = big(pick1); if (n > 2 && bi > 0) add(pick1, Math.ceil(n / (pick1.cols[bi] === "Bottle" ? 5 : 4.5)), "Drinks", bi); else add(pick1, rounds, "Drinks", 0); }
  }
  return out;
}
function planView() {
  const p = plan;
  if (!p.items) {
    const Q = PLAN_Q[p.step], cur = p.a[Q.k];
    const prog = PLAN_Q.map((_, i) => `<i${i <= p.step ? ' class="on"' : ""}></i>`).join("");
    const opts = Q.opts.map(([val, label, sub]) => `<button class="pl-opt${String(cur) === String(val) ? " on" : ""}" type="button" data-act="pl-opt" data-val="${val}"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</button>`).join("");
    return { html: `${p.step ? `<button class="back" type="button" data-act="pl-back">${CHEV}${esc(PLAN_Q[p.step - 1].step)}</button>` : ""}<div class="pl-prog" aria-hidden="true">${prog}</div><p class="pl-step">Order for me · ${p.step + 1} of ${PLAN_Q.length}</p><h3 class="pl-q" id="sh-title">${esc(Q.q)}</h3><div class="pl-opts${Q.nums ? " nums" : ""}">${opts}</div>${p.step === 0 ? `<p class="sh-fine">Answer five quick questions and we'll plan a balanced table: starters, mains, breads, dessert and drinks. You can change anything before it goes into your list.</p>` : ""}` };
  }
  const lab = k => { const o = PLAN_Q.find(q => q.k === k).opts.find(o => String(o[0]) === String(p.a[k])); return o ? o[1] : ""; };
  const by = {}; p.items.forEach((x, i) => { (by[x.course] = by[x.course] || []).push([x, i]); });
  let rows = "", total = 0;
  for (const c of ["Starters", "Mains", "Breads & rice", "Dessert", "Drinks"]) {
    if (!by[c]) continue;
    rows += `<p class="pl-course">${c}</p><ul class="tr-list">` + by[c].map(([x, i]) => {
      const [id, vi] = x.key.split("|"), e = INDEX[id], price = arr(e.item.p)[+vi];
      total += price * x.q;
      const size = arr(e.item.p).length > 1 && e.cols ? esc(e.cols[+vi]) + " · " : "";
      return `<li class="tr-row"><button class="tr-name" type="button" data-id="${id}">${e.tab === "kitchen" ? markHTML(e.item.v) : ""}<span><b>${esc(e.item.n)}</b><small>${size}₹${fmt(price)} each</small></span></button><span class="stepper"><button type="button" data-act="pl-dec" data-i="${i}" aria-label="One less ${esc(e.item.n)}">−</button><output>${x.q}</output><button type="button" data-act="pl-inc" data-i="${i}" aria-label="One more ${esc(e.item.n)}">+</button></span></li>`;
    }).join("") + `</ul>`;
  }
  const head = Math.round(total / p.a.n / 10) * 10;
  const chipsH = [`${lab("n")} ${p.a.n === 1 ? "guest" : "guests"}`, lab("diet"), lab("spice"), lab("drinks"), lab("budget")].map(t => `<span>${esc(t)}</span>`).join("");
  return { html: `<button class="back" type="button" data-act="pl-back">${CHEV}Change answers</button><p class="sh-eyebrow">Order for me · Planned by Tressa</p><h3 class="sh-name" id="sh-title"><span>${p.a.n === 1 ? "Your meal" : `Your table for ${esc(lab("n"))}`}</span></h3><div class="pl-sum">${chipsH}</div>
    ${rows || `<p class="sh-desc">We couldn't find dishes for that combination. Try changing the spice or budget.</p>`}
    <div class="pl-total"><span>Estimated total</span><div><strong>₹${fmt(total)}</strong><small>About ₹${fmt(head)} a head</small></div></div>
    <div class="pl-actions"><button class="btn-soft" type="button" data-act="pl-shuffle">Shuffle</button><button class="btn-primary" type="button" data-act="pl-add"${p.items.length ? "" : " disabled"}><span>Add all to My List</span><span class="bp">₹${fmt(total)}</span></button></div>
    <p class="sh-fine">Shuffle for a different set of dishes. Tap any dish to read about it. Prices before taxes.</p>` };
}
function renderPlan() {
  renderSheet(true);
  if (hasGsap) gsap.from(sheetBody.children, { opacity: 0, x: 14, duration: .3, stagger: .02, ease: "power2.out", clearProps: "opacity,transform" });
  const f = $(".pl-opt", sheetBody) || $(".sheet-x", sheet); if (f) f.focus({ preventScroll: true });
}

function renderSheet(reset) {
  const v = stack[stack.length - 1]; if (!v) return;
  const st = sheet.scrollTop, ae = document.activeElement;
  const prev = ae && sheet.contains(ae) && ae.dataset && ae.dataset.key ? { act: ae.dataset.act, key: ae.dataset.key } : null;
  const out = v.v === "item" ? itemView(v.id) : v.v === "col" ? colView(v.tab, v.id) : v.v === "tray" ? trayView() : v.v === "offers" ? offersView() : v.v === "offer" ? offerView(v.id) : v.v === "plan" ? planView() : infoView();
  sheet.classList.toggle("dark", out.dark);
  sheetBody.innerHTML = out.html;
  sheet.scrollTop = reset ? 0 : st;
  if (prev) {
    const t = sheetBody.querySelector(`[data-key="${prev.key}"][data-act="${prev.act === "add" ? "inc" : prev.act}"]`) || sheetBody.querySelector(`[data-key="${prev.key}"]`) || $(".sheet-x", sheet);
    t.focus({ preventScroll: true });
  }
}
function lock() { root.classList.add("locked"); if (lenis) lenis.stop(); }
function unlock() { if (sheet.hidden && search.hidden && adminEl.hidden) { root.classList.remove("locked"); if (lenis) lenis.start(); } }
function openView(view, push) {
  const wasOpen = stack.length > 0;
  closeToken++;
  if (!wasOpen) lastFocus = document.activeElement;
  if (push && wasOpen) stack.push(view); else stack = [view];
  toastEl.classList.remove("show");
  renderSheet(true);
  if (!wasOpen) {
    sheet.hidden = false; scrim.hidden = false; lock();
    sheet.style.transform = ""; void sheet.offsetHeight;
    sheet.classList.add("open"); scrim.classList.add("open");
  }
  if (hasGsap) gsap.from(sheetBody.children, { opacity: 0, y: 10, duration: .42, stagger: .03, delay: wasOpen ? 0 : .1, ease: "power3.out", clearProps: "opacity,transform" });
  setTimeout(() => { const f = $(".sheet-x", sheet); if (f && stack.length) f.focus({ preventScroll: true }); }, wasOpen ? 0 : 80);
}
function backView() { if (stack.length > 1) { stack.pop(); renderSheet(true); } }
function closeSheet() {
  if (!stack.length) return;
  stack = [];
  sheet.classList.remove("open"); scrim.classList.remove("open");
  sheet.style.transform = ""; scrim.style.opacity = "";
  const token = ++closeToken;
  const done = () => {
    if (token !== closeToken) return;
    sheet.hidden = true; scrim.hidden = true; unlock();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  };
  reduce ? done() : setTimeout(done, 460);
}

/* swipe down to close, like an iOS sheet */
let drag = null;
sheet.addEventListener("touchstart", e => { if (sheet.scrollTop > 0 || e.touches.length > 1) { drag = null; return; } drag = { y: e.touches[0].clientY, t: Date.now(), dy: 0, on: false }; }, { passive: true });
sheet.addEventListener("touchmove", e => {
  if (!drag) return;
  const dy = e.touches[0].clientY - drag.y;
  if (!drag.on) { if (dy < -4) { drag = null; return; } if (dy > 8) drag.on = true; else return; }
  e.preventDefault();
  drag.dy = Math.max(0, dy - 8);
  sheet.style.transition = "none";
  sheet.style.transform = `translateY(${drag.dy}px)`;
  scrim.style.opacity = String(Math.max(.15, 1 - drag.dy / 480));
}, { passive: false });
sheet.addEventListener("touchend", () => {
  if (!drag) return;
  const d = drag; drag = null;
  sheet.style.transition = "";
  if (d.on && (d.dy > 110 || d.dy / Math.max(1, Date.now() - d.t) > .55)) closeSheet();
  else { sheet.style.transform = ""; scrim.style.opacity = ""; }
});

/* ---------------- search ---------------- */
const SUGS = ["Paneer", "Biryani", "Kolhapuri", "Prawns", "Single malt", "Zero proof", "Nashik", "Chocolate"];
function renderResults() {
  const raw = qInput.value.trim(), q = norm(raw);
  if (!q) { results.innerHTML = `<p class="s-hint">Try</p><div class="s-sugs">${SUGS.map(s => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>`; return; }
  const toks = q.split(/\s+/);
  const hits = ORDER.filter(e => toks.every(t => e.hay.includes(t)));
  if (fuse && q.length >= 3) {
    const seen = new Set(hits.map(e => e.id));
    for (const r of fuse.search(q)) if (!seen.has(r.item.id)) { hits.push(r.item); seen.add(r.item.id); }
  }
  if (!hits.length) { results.innerHTML = `<p class="s-empty">Nothing on the menu matches “${esc(raw)}”. Try a shorter word, like “paneer” or “gin”.</p>`; return; }
  const groups = new Map();
  for (const e of hits) { const key = e.tab + e.sec.id + (e.grp ? e.grp.g : ""); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); }
  let html = "";
  for (const list of groups.values()) {
    const e0 = list[0]; list.sort((a, b) => a.ord - b.ord);
    html += `<p class="grp-label">${TABS[e0.tab]} · ${esc(e0.grp ? e0.grp.g : e0.sec.title)}</p><ul class="group">${list.map(e => rowHTML(e)).join("")}</ul>`;
  }
  results.innerHTML = `<p class="s-count">${hits.length} ${hits.length === 1 ? "match" : "matches"}</p>${html}`;
}
let searchFocus = null;
function openSearch() {
  if (!search.hidden) { qInput.focus(); return; }
  searchFocus = document.activeElement;
  search.hidden = false; lock(); void search.offsetHeight; search.classList.add("open");
  markTabbar("search"); renderResults(); setTimeout(() => qInput.focus(), 40);
}
function closeSearch(next) {
  if (search.hidden) return;
  search.classList.remove("open"); qInput.blur();
  markTabbar(next || state.tab);
  const done = () => { search.hidden = true; unlock(); };
  reduce ? done() : setTimeout(done, 260);
}

/* ---------------- show to server ---------------- */
const serverEl = $("#server"), serverBody = $("#serverBody");
let wakeLock = null, serverFocus = null, tableNo = "";
function setTableNo(t) { tableNo = String(t || "").replace(/[^0-9a-z]/gi, "").slice(0, 6); try { sessionStorage.setItem("tressa-table", tableNo); } catch (err) {} }
try { tableNo = sessionStorage.getItem("tressa-table") || ""; } catch (err) {}
try { const u = new URLSearchParams(location.search), t = u.get("table") || u.get("t"); if (t) setTableNo(t); } catch (err) {}
function serverHTML() {
  const es = entries(), total = es.reduce((s, x) => s + x.q * x.price, 0), count = es.reduce((s, x) => s + x.q, 0);
  let time = "";
  try { time = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()); } catch (err) {}
  let rows = "";
  for (const tab of ["kitchen", "bar"]) {
    const g = es.filter(x => x.e.tab === tab); if (!g.length) continue;
    rows += `<p class="sv-grp">${TABS[tab]} · ${g.reduce((s, x) => s + x.q, 0)}</p>` + g.map(x => {
      const size = arr(x.e.item.p).length > 1 && x.e.cols ? x.e.cols[x.vi] : "";
      return `<div class="sv-row"><span class="sv-q">${x.q}×</span><span class="sv-n">${tab === "kitchen" ? markHTML(x.e.item.v) : ""}<span>${esc(x.e.item.n)}${size ? `<small>${esc(size)}</small>` : ""}</span></span><span class="sv-p">₹${fmt(x.q * x.price)}</span></div>`;
    }).join("");
  }
  return `<div class="sv-head"><div><p class="sv-brand">Tressa${VENUE ? " · " + esc(VENUE.name) : ""} · Order</p><h2 class="sv-title" id="sv-title">${count} ${count === 1 ? "item" : "items"}</h2>${time ? `<p class="sv-time">Shown at ${esc(time)}</p>` : ""}</div><label class="sv-table" for="svTable"><span>Table</span><input id="svTable" inputmode="numeric" autocomplete="off" maxlength="6" value="${esc(tableNo)}" placeholder="No."></label></div>
  <div class="sv-list">${rows}</div>
  <div class="sv-total"><span>Estimated total</span><strong>₹${fmt(total)}</strong></div>
  <p class="sv-note">Before taxes. Please read the order back to your guest.</p>
  <button class="btn-primary c" type="button" data-act="sv-close">Back to My List</button>`;
}
function openServer() {
  if (!entries().length) return;
  serverFocus = document.activeElement;
  serverBody.innerHTML = serverHTML();
  serverEl.hidden = false; void serverEl.offsetHeight; serverEl.classList.add("open");
  serverEl.scrollTop = 0; serverEl.focus({ preventScroll: true });
  const inp = $("#svTable"); inp.addEventListener("input", () => setTableNo(inp.value));
  try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wakeLock = l; }).catch(() => {}); } catch (err) {}
}
function closeServer() {
  if (serverEl.hidden) return;
  serverEl.classList.remove("open");
  try { if (wakeLock) wakeLock.release(); } catch (err) {}
  wakeLock = null;
  const done = () => { serverEl.hidden = true; if (serverFocus && document.contains(serverFocus)) serverFocus.focus({ preventScroll: true }); };
  reduce ? done() : setTimeout(done, 260);
}


/* ---------------- banners: story-style carousel ---------------- */
let bnIdx = 0, bnScrollT = null;
function bannerOk(b, tab) {
  if (!b.on || !(b.tab === "all" || b.tab === tab)) return false;
  if (b.link.type === "item") { const e = INDEX[b.link.id]; return !!e && !OUT.has(e.id) && vegOk(e); }
  if (b.link.type === "offer") return OFFERS.some(o => o.id === b.link.id);
  return COLLECTIONS[tab].some(c => c.id === b.link.id);
}
function renderBanners() {
  if (!state.tab) return;
  const list = LIVE.banners.filter(b => bannerOk(b, state.tab));
  bannerWrap.innerHTML = list.length ? bannerHTML(list) : "";
  bannerWrap.hidden = !list.length;
  bnIdx = 0;
  const tr = $(".bn-track", bannerWrap);
  if (tr) tr.addEventListener("scroll", () => { clearTimeout(bnScrollT); bnScrollT = setTimeout(syncBanner, 110); }, { passive: true });
}
const bnStep = tr => { const s = $$(".bn", tr); return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : 1; };
function syncBanner() { const tr = $(".bn-track", bannerWrap); if (!tr) return; const i = Math.round(tr.scrollLeft / bnStep(tr)); if (i !== bnIdx) setBanner(i, false); }
function setBanner(i, scroll) {
  const tr = $(".bn-track", bannerWrap); if (!tr) return;
  const slides = $$(".bn", tr), n = slides.length; if (!n) return;
  i = ((i % n) + n) % n; bnIdx = i;
  slides.forEach((s, k) => s.classList.toggle("on", k === i));
  const bars = $$(".bn-prog i", bannerWrap);
  bars.forEach((p, k) => { p.className = k < i ? "done" : ""; });
  if (bars[i]) { void bars[i].offsetWidth; bars[i].className = "on"; }
  if (scroll) tr.scrollTo({ left: i * bnStep(tr), behavior: reduce ? "auto" : "smooth" });
}
function openBanner(id) {
  const b = LIVE.banners.find(x => x.id === id); if (!b) return;
  if (b.link.type === "item" && INDEX[b.link.id]) openView({ v: "item", id: b.link.id }, false);
  else if (b.link.type === "offer") { const o = OFFERS.find(x => x.id === b.link.id); openView(o && offerItems(o).length ? { v: "offer", id: o.id } : { v: "offers" }, false); }
  else if (COLLECTIONS[state.tab].some(c => c.id === b.link.id)) openView({ v: "col", tab: state.tab, id: b.link.id }, false);
}
bannerWrap.addEventListener("animationend", e => { if (e.animationName === "bnfill") setBanner(bnIdx + 1, true); });
bannerWrap.addEventListener("pointerdown", () => bannerWrap.classList.add("hold"));
["pointerup", "pointercancel", "pointerleave"].forEach(t => bannerWrap.addEventListener(t, () => bannerWrap.classList.remove("hold")));
if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(x => bannerWrap.classList.toggle("off", !x.isIntersecting)), { threshold: .35 }).observe(bannerWrap);

/* ---------------- motion: reveals, fly-to-list, list ↔ card morph ---------------- */
const hasFlip = hasGsap && !!window.Flip;
if (hasFlip) gsap.registerPlugin(Flip);
let rvTriggers = [], splashDone = false;
function reveal(panel) {
  if (!splashDone || !hasGsap || !window.ScrollTrigger || !panel || panel.dataset.rv) return;
  panel.dataset.rv = "1";
  const arts = $$(".it-art", panel); if (!arts.length) return;
  rvTriggers.push(...ScrollTrigger.batch(arts, {
    start: "top 98%", once: true,
    onEnter: batch => batch.filter(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).slice(0, 8).forEach((el, i) => {
      el.classList.add("rv");
      gsap.fromTo(el, { "--rv": 14 }, { "--rv": 0, duration: .9, delay: i * .07, ease: "expo.out", onComplete: () => { el.classList.remove("rv"); el.style.removeProperty("--rv"); } });
      const g = $(".art-g", el); if (g) gsap.fromTo(g, { "--sc": 1.24 }, { "--sc": 1, duration: 1.2, delay: i * .07, ease: "expo.out" });
    })
  }));
}
function resetReveal() { rvTriggers.forEach(t => t.kill()); rvTriggers = []; for (const k in panels) delete panels[k].dataset.rv; }
function afterSplash() { if (splashDone) return; splashDone = true; bannerWrap.classList.remove("wait"); reveal(panels[state.tab]); }

function fly(btn) {
  if (!hasGsap || !btn || btn.closest("#sheet, #search, #toast")) return false;
  const host = btn.closest(".it, .bn"), src = host && (host.querySelector(".it-art") || host.querySelector(".art"));
  const r = (src || btn).getBoundingClientRect(), t = $("#tb-list").getBoundingClientRect();
  if (!r.width || !t.width) return false;
  const size = src ? Math.min(84, r.width, r.height) : 18;
  const el = document.createElement("div");
  el.className = "fly";
  Object.assign(el.style, { left: r.left + r.width / 2 - size / 2 + "px", top: r.top + r.height / 2 - size / 2 + "px", width: size + "px", height: size + "px" });
  if (src) {
    const c = src.cloneNode(true);
    c.classList.remove("it-art");
    $$(".ribbon, .stamp, .ex-shade, .bn-shade", c).forEach(x => x.remove());
    Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", clipPath: "none", transform: "none" });
    el.appendChild(c); el.style.overflow = "hidden";
  } else el.style.background = "var(--acc)";
  document.body.appendChild(el);
  const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + 16 - (r.top + r.height / 2);
  gsap.timeline({ onComplete: () => { el.remove(); bumpBadge(); } })
    .to(el, { x: dx, duration: .72, ease: "power1.inOut" }, 0)
    .to(el, { y: -42, duration: .26, ease: "power2.out" }, 0)
    .to(el, { y: dy, duration: .46, ease: "power2.in" }, .26)
    .to(el, { scale: 22 / size, borderRadius: "50%", duration: .72, ease: "power2.in" }, 0)
    .to(el, { opacity: 0, duration: .12 }, .62);
  return true;
}

function markView() {
  document.body.classList.toggle("v-grid", state.view === "grid");
  $$(".vtog button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === state.view)));
}
function setView(v, animate) {
  v = v === "grid" ? "grid" : "list";
  if (v === state.view) return;
  const items = $$("main .group:not(.plain) > .it:not([hidden])", panels[state.tab]);
  const line = stickH() + 4;
  const anchor = window.scrollY > chipStick ? items.find(x => x.getBoundingClientRect().bottom > line) : null;
  const top0 = anchor ? anchor.getBoundingClientRect().top : 0;
  const vis = items.filter(x => { const r = x.getBoundingClientRect(); return r.bottom > -240 && r.top < innerHeight + 240; }).slice(0, 24);
  const parts = vis.flatMap(x => [x, $(".it-art", x)].filter(Boolean));
  if (hasGsap) gsap.getTweensOf(parts.concat(vis.map(x => $(".art-g", x)).filter(Boolean))).forEach(t => t.progress(1));
  const fs = animate && hasFlip && parts.length ? Flip.getState(parts) : null;
  state.view = v; save(); markView();
  if (anchor) { const d = anchor.getBoundingClientRect().top - top0; if (Math.abs(d) > 1) scrollToY(window.scrollY + d, true); }
  if (fs) {
    Flip.from(fs, { duration: .6, ease: "power3.inOut", scale: true, nested: true });
    gsap.fromTo(vis.flatMap(x => [$(".it-txt", x), $(".it-ctl", x)]).filter(Boolean), { opacity: 0 }, { opacity: 1, duration: .32, delay: .3, clearProps: "opacity" });
  }
  measureHero(); onScroll(); spy(true);
  if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
}

/* ---------------- live content: apply a new config without losing your place ---------------- */
function applyLive(raw) {
  liveRaw = raw;
  const next = normLive(raw), sig = JSON.stringify(next);
  if (sig === liveSig) return false;
  LIVE = next; liveSig = sig; OUT = new Set(LIVE.soldOut);
  rerender();
  return true;
}
function applyItems(raw) {
  const next = normItems(raw && raw.items), sig = JSON.stringify(next);
  if (sig === itemsSig) return false;
  ITEMS = next; itemsSig = sig;
  buildMenu(ITEMS); rebuildIndex(); buildSearch();
  LIVE = normLive(liveRaw); liveSig = JSON.stringify(LIVE); OUT = new Set(LIVE.soldOut);
  if (AD) AD.draft = normLive(AD.draft);
  rerender(); updateTray();
  if (AD) renderAdmin();
  return true;
}
function rerender() {
  const line = stickH() + 24; let anchor = null;
  if (window.scrollY > chipStick) for (const s of visibleSecs()) { if (s.getBoundingClientRect().top <= line) anchor = s; else break; }
  const off = anchor ? anchor.getBoundingClientRect().top : 0;
  resetReveal();
  panels.kitchen.innerHTML = panelHTML("kitchen");
  panels.bar.innerHTML = panelHTML("bar");
  applyVeg();
  if (state.tab !== "kitchen") { renderQuick(); renderBanners(); renderChips(); }
  if (anchor) { const n = document.getElementById(anchor.id); if (n && !n.hidden) scrollToY(window.scrollY + n.getBoundingClientRect().top - off, true); }
  measureHero(); onScroll(); spy(true);
  if (hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
  reveal(panels[state.tab]);
  if (stack.length) renderSheet(false);
}

/* ---------------- data source ----------------
   The menu needs two things from wherever banners and specials live:
     connect(onData)  hand over the config now and whenever staff change it
     write(config)    save a new config (staff only)
   Here that is this artifact's database, document "menu/config".
   At deployment, replace the bodies with Tressa's captain pad API
   (e.g. GET and POST /api/menu/config), keeping the DEFAULT_LIVE shape. */
const Source = {
  state: "connecting", canWrite: false, ref: null, itemsRef: null, assets: null,
  set(s) { this.state = s; if (AD) renderAdmin(); },
  async connect(onConfig, onItems) {
    const api = window.claude && typeof window.claude.use === "function" ? window.claude : null;
    if (!api) return this.set("local");
    let db = null;
    try { db = await api.use("db"); } catch (err) {}
    if (!db) return this.set("local");
    this.ref = db.doc("menu/config");
    this.itemsRef = db.doc("menu/items");
    const timer = setTimeout(() => { if (this.state === "connecting") this.set("slow"); }, 10000);
    const fail = () => { clearTimeout(timer); this.canWrite = false; this.set("error"); };
    this.ref.onSnapshot(snap => {
      if (!snap.metadata || !snap.metadata.fromCache) clearTimeout(timer);
      if (snap.exists) onConfig(snap.data());
    }, fail);
    this.itemsRef.onSnapshot(snap => { if (snap.exists) onItems(snap.data()); }, fail);
    let edit = false;
    try { const user = await api.use("user"); edit = user ? await user.canEdit() : false; } catch (err) {}
    if (edit) { try { this.assets = await api.use("assets"); } catch (err) { this.assets = null; } }
    this.canWrite = !!edit && this.state !== "error";
    this.set(this.canWrite ? "live" : this.state === "error" ? "error" : "view");
  },
  write(data) { return this.ref.set(data); },
  writeItems(items) { return this.itemsRef.set({ items }); }
};

/* ---------------- admin: banners, specials and sold out, for Tressa staff ---------------- */
const TAGS_B = ["Today's Special", "Only at Tressa", "Chef recommends", "Bartender's pick", "Offer", "New", "Tonight"];
const AD_TABS = [["items", "All items"], ["banners", "Banners"], ["specials", "Today's Specials"], ["exclusive", "Only at Tressa"], ["recommended", "Recommended"]];
const IC_UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>';
const IC_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg>';
const IC_X = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
let AD = null, adFocusBack = null;
const clone = o => JSON.parse(JSON.stringify(o));
const linkTabs = b => b.tab === "all" ? ["kitchen", "bar"] : [b.tab];
function colsFor(b) { const m = new Map(); for (const t of linkTabs(b)) for (const c of COLLECTIONS[t]) if (!m.has(c.id)) m.set(c.id, c.label); return [...m]; }
function fixLink(b) {
  const t = b.link.type;
  if (t === "offer" && !OFFERS.some(o => o.id === b.link.id)) b.link.id = OFFERS[0].id;
  else if (t === "col" && !colsFor(b).some(([id]) => id === b.link.id)) b.link.id = colsFor(b)[0][0];
  else if (t === "item") { const e = INDEX[b.link.id]; if (!e || !linkTabs(b).includes(e.tab)) b.link.id = ORDER.find(x => linkTabs(b).includes(x.tab)).id; }
}
const optHTML = (cur, list) => list.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
function bannerEditHTML(b, i, n) {
  const where = b.tab === "all" ? "Kitchen & Bar" : TABS[b.tab], t = b.link.type;
  const tags = TAGS_B.includes(b.tag) ? TAGS_B : [b.tag, ...TAGS_B];
  const target = t === "offer" ? optHTML(b.link.id, OFFERS.map(o => [o.id, o.title])) : t === "col" ? optHTML(b.link.id, colsFor(b)) : "";
  return `<li class="ab"><div class="ab-top"><span class="ab-thumb">${bannerArt(b)}</span><span class="ab-meta"><b data-bt="${i}">${esc(b.title || "Untitled")}</b><small>${esc(b.tag)} · ${where}</small></span><span class="sw"><input type="checkbox" data-ad="b-on" data-i="${i}"${b.on ? " checked" : ""} aria-label="Show ${esc(b.title)} on the menu"><i></i></span></div>
    <details data-bid="${esc(b.id)}"${AD.open === b.id ? " open" : ""}><summary>Edit banner</summary><div class="ab-form">
      <label class="fld">Label<select data-ad="b-tag" data-i="${i}">${optHTML(b.tag, tags.map(x => [x, x]))}</select></label>
      <label class="fld">Title<input data-ad="b-title" data-i="${i}" value="${esc(b.title)}" maxlength="48" autocomplete="off"></label>
      <label class="fld">Line<textarea data-ad="b-line" data-i="${i}" maxlength="120" rows="2">${esc(b.line)}</textarea></label>
      <div class="fld2"><label class="fld">Show on<select data-ad="b-where" data-i="${i}">${optHTML(b.tab, [["kitchen", "Kitchen"], ["bar", "Bar"], ["all", "Both"]])}</select></label><label class="fld">Opens<select data-ad="b-type" data-i="${i}">${optHTML(t, [["item", "Dish or drink"], ["offer", "Offer"], ["col", "Quick pick"]])}</select></label></div>
      ${t === "item" ? pickBtnHTML(b, i) : `<label class="fld">${t === "offer" ? "Offer" : "Quick pick"}<select data-ad="b-target" data-i="${i}">${target}</select></label>`}
      <div class="ab-acts"><button class="mini" type="button" data-ad="b-up" data-i="${i}"${i === 0 ? " disabled" : ""}>Move up</button><button class="mini" type="button" data-ad="b-down" data-i="${i}"${i === n - 1 ? " disabled" : ""}>Move down</button><button class="mini danger" type="button" data-ad="b-del" data-i="${i}">Delete</button></div>
    </div></details></li>`;
}
const segHTML = () => `<div class="ad-seg" role="group" aria-label="Menu">${["kitchen", "bar"].map(s => `<button type="button" data-ad="side" data-side="${s}" aria-pressed="${AD.side === s}">${TABS[s]}</button>`).join("")}</div>`;
const listRef = () => AD.tab === "specials" ? AD.draft.specials[AD.side] : AD.draft[AD.tab][AD.side];
/* every item, searchable: edit it, or place it anywhere on the menu */
const PLACES = [["banner", "Banner"], ["special", "Today's Special"], ["exclusive", "Only at Tressa"], ["rec", "Recommended"], ["out", "Sold out"]];
const IC_SEARCH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
const IC_PLUS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const IC_PEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const TAG_KEYS = ["chef", "best", "new", "jain"];
const thumbHTML = e => `<span class="ad-it-art">${artHTML(e)}</span>`;
function itemState(e) { const o = ITEMS[e.id]; return e.deleted ? "Off the menu" : o && o.add ? "Added" : o ? "Edited" : ""; }
const nameHTML = (e, badge) => `<span class="ai-n">${e.tab === "kitchen" ? markHTML(e.item.v) : ""}<span>${esc(e.item.n)}<small>${TABS[e.tab]} · ${esc(e.sec.short)} · ₹${fmt(e.minP)}${badge ? ` <em class="ad-badge">${badge}</em>` : ""}</small></span></span>`;
function deletedEntries() {
  return Object.entries(ITEMS).filter(([id, o]) => o.del && BASEIX[id]).map(([id, o]) => {
    const b = BASEIX[id], it = mergeItem(b.it, o), sec = MENU[b.tab].sections.find(x => x.id === b.secId);
    return { id, item: it, tab: b.tab, sec, grp: null, deleted: true, minP: Math.min(...arr(it.p).filter(p => p != null)), hay: norm([it.n, it.d, it.r, sec.title, sec.short].join(" ")) };
  });
}
function placedIn(e) {
  const d = AD.draft, t = e.tab;
  return { banner: d.banners.some(b => b.link.type === "item" && b.link.id === e.id), special: d.specials[t].some(x => x.id === e.id), exclusive: d.exclusive[t].includes(e.id), rec: d.recommended[t].includes(e.id), out: d.soldOut.includes(e.id) };
}
function scopeOptions(cur, tabs, full) {
  const base = [["all", tabs.length > 1 ? "All dishes & drinks" : tabs[0] === "kitchen" ? "All dishes" : "All drinks"]];
  if (tabs.length > 1) base.push(["t:kitchen", "Kitchen, all"], ["t:bar", "Bar, all"]);
  base.push(["featured", "Already featured"], ["out", "Sold out"]);
  if (full) base.push(["added", "Added by staff"], ["edited", "Edited"], ["deleted", "Off the menu"]);
  let h = optHTML(cur, base);
  for (const t of tabs) h += `<optgroup label="${TABS[t]}">${optHTML(cur, MENU[t].sections.map(sc => [`s:${t}:${sc.id}`, sc.title]))}</optgroup>`;
  return h;
}
function adFilter(q, scope, tabs) {
  const toks = norm(q).trim().split(/\s+/).filter(Boolean), d = AD.draft;
  const pool = scope === "deleted" ? deletedEntries() : ORDER;
  const inScope = e => {
    if (scope === "all" || scope === "deleted") return true;
    if (scope === "out") return d.soldOut.includes(e.id);
    if (scope === "added") return !!(ITEMS[e.id] && ITEMS[e.id].add);
    if (scope === "edited") return !!(ITEMS[e.id] && !ITEMS[e.id].add);
    if (scope === "featured") { const p = placedIn(e); return p.banner || p.special || p.exclusive || p.rec; }
    const [kind, t, sid] = scope.split(":");
    return kind === "t" ? e.tab === t : e.tab === t && e.sec.id === sid;
  };
  return pool.filter(e => tabs.includes(e.tab) && inScope(e) && toks.every(t => e.hay.includes(t)));
}
const findHTML = (qa, sa, q, scope, tabs, extra) => {
  const n = ORDER.filter(e => tabs.includes(e.tab)).length, what = tabs.length > 1 ? "dishes and drinks" : tabs[0] === "kitchen" ? "dishes" : "drinks";
  return `<div class="ad-find"><label class="sfield">${IC_SEARCH}<span class="vh">Search the menu</span><input type="search" data-ad="${qa}" value="${esc(q)}" placeholder="Search ${n} ${what}" autocomplete="off" enterkeyhint="search"></label><select class="ad-scope" data-ad="${sa}" aria-label="Category">${scopeOptions(scope, tabs, qa === "it-q")}</select>${extra}</div>`;
};
function adItemHTML(e) {
  const top = `<div class="ad-it-top">${thumbHTML(e)}${nameHTML(e, itemState(e))}<button class="ad-edit" type="button" data-ad="ed-open" data-id="${e.id}" aria-label="Edit ${esc(e.item.n)}">${IC_PEN}Edit</button></div>`;
  if (e.deleted) return `<li class="ad-it off">${top}<div class="ad-chips"><button type="button" class="ad-chip" data-ad="ed-restore" data-id="${e.id}">Bring back to the menu</button></div></li>`;
  const p = placedIn(e);
  return `<li class="ad-it">${top}<div class="ad-chips" role="group" aria-label="Where ${esc(e.item.n)} shows">${PLACES.map(([k, l]) => `<button type="button" class="ad-chip${k === "out" ? " out" : ""}" data-ad="pl" data-k="${k}" data-id="${e.id}" aria-pressed="${p[k]}">${l}</button>`).join("")}</div></li>`;
}
const countText = n => `${n} ${n === 1 ? "item" : "items"}`;
const noMatch = `<li class="ad-empty">Nothing matches. Try another word or category.</li>`;
function renderItems() {
  const u = $("#adItems", adminEl); if (!u) return;
  const list = adFilter(AD.iq, AD.scope, ["kitchen", "bar"]);
  u.innerHTML = list.length ? list.map(adItemHTML).join("") : noMatch;
  const n = $("#it-q-n", adminEl); if (n) n.textContent = countText(list.length);
}
function place(id, k) {
  const e = INDEX[id], d = AD.draft, t = e.tab;
  const tog = (L, max, make) => {
    const i = L.findIndex(x => (typeof x === "string" ? x : x.id) === id);
    if (i >= 0) { L.splice(i, 1); return ""; }
    if (L.length >= max) return `That block holds ${max} at most. Take one off first.`;
    L.push(make ? make() : id); return "";
  };
  if (k === "banner") {
    if (d.banners.some(b => b.link.type === "item" && b.link.id === id)) { d.banners = d.banners.filter(b => !(b.link.type === "item" && b.link.id === id)); return ""; }
    if (d.banners.length >= 12) return "12 banners is the most. Take one off first.";
    const nb = { id: "b" + Date.now().toString(36), on: true, tab: t, tag: t === "bar" ? "Bartender's pick" : "Chef recommends", title: e.item.n.slice(0, 48), line: (e.item.d || "").slice(0, 120), link: { type: "item", id } };
    d.banners.unshift(nb); AD.open = nb.id; return "";
  }
  if (k === "special") return tog(d.specials[t], 12, () => ({ id, note: "" }));
  if (k === "exclusive") return tog(d.exclusive[t], 24);
  if (k === "rec") return tog(d.recommended[t], 24);
  if (k === "out") return tog(d.soldOut, 400);
  return "";
}
function pickBtnHTML(b, i) {
  const e = INDEX[b.link.id];
  return `<div class="fld">Dish or drink<button class="ad-target" type="button" data-ad="b-pick" data-i="${i}">${e ? thumbHTML(e) + nameHTML(e) : `<span class="ai-n"><span>Choose from the menu</span></span>`}<span class="ad-change">Change</span></button></div>`;
}
function pickHTML() {
  const p = AD.pick, title = p.for === "banner" ? "Pick the banner's dish or drink" : `Add to ${AD_TABS.find(x => x[0] === AD.tab)[1]}`;
  return `<div class="ad-pick" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ad-pick-head pad"><div class="ad-row"><b class="ad-pick-t">${esc(title)}</b><button class="mini" type="button" data-ad="pk-close">Cancel</button></div>${findHTML("pk-q", "pk-scope", p.q, p.scope, p.tabs, '<span class="ad-n" id="pk-q-n"></span>')}</div><ul class="ad-pick-list" id="adPick"></ul></div>`;
}
function renderPick() {
  const u = $("#adPick", adminEl), p = AD && AD.pick; if (!u || !p) return;
  const list = adFilter(p.q, p.scope, p.tabs);
  u.innerHTML = list.length ? list.map(e => {
    const taken = p.skip && p.skip.has(e.id);
    return `<li><button class="ad-pk" type="button" data-ad="pk" data-id="${e.id}"${taken ? ' aria-disabled="true"' : ""}>${thumbHTML(e)}${nameHTML(e)}${taken ? `<span class="ad-pk-ok">Added</span>` : p.cur === e.id ? `<span class="ad-pk-ok">${CHECK}</span>` : ""}</button></li>`;
  }).join("") : noMatch;
  const n = $("#pk-q-n", adminEl); if (n) n.textContent = countText(list.length);
}
function choosePick(id) {
  const p = AD.pick, e = INDEX[id]; AD.pick = null; AD.msg = "";
  if (!e || !p) return;
  if (p.for === "banner") {
    const bn = AD.draft.banners[p.i]; if (!bn) return;
    const old = INDEX[bn.link.id];
    if (!bn.title || (old && bn.title === old.item.n.slice(0, 48))) bn.title = e.item.n.slice(0, 48);
    if (!bn.line || (old && bn.line === (old.item.d || "").slice(0, 120))) bn.line = (e.item.d || "").slice(0, 120);
    bn.link.id = id;
  } else {
    const L = listRef(), max = AD.tab === "specials" ? 12 : 24;
    if (L.length >= max) { AD.msg = `That block holds ${max} at most. Take one off first.`; return; }
    L.push(AD.tab === "specials" ? { id, note: "" } : id);
  }
}

/* the item editor: add, edit, remove, restore */
const catOf = e => `${e.tab}|${e.sec.id}|${e.grp ? e.grp.g : ""}`;
function openEditor(id) {
  if (!id) {
    const sc = /^[st]:(kitchen|bar)/.exec(AD.scope || ""), tab = sc ? sc[1] : state.tab || "kitchen";
    let cat = "";
    const m = /^s:(kitchen|bar):(.+)$/.exec(AD.scope || ""); if (m) { const k = catKeys(tab).find(x => x.split("|")[1] === m[2]); if (k) cat = k; }
    AD.ed = { id: null, tab, cat, n: "", d: "", r: "", p: ["", ""], v: "v", s: 0, t: [], img: "", origImg: "", photo: "", blob: null, err: "", busy: false, prep: false, del: false, arm: "", focus: true };
  } else {
    const e = INDEX[id] || deletedEntries().find(x => x.id === id); if (!e) return;
    const it = e.item;
    AD.ed = { id, tab: e.tab, cat: e.deleted ? BASEIX[id].cat : catOf(e), n: it.n, d: it.d || "", r: it.r || "", p: arr(it.p).map(v => v == null ? "" : String(v)), v: it.v || "v", s: it.s || 0, t: [...(it.t || [])], img: it.img || "", origImg: it.img || "", photo: "", blob: null, err: "", busy: false, prep: false, del: !!e.deleted, arm: "", focus: true };
  }
  renderAdmin();
}
function edHTML() {
  const f = AD.ed, isNew = !f.id, base = f.id && BASEIX[f.id], k = f.tab === "kitchen", cat = CATS[f.cat];
  const cols = cat && cat.cols && cat.cols.length > 1 ? cat.cols : null, word = k ? "dish" : "drink";
  const pic = f.photo || f.img;
  const tile = f.prep ? `<span class="ed-prep">Preparing photo…</span>` : pic ? `<img src="${esc(pic)}" alt="">` : artHTML({ id: f.id || "new-item", item: { n: f.n || "New item" }, tab: f.tab, sec: { id: cat ? cat.sec : "small-plates" } });
  const seg = (act, cur, opts) => `<div class="ad-seg ed-seg" role="group">${opts.map(([v, l]) => `<button type="button" data-ad="${act}" data-val="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join("")}</div>`;
  const prices = (cols || [null]).map((c, i) => `<label class="fld"><span>${c ? esc(c) : "Price"} (₹)${!cols ? ' <span class="ed-req">*</span>' : ""}</span><input data-ad="ed-p" data-pi="${i}" value="${esc(f.p[i] || "")}" inputmode="numeric" autocomplete="off" placeholder="${c ? "Blank if not served" : "e.g. 545"}"></label>`).join("");
  let danger = "";
  if (f.del) danger = `<p class="ed-note">This ${word} is off the menu right now. Save to bring it back.</p>`;
  else if (!isNew) danger = `<div class="ed-danger">${base && ITEMS[f.id] ? `<button class="mini" type="button" data-ad="ed-reset">${f.arm === "reset" ? "Tap again to restore" : "Restore original"}</button>` : ""}<button class="mini danger" type="button" data-ad="ed-del">${f.arm === "del" ? "Tap again to confirm" : base ? "Remove from menu" : "Delete item"}</button></div>`;
  const save = f.busy ? "Saving…" : !Source.canWrite ? "Save" : isNew ? "Add to menu" : f.del ? "Bring back" : "Save & publish";
  return `<div class="ad-ed" role="dialog" aria-modal="true" aria-labelledby="ed-title" tabindex="-1">
    <div class="ad-ed-head pad"><b class="ad-ed-t" id="ed-title">${isNew ? `New ${word}` : `Edit ${word}`}</b><button class="ad-ed-x" type="button" data-ad="ed-close" aria-label="Close">${IC_X}</button></div>
    <div class="ad-ed-body pad">
      <div class="ed-photo"><div class="ed-pic">${tile}${pic || f.prep ? "" : `<span class="ed-pic-note">No photo yet. Guests see this illustration.</span>`}</div>
        <div class="ed-ph-acts"><label class="btn-soft ed-up">${pic ? "Replace photo" : "Add photo"}<input class="vh" type="file" accept="image/*" data-ad="ed-file"></label>${pic ? `<button class="btn-soft" type="button" data-ad="ed-unphoto">Remove photo</button>` : ""}</div>
        <p class="ed-hint">Any photo from your phone. We crop it to fit and shrink it for quick loading.</p></div>
      ${isNew ? `<div class="fld">Menu${seg("ed-tab", f.tab, [["kitchen", "Kitchen"], ["bar", "Bar"]])}</div>` : ""}
      <label class="fld"><span>Name <span class="ed-req">*</span></span><input data-ad="ed-n" value="${esc(f.n)}" maxlength="60" autocomplete="off" placeholder="${k ? "e.g. Paneer Tikka" : "e.g. Kokum Collins"}"></label>
      <label class="fld">Category<select data-ad="ed-cat">${f.cat ? "" : '<option value="" selected disabled>Choose a category…</option>'}${optHTML(f.cat, catKeys(f.tab).map(x => [x, CATS[x].label]))}</select></label>
      <div class="${cols ? "fld2" : "ed-one"}">${prices}</div>
      ${cols ? `<p class="ed-hint">Fill at least one size.</p>` : ""}
      ${k ? `<div class="fld">Diet${seg("ed-v", f.v, [["v", markHTML("v") + "Veg"], ["n", markHTML("n") + "Non-veg"], ["e", markHTML("e") + "Egg"]])}</div>` : ""}
      <label class="fld">Description<textarea data-ad="ed-d" maxlength="160" rows="2" placeholder="One line about the ${word}">${esc(f.d)}</textarea></label>
      ${k ? "" : `<label class="fld">Style or origin<input data-ad="ed-r" value="${esc(f.r)}" maxlength="60" autocomplete="off" placeholder="e.g. Speyside · pear, light oak"></label>`}
      ${k ? `<div class="fld">Spice${seg("ed-s", f.s, [[0, "None"], [1, "Mild"], [2, "Medium"], [3, "Fiery"]])}</div>` : ""}
      <div class="fld">Tags<div class="ad-chips ed-tags">${TAG_KEYS.filter(t => k || t !== "jain").map(t => `<button type="button" class="ad-chip" data-ad="ed-tag" data-val="${t}" aria-pressed="${f.t.includes(t)}">${TAGS[t]}</button>`).join("")}</div></div>
      ${f.err ? `<p class="ed-err" role="alert">${esc(f.err)}</p>` : ""}
      ${danger}
    </div>
    <div class="ad-ed-foot"><button class="btn-soft" type="button" data-ad="ed-close">Cancel</button><button class="btn-primary c" type="button" data-ad="ed-save"${f.busy || f.prep ? " disabled" : ""}>${save}</button></div>
  </div>`;
}
function renderEd() {
  const box = $(".ad-ed", adminEl); if (!box || !AD || !AD.ed) return renderAdmin();
  const st = $(".ad-ed-body", box).scrollTop, ae = document.activeElement;
  const key = ae && box.contains(ae) && ae.dataset && ae.dataset.ad ? `[data-ad="${ae.dataset.ad}"]${ae.dataset.val != null ? `[data-val="${ae.dataset.val}"]` : ""}${ae.dataset.pi != null ? `[data-pi="${ae.dataset.pi}"]` : ""}` : null;
  box.outerHTML = edHTML();
  const nb = $(".ad-ed", adminEl); $(".ad-ed-body", nb).scrollTop = st;
  if (key) { const f = $(key, nb); if (f) f.focus({ preventScroll: true }); }
}
const errText = err => ({ too_large: "That photo is too big. Try a smaller one.", unsupported_type: "That file isn't a photo we can use. Try a JPG or PNG.", quota_or_state: "Photo storage is full. Remove some old photos first.", rate_limited: "Too many changes at once. Wait a moment and try again.", upstream_auth: "Your sign-in expired. Reload the page and try again.", permission_denied: "Only Tressa's menu editors can save changes." }[err && err.code] || "Couldn't save just now. Check the connection and try again.");
async function preparePhoto(file) {
  if (!file || (file.type && !/^image\//.test(file.type))) throw { code: "unsupported_type" };
  const toURL = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej({ code: "unsupported_type" }); fr.readAsDataURL(blob); });
  let src;
  try { src = await createImageBitmap(file); }
  catch (err) { const u = await toURL(file); src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej({ code: "unsupported_type" }); im.src = u; }); }
  const w = src.width, h = src.height, sc = Math.min(1, 1400 / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const enc = (type, q) => new Promise(r => c.toBlob(r, type, q));
  let blob = await enc("image/webp", .82);
  if (!blob || blob.type !== "image/webp") blob = await enc("image/jpeg", .85);
  if (!blob) throw { code: "unsupported_type" };
  return { blob, url: await toURL(blob) };
}
async function uploadPhoto(blob) {
  try { return await Source.assets.upload(blob); }
  catch (err) { if (err && err.code === "store_unavailable") { await new Promise(r => setTimeout(r, 1200)); return Source.assets.upload(blob); } throw err; }
}
const assetOf = img => { const m = /^\/_blob\/([0-9a-f]{32})$/.exec(img || ""); return m ? m[1] : ""; };
function dropAsset(old, now) { const id = assetOf(old); if (id && old !== now && Source.assets) Source.assets.delete(id).catch(() => {}); }
function newItemId(name) { const b = "s-" + (slug(name).slice(0, 40) || "item"); let id = b, n = 2; while (INDEX[id] || ITEMS[id] || BASEIX[id]) id = `${b}-${n++}`; return id; }
function patchFor(id, f, v) {
  const base = BASEIX[id];
  if (!base) {
    const r = { add: true, cat: f.cat, n: v.n, p: v.p };
    if (v.d) r.d = v.d;
    if (f.tab === "bar" && v.r) r.r = v.r;
    if (f.tab === "kitchen") { r.v = v.v; if (v.s) r.s = v.s; }
    if (v.t.length) r.t = v.t;
    if (v.img) r.img = v.img;
    return r;
  }
  const b = base.it, r = {}, sorted = a => JSON.stringify([...(a || [])].sort());
  if (f.cat !== base.cat) r.cat = f.cat;
  if (v.n !== b.n) r.n = v.n;
  if (v.d !== (b.d || "")) r.d = v.d;
  if (f.tab === "bar" && v.r !== (b.r || "")) r.r = v.r;
  if (JSON.stringify(v.p) !== JSON.stringify(b.p)) r.p = v.p;
  if (f.tab === "kitchen" && v.v !== b.v) r.v = v.v;
  if (f.tab === "kitchen" && v.s !== (b.s || 0)) r.s = v.s;
  if (sorted(v.t) !== sorted(b.t)) r.t = v.t;
  if ((v.img || "") !== (b.img || "")) r.img = v.img || "";
  return Object.keys(r).length ? r : null;
}
async function commitItems(next) {
  if (Source.canWrite) await Source.writeItems(next);
  applyItems({ items: next });
}
async function saveItem() {
  const f = AD.ed; if (!f || f.busy || f.prep) return;
  const name = f.n.replace(/\s+/g, " ").trim(), cat = CATS[f.cat], many = cat && cat.cols && cat.cols.length > 1 ? cat.cols.length : 1;
  const ps = f.p.slice(0, many).map(x => { const n = parseInt(x, 10); return n > 0 && n <= 200000 ? n : null; });
  while (ps.length < many) ps.push(null);
  f.err = !name ? "Add a name." : !cat ? "Pick a category." : !ps.some(x => x != null) ? (many > 1 ? "Add at least one price." : "Add a price.")
    : ORDER.some(e => e.id !== f.id && e.tab === f.tab && norm(e.item.n) === norm(name)) ? `There's already a “${name}” on the ${TABS[f.tab]} menu.` : "";
  if (!f.err && f.blob && Source.canWrite && !Source.assets) f.err = "Photo upload isn't available in this view. Remove the photo, or open the menu while signed in as its editor.";
  if (f.err) return renderEd();
  f.busy = true; renderEd();
  let img = f.img, uploaded = "";
  try {
    if (f.blob) {
      if (Source.canWrite) { const r = await uploadPhoto(f.blob); uploaded = r.id; img = "/_blob/" + r.id; }
      else img = f.photo;
    }
    const id = f.id || newItemId(name);
    const patch = patchFor(id, f, { n: name, d: f.d.replace(/\s+/g, " ").trim(), r: f.r.replace(/\s+/g, " ").trim(), p: many > 1 ? ps : ps[0], v: f.v, s: f.s, t: f.t, img });
    const next = clone(ITEMS);
    if (patch) next[id] = patch; else delete next[id];
    await commitItems(next);
    dropAsset(f.origImg, img);
    AD.ed = null;
    AD.msg = `${name} ${f.id ? (f.del ? "is back on the menu" : "saved") : "added"}${Source.canWrite ? "." : " on this phone."}`;
    renderAdmin();
  } catch (err) {
    if (uploaded && Source.assets) Source.assets.delete(uploaded).catch(() => {});
    if (AD && AD.ed === f) { f.busy = false; f.err = errText(err); renderEd(); }
  }
}
async function removeItem(restore) {
  const f = AD.ed; if (!f || f.busy) return;
  const base = BASEIX[f.id], next = clone(ITEMS);
  if (restore) delete next[f.id];
  else if (base) next[f.id] = Object.assign({}, ITEMS[f.id] || {}, { del: true });
  else delete next[f.id];
  f.busy = true; renderEd();
  try {
    await commitItems(next);
    if (restore || !base) dropAsset(f.origImg, "");
    AD.ed = null;
    AD.msg = restore ? `${f.n} is back to the original.` : base ? `${f.n} is off the menu. Choose “Off the menu” in the list to bring it back.` : `${f.n} deleted.`;
    renderAdmin();
  } catch (err) { if (AD && AD.ed === f) { f.busy = false; f.err = errText(err); renderEd(); } }
}
async function restoreItem(id) {
  const next = clone(ITEMS), o = Object.assign({}, next[id] || {});
  delete o.del;
  if (Object.keys(o).length) next[id] = o; else delete next[id];
  try { await commitItems(next); AD.msg = `${(INDEX[id] && INDEX[id].item.n) || "It"} is back on the menu.`; }
  catch (err) { AD.msg = errText(err); }
  renderAdmin();
}
function adBodyHTML() {
  const d = AD.draft;
  if (AD.tab === "banners") {
    const n = d.banners.length;
    return `<p class="ad-help">Banners rotate at the top of the menu, six seconds each. Switch one off to hide it without deleting it.</p>${n ? `<ul class="ad-list">${d.banners.map((b, i) => bannerEditHTML(b, i, n)).join("")}</ul>` : `<p class="ad-empty">No banners. The menu starts with the quick picks.</p>`}<button class="btn-soft ad-addbtn" type="button" data-ad="b-add"${n >= 12 ? " disabled" : ""}>Add a banner</button>`;
  }
  if (AD.tab === "items") return `<p class="ad-help"><b>Edit</b> changes a name, price or photo and saves straight away. The buttons under each item feature it on the menu; those go live when you publish.</p><p class="ad-n ad-count" id="it-q-n"></p><ul class="ad-items" id="adItems"></ul>`;
  const sp = AD.tab === "specials", list = listRef(), out = new Set(d.soldOut);
  const help = { specials: "The first rail on the menu. Add a short note to each card, like “Twelve portions tonight”.", exclusive: "Tall cards near the top of the menu, for the plates and pours only Tressa makes.", recommended: "A list at the top of the menu, before the categories." }[AD.tab];
  const ids = list.map(x => sp ? x.id : x);
  const rows = ids.map((id, i) => {
    const e = INDEX[id]; if (!e) return "";
    return `<li class="ai"><span class="ai-n">${e.tab === "kitchen" ? markHTML(e.item.v) : ""}<span>${esc(e.item.n)}<small>${esc(e.sec.short)} · ₹${fmt(e.minP)}${out.has(id) ? " · sold out" : ""}</small></span></span><span class="ai-acts"><button class="ic" type="button" data-ad="l-up" data-i="${i}"${i === 0 ? " disabled" : ""} aria-label="Move ${esc(e.item.n)} up">${IC_UP}</button><button class="ic" type="button" data-ad="l-down" data-i="${i}"${i === ids.length - 1 ? " disabled" : ""} aria-label="Move ${esc(e.item.n)} down">${IC_DOWN}</button><button class="ic danger" type="button" data-ad="l-del" data-i="${i}" aria-label="Remove ${esc(e.item.n)}">${IC_X}</button></span>${sp ? `<label class="fld">Note on the card<input data-ad="sp-note" data-i="${i}" value="${esc(list[i].note)}" maxlength="48" placeholder="Twelve portions tonight" autocomplete="off"></label>` : ""}</li>`;
  }).join("");
  return `${segHTML()}<p class="ad-help">${help}</p>${rows ? `<ul class="ai-list">${rows}</ul>` : `<p class="ad-empty">Nothing here yet. This block stays hidden on the menu until you add something.</p>`}<button class="btn-soft ad-addbtn" type="button" data-ad="l-pick">Add ${AD.side === "kitchen" ? "a dish" : "a drink"} from the menu</button>`;
}
const adDirty = () => !!AD && JSON.stringify(normLive(AD.draft)) !== liveSig;
function adBarHTML() {
  if (AD.busy) return `<p>Publishing…</p>`;
  if (adDirty()) return `<p>${AD.msg ? esc(AD.msg) : "You have unpublished changes."}</p><button class="btn-soft" type="button" data-ad="discard">Discard</button><button class="btn-primary c" type="button" data-ad="publish">${Source.canWrite ? "Publish" : "Preview"}</button>`;
  return `<p>${esc(AD.msg || (Source.canWrite ? "Everything here is live on the menu." : "No changes yet."))}</p>`;
}
const updateAdBar = () => { const b = $("#adBar"); if (b) b.innerHTML = adBarHTML(); };
function renderAdmin() {
  if (!AD) return;
  const st = AD.top ? 0 : adminEl.scrollTop; AD.top = false;
  const ae = document.activeElement, fk = ae && adminEl.contains(ae) && ae.dataset && ae.dataset.ad ? `[data-ad="${ae.dataset.ad}"]${ae.dataset.i != null ? `[data-i="${ae.dataset.i}"]` : ""}${ae.dataset.t ? `[data-t="${ae.dataset.t}"]` : ""}${ae.dataset.side ? `[data-side="${ae.dataset.side}"]` : ""}` : null;
  const s = Source.state, live = Source.canWrite;
  const pill = live ? `<span class="ad-live on"><i></i>Live</span>` : `<span class="ad-live${s === "error" ? " off" : ""}"><i></i>${s === "connecting" ? "Connecting" : s === "error" ? "Offline" : "Preview"}</span>`;
  const note = live ? "" : `<p class="ad-note">${s === "view" ? "Only Tressa's menu editors can publish. Changes you make here show on this phone only." : s === "connecting" ? "Connecting to the menu data…" : "Preview mode: changes apply on this phone only, so you can see how they look. Publishing goes live once the menu is connected to Tressa's data."}</p>`;
  adminEl.innerHTML = `<div class="ad-in"><div class="ad-top pad"><div class="ad-row"><button class="back" type="button" data-ad="close">${CHEV}Menu</button>${pill}</div><div><p class="sh-eyebrow">Tressa · Staff</p><h2 class="ad-title" id="ad-title">Menu admin</h2></div></div><div class="ad-head pad"><div class="ad-tabs" role="tablist" aria-label="Sections">${AD_TABS.map(([k, l]) => `<button type="button" role="tab" data-ad="tab" data-t="${k}" aria-selected="${AD.tab === k}">${l}</button>`).join("")}</div>${AD.tab === "items" ? findHTML("it-q", "it-scope", AD.iq, AD.scope, ["kitchen", "bar"], `<button class="btn-primary c ad-new" type="button" data-ad="ed-new">${IC_PLUS}Add item</button>`) : ""}</div><div class="pad">${note}${adBodyHTML()}<p class="ad-src">Dishes, photos, banners and specials are saved with this menu${live ? " and reach guests viewing it on claude.ai straight away" : ""}. When the menu moves to Tressa's own domain, this panel will read and write the captain pad instead.</p></div></div><div class="ad-bar" id="adBar">${adBarHTML()}</div>${AD.pick ? pickHTML() : ""}${AD.ed ? edHTML() : ""}`;
  adminEl.scrollTop = st;
  renderItems(); renderPick();
  if (AD.pick && AD.pick.focus) { AD.pick.focus = false; const q = $('[data-ad="pk-q"]', adminEl); if (q) { q.focus({ preventScroll: true }); return; } }
  if (AD.ed && AD.ed.focus) { AD.ed.focus = false; const t = AD.ed.id ? $(".ad-ed", adminEl) : $('[data-ad="ed-n"]', adminEl); if (t) { t.focus({ preventScroll: true }); return; } }
  if (fk) { const f = $(fk, adminEl); if (f) f.focus({ preventScroll: true }); }
}
const ADMIN_ON = !!(window.claude && typeof window.claude.use === "function") || window.TRESSA_ADMIN === true;
function openAdmin() {
  if (!ADMIN_ON) return;
  if (AD) return;
  if (stack.length) closeSheet();
  if (!search.hidden) closeSearch();
  adFocusBack = document.activeElement;
  AD = { tab: "items", side: state.tab || "kitchen", draft: clone(LIVE), iq: "", scope: "all", pick: null, open: null, msg: "", busy: false, top: true };
  adminEl.hidden = false; lock(); renderAdmin();
  try { history.replaceState(null, "", "#admin"); } catch (err) {}
  adminEl.focus({ preventScroll: true });
  if (hasGsap) gsap.fromTo(adminEl, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .42, ease: "power3.out", clearProps: "transform,opacity" });
}
function closeAdmin(btn) {
  if (!AD) return;
  if (adDirty() && btn && !btn.classList.contains("armed")) { btn.classList.add("armed"); btn.innerHTML = `${CHEV}Discard changes?`; setTimeout(() => { if (btn.isConnected) { btn.classList.remove("armed"); btn.innerHTML = `${CHEV}Menu`; } }, 3000); return; }
  AD = null; adminEl.hidden = true; adminEl.innerHTML = ""; unlock();
  try { history.replaceState(null, "", "#" + state.tab); } catch (err) {}
  if (adFocusBack && document.contains(adFocusBack)) adFocusBack.focus({ preventScroll: true });
}
async function publishAdmin() {
  const data = normLive(AD.draft);
  if (Source.canWrite) {
    AD.busy = true; updateAdBar();
    try { await Source.write(data); AD.busy = false; applyLive(data); AD.draft = clone(LIVE); AD.msg = "Published. Guests see the new menu now."; }
    catch (err) { AD.busy = false; AD.msg = "Couldn't publish just now. Check the connection and try again."; }
  } else { applyLive(data); AD.draft = clone(LIVE); AD.msg = "Applied on this phone. Close the panel to see it."; }
  if (AD) renderAdmin();
}
adminEl.addEventListener("click", ev => {
  ev.stopPropagation();
  const b = ev.target.closest("[data-ad]");
  if (!b || !AD || /^(INPUT|SELECT|TEXTAREA)$/.test(b.tagName)) return;
  const act = b.dataset.ad, i = +b.dataset.i, d = AD.draft;
  if (act === "close") return closeAdmin(b);
  if (act === "publish") return publishAdmin();
  if (act === "ed-new") return openEditor(null);
  if (act === "ed-open") return openEditor(b.dataset.id);
  if (act === "ed-restore") return restoreItem(b.dataset.id);
  if (act.startsWith("ed-") && AD.ed) {
    const f = AD.ed, val = b.dataset.val;
    if (act === "ed-close") { AD.ed = null; return renderAdmin(); }
    if (f.busy) return;
    if (act === "ed-save") return saveItem();
    if (act === "ed-tab") { if (f.tab !== val) { f.tab = val; f.cat = ""; f.p = ["", ""]; f.v = "v"; f.s = 0; f.t = f.t.filter(t => val === "kitchen" || t !== "jain"); } }
    else if (act === "ed-v") f.v = val;
    else if (act === "ed-s") f.s = +val;
    else if (act === "ed-tag") f.t = f.t.includes(val) ? f.t.filter(t => t !== val) : [...f.t, val];
    else if (act === "ed-unphoto") { f.photo = ""; f.blob = null; f.img = ""; }
    else if (act === "ed-del" || act === "ed-reset") {
      const k = act === "ed-del" ? "del" : "reset";
      if (f.arm !== k) { f.arm = k; renderEd(); setTimeout(() => { if (AD && AD.ed === f && f.arm === k) { f.arm = ""; renderEd(); } }, 3000); return; }
      return removeItem(k === "reset");
    }
    f.err = ""; return renderEd();
  }
  if (act === "pl") {
    const id = b.dataset.id, k = b.dataset.k, li = b.closest(".ad-it");
    AD.msg = place(id, k);
    if (li) { li.outerHTML = adItemHTML(INDEX[id]); const f = $(`[data-ad="pl"][data-k="${k}"][data-id="${id}"]`, adminEl); if (f) f.focus({ preventScroll: true }); }
    updateAdBar(); return;
  }
  if (act === "pk-close") { AD.pick = null; return renderAdmin(); }
  if (act === "pk") { if (b.getAttribute("aria-disabled") !== "true") { choosePick(b.dataset.id); renderAdmin(); } return; }
  if (act === "b-pick") { const bn = d.banners[i]; AD.pick = { for: "banner", i, tabs: linkTabs(bn), q: "", scope: "all", cur: bn.link.id, focus: true }; return renderAdmin(); }
  if (act === "l-pick") { AD.pick = { for: "list", tabs: [AD.side], q: "", scope: "all", skip: new Set(listRef().map(x => typeof x === "string" ? x : x.id)), focus: true }; return renderAdmin(); }
  if (act === "tab") { AD.tab = b.dataset.t; AD.top = true; }
  else if (act === "side") AD.side = b.dataset.side;
  else if (act === "b-up" || act === "b-down") { const j = act === "b-up" ? i - 1 : i + 1; if (d.banners[j]) [d.banners[i], d.banners[j]] = [d.banners[j], d.banners[i]]; }
  else if (act === "b-del") {
    if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap to delete"; setTimeout(() => { if (b.isConnected) { b.classList.remove("armed"); b.textContent = "Delete"; } }, 3000); return; }
    d.banners.splice(i, 1);
  }
  else if (act === "b-add") {
    const side = state.tab || "kitchen", first = LIVE.specials[side][0];
    const nb = { id: "b" + Date.now().toString(36), on: true, tab: side, tag: "Today's Special", title: first ? INDEX[first.id].item.n : "New banner", line: "", link: { type: "item", id: first ? first.id : "" } };
    fixLink(nb); d.banners.push(nb); AD.open = nb.id;
  }
  else if (act === "l-up" || act === "l-down") { const L = listRef(), j = act === "l-up" ? i - 1 : i + 1; if (L[j] != null) [L[i], L[j]] = [L[j], L[i]]; }
  else if (act === "l-del") listRef().splice(i, 1);
  else if (act === "discard") { AD.draft = clone(LIVE); AD.open = null; }
  else return;
  AD.msg = ""; renderAdmin();
});
adminEl.addEventListener("change", ev => {
  const t = ev.target, act = t.dataset && t.dataset.ad; if (!act || !AD) return;
  const d = AD.draft, bn = d.banners[+t.dataset.i];
  if (act === "it-scope") { AD.scope = t.value; renderItems(); return; }
  if (act === "pk-scope") { if (AD.pick) { AD.pick.scope = t.value; renderPick(); } return; }
  if (act === "ed-cat" && AD.ed) { AD.ed.cat = t.value; AD.ed.err = ""; return renderEd(); }
  if (act === "ed-file" && AD.ed) {
    const f = AD.ed, file = t.files && t.files[0]; t.value = ""; if (!file) return;
    f.err = ""; f.prep = true; renderEd();
    preparePhoto(file).then(r => { if (AD && AD.ed === f) { f.blob = r.blob; f.photo = r.url; f.prep = false; renderEd(); } })
      .catch(err => { if (AD && AD.ed === f) { f.prep = false; f.err = errText(err); renderEd(); } });
    return;
  }
  if (act === "b-on") bn.on = t.checked;
  else if (act === "b-tag") bn.tag = t.value;
  else if (act === "b-where") { bn.tab = t.value; fixLink(bn); }
  else if (act === "b-type") { bn.link.type = t.value; bn.link.id = ""; fixLink(bn); }
  else if (act === "b-target") bn.link.id = t.value;
  else return;
  AD.msg = ""; renderAdmin();
});
adminEl.addEventListener("input", ev => {
  const t = ev.target, act = t.dataset && t.dataset.ad; if (!act || !AD) return;
  const i = +t.dataset.i, d = AD.draft;
  if (act === "it-q") { AD.iq = t.value; renderItems(); return; }
  if (act === "pk-q") { if (AD.pick) { AD.pick.q = t.value; renderPick(); } return; }
  if (AD.ed && (act === "ed-n" || act === "ed-d" || act === "ed-r")) { AD.ed[act.slice(3)] = t.value; return; }
  if (AD.ed && act === "ed-p") { const v = t.value.replace(/[^0-9]/g, "").slice(0, 6); if (v !== t.value) t.value = v; AD.ed.p[+t.dataset.pi] = v; return; }
  if (act === "b-title") { d.banners[i].title = t.value; const m = $(`[data-bt="${i}"]`, adminEl); if (m) m.textContent = t.value || "Untitled"; }
  else if (act === "b-line") d.banners[i].line = t.value;
  else if (act === "sp-note") listRef()[i].note = t.value;
  else return;
  AD.msg = ""; updateAdBar();
});
adminEl.addEventListener("toggle", ev => {
  const el = ev.target; if (!AD || el.tagName !== "DETAILS" || !el.dataset.bid) return;
  if (el.open) AD.open = el.dataset.bid; else if (AD.open === el.dataset.bid) AD.open = null;
}, true);

/* ---------------- splash: crest and name fly into the header ---------------- */
function flyTo(a, b) {
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  return { x: (rb.left + rb.width / 2) - (ra.left + ra.width / 2), y: (rb.top + rb.height / 2) - (ra.top + ra.height / 2), scale: rb.width / ra.width };
}
function runSplash() {
  const sp = $("#splash");
  if (!sp || root.classList.contains("seen")) { if (sp) sp.remove(); afterSplash(); return; }
  try { sessionStorage.setItem("tressa-splash", "1"); } catch (err) {}
  if (!hasGsap || performance.now() > 1800) { setTimeout(() => sp.remove(), 3200); setTimeout(afterSplash, 2200); return; }
  sp.classList.add("js");
  try { history.scrollRestoration = "manual"; } catch (err) {}
  window.scrollTo(0, 0); onScroll();
  const c = $(".sp-crest", sp), w = $(".sp-word", sp), t = $(".sp-tag", sp), bg = $(".sp-bg", sp);
  nbCrest.style.visibility = "hidden"; nbTitle.style.visibility = "hidden";
  const finish = () => { nbCrest.style.visibility = ""; nbTitle.style.visibility = ""; sp.remove(); afterSplash(); };
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from(c, { opacity: 0, scale: .72, duration: .7 })
    .from(w, { opacity: 0, y: 10, duration: .6 }, "-=.45")
    .from(t, { opacity: 0, duration: .4 }, "-=.3")
    .add(() => {
      const fc = flyTo(c, nbCrest), fw = flyTo(w, nbTitle);
      gsap.to(t, { opacity: 0, duration: .2 });
      gsap.to(c, { ...fc, duration: .75, ease: "power3.inOut" });
      gsap.to(w, { ...fw, duration: .75, ease: "power3.inOut" });
      gsap.to(bg, { opacity: 0, duration: .55, delay: .15, ease: "power2.out" });
      gsap.delayedCall(.78, finish);
    }, "+=.3");
}

/* ---------------- events ---------------- */
document.addEventListener("click", ev => {
  if (adminEl.contains(ev.target)) return;
  const a = ev.target.closest("[data-act]");
  if (a) {
    const act = a.dataset.act, key = a.dataset.key;
    if (act === "close") closeSheet();
    else if (act === "back") backView();
    else if (act === "add" || act === "inc") { const f = act === "add" && !OUT.has(key.split("|")[0]) && fly(a); setQty(key, (state.list[key] || 0) + 1, { fly: f }); }
    else if (act === "dec") setQty(key, (state.list[key] || 0) - 1);
    else if (act === "pair-add") setQty(key, (state.list[key] || 0) + 1, { fromPair: true });
    else if (act === "switch") {
      const from = a.dataset.from, to = a.dataset.to, n = +a.dataset.n, rest = +a.dataset.rest;
      if (rest > 0) state.list[from] = rest; else delete state.list[from];
      state.list[to] = Math.min(20, (state.list[to] || 0) + n);
      save(); updateTray(); updateCtls(); buzz(); renderSheet(false);
    }
    else if (act === "plan") startPlan();
    else if (act === "pl-opt" && plan) {
      const Q = PLAN_Q[plan.step];
      plan.a[Q.k] = Q.nums || Q.k === "spice" ? +a.dataset.val : a.dataset.val;
      buzz();
      if (plan.step < PLAN_Q.length - 1) plan.step++; else plan.items = composePlan(plan.a, plan.seed);
      renderPlan();
    }
    else if (act === "pl-back" && plan) { if (plan.items) { plan.items = null; plan.step = PLAN_Q.length - 1; } else if (plan.step > 0) plan.step--; renderPlan(); }
    else if (act === "pl-shuffle" && plan) { plan.seed++; plan.items = composePlan(plan.a, plan.seed); renderPlan(); }
    else if ((act === "pl-inc" || act === "pl-dec") && plan && plan.items) {
      const i = +a.dataset.i, x = plan.items[i];
      if (x) { x.q += act === "pl-inc" ? 1 : -1; if (x.q <= 0) plan.items.splice(i, 1); else x.q = Math.min(20, x.q); }
      renderSheet(false);
    }
    else if (act === "pl-add" && plan && plan.items) {
      for (const x of plan.items) state.list[x.key] = Math.min(20, (state.list[x.key] || 0) + x.q);
      save(); updateTray(); updateCtls(); buzz(); bumpBadge();
      openView({ v: "tray" }, false);
    }
    else if (act === "server") openServer();
    else if (act === "sv-close") closeServer();
    else if (act === "tray") openView({ v: "tray" }, stack.length > 0 && stack[stack.length - 1].v !== "tray");
    else if (act === "info") openView({ v: "info" }, false);
    else if (act === "offers") openView({ v: "offers" }, false);
    else if (act === "search") openSearch();
    else if (act === "view") setView(a.dataset.v, true);
    else if (act === "admin") openAdmin();
    else if (act === "clear") {
      if (a.classList.contains("armed")) { clearTimeout(clearTimer); state.list = {}; save(); updateTray(); updateCtls(); closeSheet(); }
      else { a.classList.add("armed"); a.textContent = "Tap to confirm"; clearTimer = setTimeout(() => { if (a.isConnected) { a.classList.remove("armed"); a.textContent = "Clear"; } }, 3000); }
    }
    return;
  }
  const tb = ev.target.closest(".tb[data-tab]");
  if (tb) {
    const t = tb.dataset.tab;
    if (!search.hidden) closeSearch(t);
    if (t === state.tab) scrollToY(0); else setTab(t, { animate: true });
    return;
  }
  if (ev.target.closest("#nbTitle")) { scrollToY(0); return; }
  const chip = ev.target.closest(".chip");
  if (chip) { const s = document.getElementById(chip.dataset.target); if (s) goTo(s); return; }
  const bh = ev.target.closest("[data-bn]");
  if (bh) { openBanner(bh.dataset.bn); return; }
  const off = ev.target.closest("[data-offer]");
  if (off) { openView({ v: "offer", id: off.dataset.offer }, true); return; }
  const col = ev.target.closest("[data-col]");
  if (col) { openView({ v: "col", tab: state.tab, id: col.dataset.col }, false); return; }
  const sug = ev.target.closest("[data-q]");
  if (sug) { qInput.value = sug.dataset.q; renderResults(); return; }
  const it = ev.target.closest("[data-id]");
  if (it && INDEX[it.dataset.id]) openView({ v: "item", id: it.dataset.id }, sheet.contains(it));
});
vegBtn.addEventListener("click", () => { state.veg = !state.veg; save(); applyVeg(); buzz(); });
$("#closeSearch").addEventListener("click", () => closeSearch());
qInput.addEventListener("input", renderResults);
qInput.addEventListener("keydown", e => { if (e.key === "Enter") qInput.blur(); });

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (AD) { e.preventDefault(); if (AD.ed) { if (!AD.ed.busy) { AD.ed = null; renderAdmin(); } } else if (AD.pick) { AD.pick = null; renderAdmin(); } else closeAdmin($('[data-ad="close"]', adminEl)); }
    else if (!serverEl.hidden) { e.preventDefault(); closeServer(); }
    else if (stack.length > 1) { e.preventDefault(); backView(); }
    else if (stack.length) { e.preventDefault(); closeSheet(); }
    else if (!search.hidden) { e.preventDefault(); closeSearch(); }
    return;
  }
  if (e.key !== "Tab") return;
  const box = AD ? ($(".ad-ed", adminEl) || $(".ad-pick", adminEl) || adminEl) : !serverEl.hidden ? serverEl : stack.length ? sheet : (!search.hidden ? search : null);
  if (!box) return;
  const f = $$("button, input, select, textarea, summary, a[href]", box).filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => { onScroll(); spy(false); ticking = false; });
}, { passive: true });
window.addEventListener("resize", () => { measureHero(); onScroll(); }, { passive: true });
window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h === "admin") openAdmin(); else if (TABS[h] && h !== state.tab) setTab(h, { animate: true }); });

/* ---------------- boot ---------------- */
const h0 = location.hash.slice(1).toLowerCase();
const hm = /^(?:(kitchen|bar|soul|unwind|sky|aura)-)?table-([a-z0-9]{1,6})$/.exec(h0);
if (hm) setTableNo(hm[2]);
let vKey = VENUES[h0] ? h0 : hm && VENUES[hm[1]] ? hm[1] : "";
try { const v = (new URLSearchParams(location.search).get("venue") || "").toLowerCase(); if (VENUES[v]) vKey = v; } catch (err) {}
const pv = /^\/menu\/(soul|unwind|sky|aura)\/?$/i.exec(location.pathname);
if (pv) vKey = pv[1].toLowerCase();
try { const qt = new URLSearchParams(location.search).get("table"); if (qt && /^[a-z0-9]{1,6}$/i.test(qt)) setTableNo(qt); } catch (err) {}
const vFresh = !!vKey;
try { if (vKey) sessionStorage.setItem("tressa-venue", vKey); else vKey = sessionStorage.getItem("tressa-venue") || ""; } catch (err) {}
VENUE = VENUES[vKey] || null;
markView();
setTab(TABS[h0] ? h0 : hm && TABS[hm[1]] ? hm[1] : vFresh && VENUE ? VENUE.tab : "kitchen");
applyVeg(); updateTray();
runSplash();
Source.connect(applyLive, applyItems);
function applyMenuDoc(doc) {
  for (const tab of TABK) MENU[tab].sections = doc.menu[tab].sections;
  initBase();
  BAR_SECS.clear(); for (const s of MENU.bar.sections) BAR_SECS.add(s.id);
  PLAIN.clear(); for (const id of plainIds()) PLAIN.add(id);
  ITEMS = {}; itemsSig = "{}";
  buildMenu(ITEMS); rebuildIndex(); buildSearch();
  liveRaw = doc.live; LIVE = normLive(liveRaw); liveSig = JSON.stringify(LIVE); OUT = new Set(LIVE.soldOut);
  rerender(); updateTray();
}
const Remote = {
  ver: REMOTE ? REMOTE.ver : "", busy: false,
  async pull() {
    if (!REMOTE_URL || this.busy || document.hidden) return;
    this.busy = true;
    try {
      const r = await fetch(REMOTE_URL, { cache: "no-store", credentials: "omit" });
      if (!r.ok) return;
      const j = await r.json();
      // Nothing published (or it was cleared): forget the saved copy and, if this page is showing it,
      // reload once onto the built-in menu.
      if (!j || j.published !== true) { if (this.ver) { this.ver = ""; try { localStorage.removeItem(REMOTE_KEY); } catch (err) {} if (REMOTE) location.reload(); } return; }
      const ver = j.version + "|" + j.publishedAt;
      if (ver === this.ver || !docOk(j.doc)) return;
      applyMenuDoc(j.doc);
      this.ver = ver;
      try { localStorage.setItem(REMOTE_KEY, JSON.stringify({ ver, doc: j.doc })); } catch (err) {}
    } catch (err) {
    } finally { this.busy = false; }
  }
};
if (REMOTE_URL) {
  Remote.pull();
  setInterval(() => Remote.pull(), 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) Remote.pull(); });
}
if (h0 === "admin") openAdmin();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureHero(); onScroll(); });
let liveCount = OFFERS.filter(offerLive).length;
setInterval(() => {
  updateStatus();
  const n = OFFERS.filter(offerLive).length;
  if (n !== liveCount) { liveCount = n; renderQuick(); }
}, 60000);
})();
