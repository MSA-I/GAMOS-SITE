/**
 * directions-map.js — #routes "מסלולי הגעה" branded interactive map
 *
 * Owner : Directions Section (2026-06-10 redesign)
 * Spec  : CLAUDE.md §2 (Leaflet ~42KB self-hosted, this map ONLY),
 *         §4 (RTL-first), §8 (reduced motion), §9 (a11y),
 *         §10.3 (init/destroy, module-scoped, idempotent, no globals).
 *
 * Concept
 * -------
 * One Leaflet map (CARTO Positron tiles, recolored to brass/cream in
 * css/sections/directions.css) with a brass venue pin and THREE origin
 * tabs (מירושלים / מהמרכז / מצפון). Selecting a tab:
 *   1. flyToBounds([origin, venue]) so both fit the frame,
 *   2. swaps the active route polyline + animates it drawing on (GSAP
 *      stroke-dashoffset; falls back to instant if GSAP/ScrollTrigger
 *      or reduced-motion),
 *   3. updates the glass-card "≈NN דק׳ · NN ק״מ" label,
 *   4. re-points the three CTA hrefs (Waze / Google Maps / WhatsApp).
 *
 * Route geometry + durations/distances were pulled ONCE from the OSRM
 * demo router (real road-following lines) and baked in below — no runtime
 * routing dependency. Real navigation is delegated to the CTA apps.
 *
 * The map starts hidden under #contact (.reveal-pair), so we defer the
 * Leaflet init + invalidateSize() until the section first scrolls into
 * view (IntersectionObserver) — otherwise Leaflet reads a 0×0 container
 * and paints grey gaps.
 *
 * Public API: init(), destroy()
 */

// ---------------------------------------------------------------------------
// Constants — venue + per-origin route data (baked from OSRM, [lat,lng])
// ---------------------------------------------------------------------------

const VENUE = [31.7878076, 35.3371583]; // די זהב, פארק ישראל
const DEST_STR = "31.7878076,35.3371583";

// WhatsApp business number (matches #contact form data-wa-number).
const WA_NUMBER = "972779972343";

// Per-origin WhatsApp prompts (URL-encoded Hebrew) — "I'm coming from X,
// how do I get to Gamos?".
const WA_TEXT = {
  jerusalem:
    "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%92%D7%99%D7%A2%2F%D7%94%20%D7%9E%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D%20%D7%9C%D7%92%D7%90%D7%9E%D7%95%D7%A1%20%E2%80%94%20%D7%90%D7%99%D7%9A%20%D7%9B%D7%93%D7%90%D7%99%20%D7%9C%D7%94%D7%92%D7%99%D7%A2%3F",
  telaviv:
    "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%92%D7%99%D7%A2%2F%D7%94%20%D7%9E%D7%94%D7%9E%D7%A8%D7%9B%D7%96%20%D7%9C%D7%92%D7%90%D7%9E%D7%95%D7%A1%20%E2%80%94%20%D7%90%D7%99%D7%9A%20%D7%9B%D7%93%D7%90%D7%99%20%D7%9C%D7%94%D7%92%D7%99%D7%A2%3F",
  north:
    "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%92%D7%99%D7%A2%2F%D7%94%20%D7%9E%D7%A6%D7%A4%D7%95%D7%9F%20%D7%94%D7%90%D7%A8%D7%A5%20%D7%9C%D7%92%D7%90%D7%9E%D7%95%D7%A1%20%E2%80%94%20%D7%90%D7%99%D7%9A%20%D7%9B%D7%93%D7%90%D7%99%20%D7%9C%D7%94%D7%92%D7%99%D7%A2%3F",
  south:
    "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%92%D7%99%D7%A2%2F%D7%94%20%D7%9E%D7%93%D7%A8%D7%95%D7%9D%20%D7%94%D7%90%D7%A8%D7%A5%20%D7%9C%D7%92%D7%90%D7%9E%D7%95%D7%A1%20%E2%80%94%20%D7%90%D7%99%D7%9A%20%D7%9B%D7%93%D7%90%D7%99%20%D7%9C%D7%94%D7%92%D7%99%D7%A2%3F",
};

// Existing Waze venue deep-link (from the old #contact CTA) — navigates
// straight to the saved Gamos venue regardless of origin.
const WAZE_VENUE =
  "https://ul.waze.com/ul?preview_venue_id=23134526.231607403.655613&navigate=yes";

/**
 * ORIGINS — order matters: first entry is the default (checked) tab and,
 * in RTL, the rightmost. labelHe drives the card "from X" line; min/km are
 * the OSRM-reported figures (rounded for display); coords are the real
 * road-following geometry as [lat,lng].
 */
const ORIGINS = {
  jerusalem: {
    labelHe: "מירושלים",
    min: 17,
    km: 16,
    coords: [[31.77903,35.22549],[31.78021,35.22759],[31.78125,35.22822],[31.78304,35.22728],[31.78964,35.22682],[31.79,35.22897],[31.79285,35.22936],[31.79254,35.23103],[31.79306,35.23414],[31.79392,35.23481],[31.79508,35.23458],[31.79584,35.23546],[31.79408,35.23704],[31.79319,35.23999],[31.79105,35.24065],[31.79035,35.24159],[31.78962,35.24688],[31.79072,35.25386],[31.79032,35.25585],[31.78916,35.25725],[31.78593,35.25894],[31.78311,35.26395],[31.78346,35.26744],[31.78855,35.27669],[31.78786,35.279],[31.78476,35.2813],[31.784,35.28264],[31.78411,35.29163],[31.78522,35.29342],[31.78896,35.29422],[31.79761,35.30099],[31.79906,35.30289],[31.80002,35.30626],[31.7998,35.31309],[31.80219,35.32147],[31.80411,35.3248],[31.79649,35.33154],[31.79463,35.3323],[31.79037,35.33588],[31.78882,35.33607],[31.78888,35.33713],[31.78781,35.33716]],
  },
  telaviv: {
    labelHe: "מהמרכז",
    min: 63,
    km: 72,
    coords: [[32.08534,34.78182],[32.07357,34.78178],[32.07271,34.79261],[32.05228,34.78416],[32.04116,34.78956],[32.00648,34.83739],[32.00047,34.84255],[31.99142,34.85859],[31.99051,34.86398],[31.99523,34.87301],[31.99501,34.87913],[31.9867,34.88787],[31.96902,34.91727],[31.96203,34.93669],[31.95267,34.94946],[31.94406,34.9773],[31.93598,34.9893],[31.92832,34.99384],[31.91675,35.0138],[31.90605,35.02037],[31.89913,35.03363],[31.88995,35.06584],[31.89087,35.07717],[31.8835,35.08798],[31.88684,35.09881],[31.88485,35.10881],[31.87809,35.11583],[31.87574,35.12718],[31.86994,35.13785],[31.86967,35.15316],[31.87425,35.1629],[31.86839,35.18503],[31.8575,35.20867],[31.8607,35.22058],[31.84767,35.22827],[31.83691,35.22973],[31.82714,35.23612],[31.82539,35.24121],[31.82867,35.24731],[31.8292,35.25842],[31.82359,35.2689],[31.81848,35.28924],[31.81242,35.29812],[31.81141,35.30503],[31.80643,35.30942],[31.80876,35.32078],[31.80621,35.32583],[31.80445,35.3247],[31.78781,35.33716]],
  },
  north: {
    labelHe: "מהצפון",
    min: 119,
    km: 156,
    coords: [[32.79404,34.99055],[32.79127,35.02989],[32.76747,35.05811],[32.7248,35.10059],[32.68001,35.10611],[32.65791,35.10074],[32.63868,35.06621],[32.60635,35.04557],[32.5844,35.04716],[32.5353,35.02694],[32.45413,35.03678],[32.42458,35.0208],[32.30005,35.01115],[32.19929,34.95707],[32.14786,34.96247],[32.10956,34.93588],[32.05518,34.93942],[32.01712,34.96642],[31.97399,34.96056],[31.95419,34.93929],[31.94406,34.9773],[31.89895,35.03417],[31.88485,35.10881],[31.86994,35.13785],[31.87425,35.1629],[31.8607,35.22058],[31.82714,35.23612],[31.8292,35.25842],[31.80876,35.32078],[31.78781,35.33716]],
  },
  south: {
    labelHe: "מהדרום",
    min: 97,
    km: 115,
    coords: [[31.25189,34.79143],[31.25845,34.79837],[31.27165,34.79805],[31.28058,34.79221],[31.32866,34.7863],[31.36361,34.7961],[31.42297,34.7852],[31.43676,34.77316],[31.45909,34.76968],[31.50025,34.78355],[31.51587,34.78267],[31.53976,34.79687],[31.58816,34.80951],[31.59864,34.81558],[31.58473,34.83548],[31.58596,34.85692],[31.61119,34.90344],[31.63254,34.91959],[31.6662,34.93083],[31.67812,34.94624],[31.70283,34.94363],[31.71198,34.95978],[31.73485,34.96643],[31.75388,34.97929],[31.77955,35.01383],[31.80059,35.01461],[31.8127,35.02164],[31.80029,35.07551],[31.80137,35.12908],[31.79422,35.16491],[31.8033,35.1836],[31.80076,35.19545],[31.8078,35.20556],[31.80813,35.24053],[31.80241,35.24633],[31.80205,35.25596],[31.78488,35.25952],[31.78298,35.26471],[31.78855,35.27669],[31.78424,35.29224],[31.79869,35.30229],[31.80411,35.3248],[31.78781,35.33716]],
  },
};

const ORIGIN_KEYS = ["jerusalem", "telaviv", "north", "south"];

/**
 * LANDMARKS — city/town labels shown along EACH route (per active tab), so
 * visitors read the distance scale by recognizing the places the drive
 * passes. Jerusalem's entry additionally lists neighborhood labels (shown
 * only on the Jerusalem tab). [lat, lng]. `anchor` nudges the label off the
 * point: "right" | "left" | "top" | "bottom".
 *
 * Always-on anchors (venue + the origin city) are handled separately; these
 * are the en-route waypoints that swap with the selected origin.
 */
// Candidate place pools per route. These are FILTERED at render time to keep
// only the ones the route polyline actually passes (within ON_ROUTE_MAX_M),
// and each surviving label is snapped onto the nearest point of the route line
// — so what shows is exactly "the cities/neighborhoods on the route". Generous
// pools are fine: anything off-route is dropped automatically.
const ROUTE_LABELS = {
  // Jerusalem tab carries NEIGHBORHOOD names (the venue sits just east of the
  // city, so the eastern-corridor neighborhoods are what the drive passes).
  jerusalem: [
    { name: "מרכז העיר",      at: [31.78197, 35.21957], anchor: "left" },
    { name: "העיר העתיקה",    at: [31.77829, 35.23195], anchor: "bottom" },
    { name: "הר הצופים",      at: [31.79226, 35.24617], anchor: "top" },
    { name: "הגבעה הצרפתית",  at: [31.80402, 35.23828], anchor: "top" },
    { name: "רמת אשכול",      at: [31.80179, 35.22288], anchor: "left" },
    { name: "פסגת זאב",       at: [31.82234, 35.24103], anchor: "left" },
    { name: "נווה יעקב",      at: [31.84221, 35.24206], anchor: "left" },
    { name: "מעלה אדומים",    at: [31.77300, 35.30000], anchor: "bottom" },
  ],
  // Center, via the Route 443 / Modiin corridor (the baked geometry).
  telaviv: [
    { name: "אור יהודה",  at: [32.02700, 34.86299], anchor: "left" },
    { name: "יהוד",       at: [32.03318, 34.89075], anchor: "top" },
    { name: "פתח תקווה",  at: [32.08776, 34.88600], anchor: "top" },
    { name: "ראש העין",   at: [32.09529, 34.95332], anchor: "top" },
    { name: "אלעד",       at: [32.05007, 34.95215], anchor: "left" },
    { name: "בן שמן",     at: [31.95228, 34.92194], anchor: "bottom" },
    { name: "שוהם",       at: [32.00048, 34.94654], anchor: "top" },
    { name: "מודיעין",    at: [31.90857, 35.00693], anchor: "top" },
    { name: "מכבים רעות", at: [31.89209, 35.03399], anchor: "bottom" },
    { name: "ירושלים",    at: [31.78197, 35.21957], anchor: "bottom" },
    { name: "מעלה אדומים",at: [31.77300, 35.30000], anchor: "bottom" },
  ],
  // North down the inland Cross-Israel corridor (Route 6) then Route 1.
  north: [
    { name: "יקנעם",         at: [32.64806, 35.09435], anchor: "left" },
    { name: "פרדס חנה",      at: [32.47500, 34.97514], anchor: "left" },
    { name: "באקה אל-גרבייה",at: [32.41971, 35.04283], anchor: "right" },
    { name: "קלנסווה",       at: [32.28486, 34.98017], anchor: "left" },
    { name: "טייבה",         at: [32.26712, 35.00890], anchor: "right" },
    { name: "כפר קאסם",      at: [32.11520, 34.97526], anchor: "left" },
    { name: "ראש העין",      at: [32.09529, 34.95332], anchor: "top" },
    { name: "שוהם",          at: [32.00048, 34.94654], anchor: "top" },
    { name: "מודיעין",       at: [31.90857, 35.00693], anchor: "top" },
    { name: "שער הגיא",      at: [31.81700, 35.02400], anchor: "bottom" },
    { name: "אבו גוש",       at: [31.80635, 35.10887], anchor: "top" },
    { name: "מבשרת ציון",    at: [31.80572, 35.15273], anchor: "bottom" },
    { name: "ירושלים",       at: [31.78197, 35.21957], anchor: "bottom" },
    { name: "מעלה אדומים",   at: [31.77300, 35.30000], anchor: "bottom" },
  ],
  // South via Route 6 / 40.
  south: [
    { name: "קרית גת",    at: [31.60940, 34.77120], anchor: "left" },
    { name: "קרית מלאכי", at: [31.73160, 34.74461], anchor: "left" },
    { name: "בית שמש",    at: [31.74621, 34.98868], anchor: "bottom" },
    { name: "שער הגיא",   at: [31.81700, 35.02400], anchor: "top" },
    { name: "אבו גוש",    at: [31.80635, 35.10887], anchor: "top" },
    { name: "מבשרת ציון", at: [31.80572, 35.15273], anchor: "top" },
    { name: "מוצא",       at: [31.79279, 35.16851], anchor: "bottom" },
    { name: "ירושלים",    at: [31.78197, 35.21957], anchor: "bottom" },
    { name: "מעלה אדומים",at: [31.77300, 35.30000], anchor: "bottom" },
  ],
};

// A label survives only if it lies within this many meters of the route line.
// Tightened (was 4200) so ONLY towns genuinely adjacent to the drawn route
// show — anything farther reads as "not on the route" and is dropped.
const ON_ROUTE_MAX_M = 2600;

// How far to nudge each label from its true location toward the nearest route
// point: 0 = stay at the real city, 1 = sit exactly on the line. ~0.6 keeps
// the label visibly close to BOTH the route and the city's real position.
const LABEL_BLEND = 0.6;

// Per-origin "start" city label (sits at the route's far end / origin city).
const ORIGIN_CITY = {
  jerusalem: "ירושלים",
  telaviv:   "תל אביב",
  north:     "חיפה",
  south:     "באר שבע",
};

// Basemap tiles: warm beige land + naturally BLUE water, no built-in labels
// (our Hebrew labels stay clean). A gentle CSS tint warms it to brand without
// killing the blue sea (css/sections/directions.css) — the recolor filter is
// provider-agnostic, so MapTiler "basic" is a drop-in for CARTO Voyager.
//
// ⚠️ PRODUCTION (Constitution §14 / DEPLOYMENT-COSTS.md): the keyless CARTO
// endpoint below is for LOCAL DEV ONLY — it violates CARTO's ToS in production.
// Before go-live, create a free MapTiler key (cloud.maptiler.com), DOMAIN-LOCK
// it to gamos.co.il, and paste it into MAPTILER_KEY. With a key set, the map
// auto-switches to MapTiler (100k tiles/mo free); empty = CARTO dev fallback.
const MAPTILER_KEY = ""; // ← paste domain-restricted MapTiler key here for prod
const TILE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
const TILE_ATTR = MAPTILER_KEY
  ? '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  : "© OpenStreetMap, © CARTO";

// Brass venue pin as an inline-SVG divIcon (no dependency on Leaflet's
// default marker PNGs). Pulse handled in CSS via .directions__pin.
const PIN_SVG =
  '<span class="directions__pin" aria-hidden="true">' +
  '<svg viewBox="0 0 32 44" width="32" height="44">' +
  '<path d="M16 0C7.7 0 1 6.7 1 15c0 10.5 13.2 27 14.0 28a1.3 1.3 0 0 0 2 0C17.8 42 31 25.5 31 15 31 6.7 24.3 0 16 0z" ' +
  'fill="var(--brass-deep, #8B6F46)" stroke="var(--ivory, #F5EFE6)" stroke-width="1.5"/>' +
  '<circle cx="16" cy="15" r="5.5" fill="var(--ivory, #F5EFE6)"/>' +
  "</svg></span>";

// ---------------------------------------------------------------------------
// Module state (closure — no globals)
// ---------------------------------------------------------------------------

const state = {
  initialised: false,
  reducedMotion: false,
  root: null,            // [data-directions]
  mapEl: null,           // #directions-map
  map: null,             // L.Map
  routeLayer: null,      // active L.Polyline
  labelLayer: null,      // L.LayerGroup of per-route place labels
  io: null,              // IntersectionObserver (first-reveal gate)
  resizeObs: null,       // ResizeObserver (invalidateSize on resize)
  mqlMotion: null,       // matchMedia reduced-motion
  inputs: [],            // tab radio inputs
  onInput: null,         // change handler ref (for removal)
  searchForm: null,      // [data-directions-search]
  onSubmit: null,        // submit handler ref (for removal)
  searchMarker: null,    // custom address start label (L.marker)
  active: "jerusalem",
  built: false,          // Leaflet map constructed yet?
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gsapReady() {
  return typeof window.gsap !== "undefined" && state.reducedMotion === false;
}

function setCardAndCtas(key) {
  const o = ORIGINS[key];
  if (!o) return;

  const etaOrigin = state.root.querySelector("[data-directions-eta-origin]");
  const etaStat = state.root.querySelector("[data-directions-eta]");
  if (etaOrigin) etaOrigin.textContent = o.labelHe;
  if (etaStat) etaStat.textContent = `${o.min} דק׳ · ${o.km} ק״מ`;

  // Google Maps directions: origin = first route point, destination = venue.
  const origin = o.coords[0];
  const gEl = state.root.querySelector("[data-directions-google]");
  if (gEl) {
    gEl.href =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${origin[0]},${origin[1]}` +
      `&destination=${DEST_STR}&travelmode=driving`;
  }
  // Waze → saved venue (origin-independent; Waze uses the user's GPS).
  const wzEl = state.root.querySelector("[data-directions-waze]");
  if (wzEl) wzEl.href = WAZE_VENUE;
  // WhatsApp → origin-specific question.
  const waEl = state.root.querySelector("[data-directions-wa]");
  if (waEl) waEl.href = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT[key]}`;
}

function syncTabAria() {
  for (const input of state.inputs) {
    const on = input.value === state.active;
    input.setAttribute("aria-selected", on ? "true" : "false");
    input.closest(".directions__tab")?.classList.toggle("is-active", on);
  }
}

/** Build a non-interactive text label divIcon for a place. */
function placeLabel(L, place, variant) {
  const anchor = place.anchor || "right";
  return L.marker(place.at, {
    icon: L.divIcon({
      className: "directions__label-wrap",
      html:
        `<span class="directions__place directions__place--${anchor}` +
        (variant ? ` directions__place--${variant}` : "") +
        '" aria-hidden="true">' +
        '<b class="directions__place-name">' + place.name + "</b>" +
        "</span>",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    keyboard: false,
    interactive: false,
  });
}

/**
 * Closest point on a route polyline to `pt`, in a local equirectangular
 * projection (meters). Returns { distM, at:[lat,lng] } — the snapped point on
 * the line. Used to keep only labels that actually sit ON the route and to
 * place them exactly on it.
 */
function nearestOnRoute(pt, coords) {
  const latRef = (pt[0] * Math.PI) / 180;
  const mLat = 111320;
  const mLon = 111320 * Math.cos(latRef);
  const X = (p) => [p[1] * mLon, p[0] * mLat];     // [lng,lat] → [x,y] meters
  const toLL = (x, y) => [y / mLat, x / mLon];
  const [px, py] = X(pt);

  let best = { distM: Infinity, at: pt };
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = X(coords[i]);
    const [bx, by] = X(coords[i + 1]);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best.distM) best = { distM: d, at: toLL(cx, cy) };
  }
  return best;
}

/** Rebuild the place labels for the active origin — only those ON the route. */
function renderRouteLabels(key) {
  const L = window.L;
  if (!L || !state.map) return;

  if (state.labelLayer) { state.labelLayer.remove(); state.labelLayer = null; }
  const group = L.layerGroup();
  const o = ORIGINS[key];
  if (!o) return;

  // Declutter (2026-06-22, user bug: "the cities are all grouped in the same
  // place"): many candidate towns on a route sit close together (esp. the
  // north/south routes), so without a spacing guard their labels pile into one
  // unreadable cluster. Drop any new label that sits within MIN_GAP_M (meters)
  // of one already shown (or the destination pin). Greedy in data order — the
  // pools are ordered along the route, so the survivors stay spread out, each
  // reading next to its own town. Done in METERS (not screen px) because this
  // runs BEFORE drawRoute()/fitBounds() set the map view, so pixel projection
  // isn't available; the threshold scales with the route's span so the on-screen
  // spacing stays roughly constant whatever zoom fitBounds picks.
  const M_PER_DEG = 111320;
  const distM = (a, b) => {
    const dx = (a[1] - b[1]) * M_PER_DEG * Math.cos((a[0] * Math.PI) / 180);
    const dy = (a[0] - b[0]) * M_PER_DEG;
    return Math.hypot(dx, dy);
  };
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const cc of o.coords) {
    minLat = Math.min(minLat, cc[0]); maxLat = Math.max(maxLat, cc[0]);
    minLng = Math.min(minLng, cc[1]); maxLng = Math.max(maxLng, cc[1]);
  }
  const spanM = distM([minLat, minLng], [maxLat, maxLng]);
  const MIN_GAP_M = spanM / 10;       // ~10 label-slots across the route diagonal
  const placed = [];
  const tooClose = (at) => placed.some((q) => distM(at, q) < MIN_GAP_M);
  // Seed with the destination pin so no town label collides with גאמוס.
  placed.push(o.coords[o.coords.length - 1]);

  // Origin city label sits at the route's start point (always on-route).
  if (ORIGIN_CITY[key]) {
    placeLabel(L, { name: ORIGIN_CITY[key], at: o.coords[0], anchor: "top" }, "origin").addTo(group);
    placed.push(o.coords[0]);
  }

  // Keep only candidates within ON_ROUTE_MAX_M of the line. Place each label
  // BETWEEN its true location and the nearest route point (LABEL_BLEND toward
  // the line) so it reads as close to both the route AND the real city — not
  // detached from either. Skip any that would overlap an already-placed label.
  for (const p of (ROUTE_LABELS[key] || [])) {
    const near = nearestOnRoute(p.at, o.coords);
    if (near.distM > ON_ROUTE_MAX_M) continue;     // off-route → drop
    const at = [
      p.at[0] + (near.at[0] - p.at[0]) * LABEL_BLEND,
      p.at[1] + (near.at[1] - p.at[1]) * LABEL_BLEND,
    ];
    if (tooClose(at)) continue;                     // would overlap → drop
    placeLabel(L, { name: p.name, at, anchor: p.anchor }).addTo(group);
    placed.push(at);
  }

  group.addTo(state.map);
  state.labelLayer = group;
}

/** Draw (or redraw) the polyline for the active origin and animate it on. */
function drawRoute(key, { animate } = { animate: true }) {
  const L = window.L;
  const o = ORIGINS[key];
  if (!L || !o || !state.map) return;

  if (state.routeLayer) {
    state.routeLayer.remove();
    state.routeLayer = null;
  }

  state.routeLayer = L.polyline(o.coords, {
    className: "directions__route",
    // Color/width/glow live in CSS (.directions__route) so the brand stays
    // single-sourced in tokens. These are inert fallbacks.
    color: "#8B6F46",
    weight: 4,
    opacity: 1,
    lineJoin: "round",
    lineCap: "round",
  }).addTo(state.map);

  // Animate the SVG path drawing on via stroke-dashoffset (GSAP if present).
  const path = state.routeLayer.getElement();
  if (!path) return;

  if (!animate || !gsapReady()) {
    path.style.strokeDasharray = "none";
    path.style.strokeDashoffset = "0";
    return;
  }
  const len = path.getTotalLength ? path.getTotalLength() : 0;
  if (!len) return;
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
  window.gsap.to(path.style, {
    strokeDashoffset: 0,
    duration: 1.1,
    ease: "power2.out",
    onComplete() {
      // Release the dash so a later hover/style change doesn't re-clip it.
      path.style.strokeDasharray = "none";
    },
  });
}

function selectOrigin(key, { fly } = { fly: true }) {
  if (!ORIGINS[key]) return;
  // Leaving a custom address search → drop its start label.
  if (state.searchMarker) { state.searchMarker.remove(); state.searchMarker = null; }
  state.active = key;
  syncTabAria();
  setCardAndCtas(key);
  renderRouteLabels(key);
  drawRoute(key, { animate: true });

  if (!state.map) return;
  const L = window.L;
  const bounds = L.latLngBounds(ORIGINS[key].coords).extend(VENUE);
  const opts = fitPadding();
  if (fly && !state.reducedMotion) {
    state.map.flyToBounds(bounds, { ...opts, duration: 0.9 });
  } else {
    state.map.fitBounds(bounds, opts);
  }
}

// ---------------------------------------------------------------------------
// Free-text address search → live geocode + driving route/ETA
// ---------------------------------------------------------------------------
//
// ponytail: geocoding (Photon) + routing (OSRM) run against keyless PUBLIC
// servers. NOTE: we use Photon (photon.komoot.io), NOT Nominatim — Nominatim
// returns HTTP 403 to browser/web-app requests (it forbids being used as a
// geocoding backend), which silently broke the whole search. Photon is built
// for browser/autocomplete use and sends CORS `*`. Both are fine for a
// low-traffic venue map but their usage policies forbid heavy production use —
// flagged in CLAUDE.md §14 / DEPLOYMENT-COSTS.md as a follow-up if traffic grows
// (swap to a keyed / self-hosted geocoder+router). No new dependency — plain
// fetch + the existing self-hosted Leaflet.

// Israel bounding box (minLon,minLat,maxLon,maxLat) — keeps generic street names
// (e.g. "הרצל 50") from matching the same street abroad.
const PHOTON_BBOX = "34.2,29.45,35.95,33.5";

/** Geocode a free-text address to [lat,lng] via Photon (IL-boxed). null if none. */
async function geocodeAddress(q) {
  try {
    const url =
      "https://photon.komoot.io/api/?limit=1&bbox=" + PHOTON_BBOX +
      "&q=" + encodeURIComponent(q);
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data && data.features && data.features[0];
    const c = f && f.geometry && f.geometry.coordinates; // [lng, lat]
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
    return [c[1], c[0]];
  } catch {
    return null;
  }
}

/**
 * Driving route from `from` ([lat,lng]) to the venue via OSRM. Returns
 * { coords:[[lat,lng]…], min, km } (road-following geometry), or null.
 */
async function fetchRoute(from) {
  try {
    const url =
      "https://router.project-osrm.org/route/v1/driving/" +
      `${from[1]},${from[0]};${VENUE[1]},${VENUE[0]}` +
      "?overview=full&geometries=geojson";
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data && data.routes && data.routes[0];
    if (!route || !route.geometry || !route.geometry.coordinates) return null;
    return {
      coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      min: Math.round(route.duration / 60),
      km: Math.round(route.distance / 1000),
    };
  } catch {
    return null;
  }
}

/** Show / hide the inline status message under the search input. */
function setSearchMsg(text) {
  const msg = state.root && state.root.querySelector("[data-directions-msg]");
  if (!msg) return;
  if (text) {
    msg.textContent = text;
    msg.hidden = false;
  } else {
    msg.textContent = "";
    msg.hidden = true;
  }
}

/**
 * Handle a free-text address submit: geocode → route → draw + fit + update the
 * card. Mirrors drawRoute()'s polyline options so the custom route reads
 * identically to a baked one. Does NOT call renderRouteLabels (those are keyed
 * to the baked ORIGINS only). Guards on Leaflet + a built map; otherwise no-ops.
 */
async function onSearchSubmit(e) {
  e.preventDefault();
  const L = window.L;
  const input = state.root && state.root.querySelector("[data-directions-address]");
  const btn = state.searchForm && state.searchForm.querySelector("button[type=submit]");
  if (!input) return;

  const q = input.value.trim();
  if (!q) { input.focus(); return; }

  // Map not ready (vendor failed / not yet built) → no-op gracefully.
  if (!L || !state.map) {
    setSearchMsg("המפה עדיין נטענת, נסו שוב בעוד רגע");
    return;
  }

  if (btn) btn.disabled = true;
  setSearchMsg("מחשב…");

  const coords = await geocodeAddress(q);
  if (!coords) {
    setSearchMsg("לא נמצאה כתובת, נסו שוב");
    if (btn) btn.disabled = false;
    return;
  }

  const route = await fetchRoute(coords);
  if (!route) {
    setSearchMsg("לא הצלחנו לחשב מסלול, נסו שוב");
    if (btn) btn.disabled = false;
    return;
  }

  // Draw the custom route — mirror drawRoute()'s polyline options exactly.
  if (state.routeLayer) { state.routeLayer.remove(); state.routeLayer = null; }
  // Clear the baked place labels — they belong to a baked origin, not this one.
  if (state.labelLayer) { state.labelLayer.remove(); state.labelLayer = null; }
  if (state.searchMarker) { state.searchMarker.remove(); state.searchMarker = null; }
  state.routeLayer = L.polyline(route.coords, {
    className: "directions__route",
    color: "#8B6F46",
    weight: 4,
    opacity: 1,
    lineJoin: "round",
    lineCap: "round",
  }).addTo(state.map);
  state.map.fitBounds(state.routeLayer.getBounds(), { padding: [40, 40] });

  // Label the typed address ON the map at its start point (reuses the same
  // "origin" label style the baked routes use). This is the visible "start point".
  const startName = q.length > 28 ? q.slice(0, 28) + "…" : q;
  state.searchMarker = placeLabel(L, { name: startName, at: coords, anchor: "top" }, "origin");
  state.searchMarker.addTo(state.map);

  // Update the glass card (same fields setCardAndCtas touches).
  const etaOrigin = state.root.querySelector("[data-directions-eta-origin]");
  const etaStat = state.root.querySelector("[data-directions-eta]");
  if (etaOrigin) etaOrigin.textContent = startName;
  if (etaStat) etaStat.textContent = `${route.min} דק׳ · ${route.km} ק״מ`;
  const gEl = state.root.querySelector("[data-directions-google]");
  if (gEl) {
    gEl.href =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${coords[0]},${coords[1]}` +
      `&destination=${DEST_STR}&travelmode=driving`;
  }
  // Waze / WhatsApp left as-is (venue-deep-link / generic question).

  // Custom route is now "active" — drop the baked tabs' visual selection.
  state.active = null;
  for (const tab of state.inputs) {
    tab.checked = false;
    tab.setAttribute("aria-selected", "false");
    tab.closest(".directions__tab")?.classList.remove("is-active");
  }

  setSearchMsg("");
  if (btn) btn.disabled = false;
}

/**
 * Reserve the floating glass card's footprint so route labels never hide
 * behind it. The card sits at the bottom inline-end corner — in RTL that's
 * the LEFT edge — so we inset the top-left padding by the card width. On
 * mobile the card is a static bar below the map (not overlaid), so we fall
 * back to symmetric padding under 768px.
 */
function fitPadding() {
  const base = 40;
  const overlaid = !window.matchMedia("(max-width: 768px)").matches;
  const card = state.root && state.root.querySelector(".directions__card");
  if (!overlaid || !card) return { padding: [base, base] };
  const w = Math.min(card.offsetWidth || 320, 420);
  // [x, y]: extra left padding = card width + gap; extra bottom for the card height.
  return {
    paddingTopLeft: [w + 28, base],
    paddingBottomRight: [base, base],
  };
}

// ---------------------------------------------------------------------------
// Map construction (deferred until first reveal)
// ---------------------------------------------------------------------------

function buildMap() {
  if (state.built) return;
  const L = window.L;
  if (!L || !state.mapEl) return;

  state.map = L.map(state.mapEl, {
    zoomControl: true,
    scrollWheelZoom: false,   // never trap page scroll inside .reveal-pair
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    boxZoom: false,
    keyboard: true,
    attributionControl: true,
  });

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTR,
    subdomains: "abcd",
    maxZoom: 19,
    detectRetina: true,
  }).addTo(state.map);

  // (Per-route place labels are rendered by renderRouteLabels() on each
  // origin selection — see selectOrigin().)

  // Venue pin + "גאמוס" label.
  L.marker(VENUE, {
    icon: L.divIcon({
      className: "directions__pin-wrap",
      html: PIN_SVG + '<b class="directions__pin-name" aria-hidden="true">גאמוס</b>',
      iconSize: [32, 44],
      iconAnchor: [16, 44],
    }),
    keyboard: false,
    interactive: false,
  }).addTo(state.map);

  state.built = true;

  // First paint: fit the default origin (no fly on first reveal).
  selectOrigin(state.active, { fly: false });
  // Leaflet measured the container while it may still have been laid out
  // under #contact — nudge a size recalc on the next frame.
  requestAnimationFrame(() => state.map && state.map.invalidateSize());

  // Keep size correct on container resize (responsive stage height).
  if (typeof ResizeObserver === "function") {
    state.resizeObs = new ResizeObserver(() => {
      if (state.map) state.map.invalidateSize();
    });
    state.resizeObs.observe(state.mapEl);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;

  const root = document.querySelector("[data-directions]");
  const mapEl = document.getElementById("directions-map");
  if (!root || !mapEl) return;             // section not on this page

  state.initialised = true;
  state.root = root;
  state.mapEl = mapEl;

  state.mqlMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  state.reducedMotion = state.mqlMotion.matches;

  // Wire tabs (works even before the map builds — selectOrigin guards on map).
  state.inputs = Array.from(
    root.querySelectorAll('input[name="directions-origin"]')
  );
  const checked = state.inputs.find((i) => i.checked);
  state.active = checked ? checked.value : "jerusalem";

  state.onInput = (e) => {
    const val = e.target && e.target.value;
    if (val) selectOrigin(val, { fly: true });
  };
  for (const input of state.inputs) {
    input.addEventListener("change", state.onInput);
  }
  syncTabAria();
  setCardAndCtas(state.active);

  // Free-text address search (geocode + route/ETA). Lives alongside the tabs;
  // submitting restores onInput → selectOrigin for any tab clicked afterward.
  state.searchForm = root.querySelector("[data-directions-search]");
  if (state.searchForm) {
    state.onSubmit = onSearchSubmit;
    state.searchForm.addEventListener("submit", state.onSubmit);
  }

  // If window.L isn't present (vendor script failed), leave the noscript-style
  // fallback content: tabs still re-point CTAs, just no map. Never throw.
  if (typeof window.L === "undefined") return;

  // Defer Leaflet construction until the section first scrolls into view —
  // it's hidden under #contact (.reveal-pair) at load, so a 0×0 measure
  // would paint grey gaps.
  if (typeof IntersectionObserver === "function") {
    state.io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            buildMap();
            state.io.disconnect();
            state.io = null;
            break;
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    state.io.observe(root);
  } else {
    buildMap();
  }
}

export function destroy() {
  if (state.onInput) {
    for (const input of state.inputs) {
      input.removeEventListener("change", state.onInput);
    }
  }
  if (state.searchForm && state.onSubmit) {
    state.searchForm.removeEventListener("submit", state.onSubmit);
  }
  state.searchForm = null;
  state.onSubmit = null;
  if (state.io) { state.io.disconnect(); state.io = null; }
  if (state.resizeObs) { state.resizeObs.disconnect(); state.resizeObs = null; }
  if (state.routeLayer) { state.routeLayer.remove(); state.routeLayer = null; }
  if (state.labelLayer) { state.labelLayer.remove(); state.labelLayer = null; }
  if (state.searchMarker) { state.searchMarker.remove(); state.searchMarker = null; }
  if (state.map) { state.map.remove(); state.map = null; }
  state.inputs = [];
  state.onInput = null;
  state.built = false;
  state.initialised = false;
}

export default { init, destroy };
