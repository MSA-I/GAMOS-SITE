/**
 * i18n.ts — Hebrew⇄English for the halls sub-app.
 *
 * The main site (js/i18n.js) stores the chosen language in the same-origin
 * localStorage key 'gamos-lang'. This sub-app is a separate bundle the main
 * site's DOM walk can't reach, so it resolves the language itself at startup —
 * reading that same key, with the SAME geo-detect fallback as js/i18n.js (so a
 * cold direct visit behaves identically). There is no in-app toggle; the sub-app
 * simply follows the site's choice.
 *
 * Translation mirrors the main site: a dictionary keyed by the exact Hebrew
 * string (EN[he] ?? he). Only the strings that actually RENDER are listed
 * (image titles + locations from projectsData, hall labels, field keys, chrome).
 * The big projectsData array is not touched.
 */

const STORAGE_KEY = "gamos-lang";
export type Lang = "he" | "en";

function detect(): Lang {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "he" || s === "en") return s;
  } catch { /* ignore */ }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Jerusalem" || tz === "Asia/Tel_Aviv") return "he";
  } catch { /* ignore */ }
  try {
    const langs = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    if (/(^|,)(he|iw)\b/.test(langs)) return "he";
  } catch { /* ignore */ }
  return "en";
}

/** Resolved once at module load — no in-app toggle, so it's constant per visit. */
export const lang: Lang = detect();

export function applyDocumentLang(l: Lang = lang): void {
  try {
    document.documentElement.lang = l;
    document.documentElement.dir = l === "he" ? "rtl" : "ltr";
  } catch { /* ignore */ }
}

const EN: Record<string, string> = {
  // ── Hall labels + field keys ──
  "אולם": "Hall",
  "ריזורט": "Resort",
  "מיקום": "Location",
  "שנה": "Year",

  // ── Chrome UI ──
  "דלג לגלריה": "Skip to gallery",
  "חזרה לבחירת אולם באתר Gamos": "Back to hall selection on the Gamos site",
  "חזרה לאתר": "Back to site",
  "לאתר": "Site",
  "מעבר אולם": "Switch hall",
  "גללו לצפייה בתמונות": "Scroll to view the images",
  "עבור ל": "Go to ",

  // ── Locations ──
  "גן האירועים": "The Events Garden",
  "המתחם": "The Estate",
  "המדבר": "The Desert",
  "מתחם הבריכה": "The Pool Area",
  "הריזורט": "The Resort",

  // ── Events hall — image titles (17) ──
  "שדרת הקשתות": "The Arches Avenue",
  "מנהרת הזהב": "The Golden Tunnel",
  "פינת הישיבה": "The Seating Corner",
  "גינת הישיבה": "The Garden Lounge",
  "מושבי הלאונג'": "The Lounge Seating",
  "פינת GAMOS": "The GAMOS Corner",
  "בר המשקאות": "The Bar",
  "אזור הבר": "The Bar Area",
  "רחבת הבר": "The Bar Deck",
  "פינת ישיבה בגן": "Garden Seating Corner",
  "חופה בגן": "Garden Chuppah",
  "עיצוב הקריסטל הכחול": "The Blue Crystal Setting",
  "עיצוב הנרות הצפים": "The Floating Candles Setting",
  "עיצוב מינימלי עם ניאון": "Minimalist Neon Setting",
  "עיצוב נברשת הקריסטל": "The Crystal Chandelier Setting",
  "עיצוב הנברשות והאגרטלים": "Chandeliers & Vases Setting",
  "עיצוב בלאש וסאטן": "Blush & Satin Setting",

  // ── Resort hall — image titles (12 unique; resort-12/13/14 share one) ──
  "הנוף מול החופה": "The View Facing the Chuppah",
  "בריכת האינסוף": "The Infinity Pool",
  "מרפסת הבריכה": "The Pool Deck",
  "מיטות במים": "Beds in the Water",
  "חופת הבריכה": "The Poolside Chuppah",
  "מתחם הטקס": "The Ceremony Grounds",
  "חופת הפרחים": "The Floral Chuppah",
  "מתחם האירוע": "The Event Grounds",
  "אזור הישיבה": "The Seating Area",
  "שולחנות הסעודה": "The Dining Tables",
  "עיצוב הזכוכית והעץ": "The Glass & Wood Setting",
  "עיצוב הזכוכית והעץ — מזווית אחרת": "The Glass & Wood Setting — Another Angle",
};

/** Translate a Hebrew string to the active language (identity in Hebrew). */
export function t(he: string): string {
  if (!he) return he;
  return lang === "en" ? (EN[he] ?? he) : he;
}
