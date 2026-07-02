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
export type Lang = "he" | "en" | "fr";

function detect(): Lang {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "he" || s === "en" || s === "fr") return s;
  } catch { /* ignore */ }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Jerusalem" || tz === "Asia/Tel_Aviv") return "he";
  } catch { /* ignore */ }
  try {
    const list = (navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ""]).map((s) => String(s).toLowerCase());
    const is = (l: string, code: string) => l === code || l.startsWith(code + "-");
    // SAME order as js/i18n.js: Hebrew anywhere → he; then en/fr by preference
    // order (so an auto-detected French visitor gets French chrome, not English).
    if (list.some((l) => is(l, "he") || is(l, "iw"))) return "he";
    for (const l of list) {
      if (is(l, "en")) return "en";
      if (is(l, "fr")) return "fr";
    }
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
  "גללו לצפייה בתמונות": "Scroll to explore the gallery",
  "עבור ל": "Go to ",

  // ── Locations ──
  "גן האירועים": "The Events Garden",
  "המתחם": "The Estate",
  "המדבר": "The Desert",
  "מתחם הבריכה": "The Poolside",
  "הריזורט": "The Resort",

  // ── Events hall — image titles (17) ──
  "שדרת הקשתות": "The Avenue of Arches",
  "מנהרת הזהב": "The Golden Tunnel",
  "פינת הישיבה": "The Lounge Corner",
  "גינת הישיבה": "The Garden Lounge",
  "מושבי הלאונג'": "The Lounge Seating",
  "פינת GAMOS": "The GAMOS Corner",
  "בר המשקאות": "The Bar",
  "אזור הבר": "The Bar Lounge",
  "רחבת הבר": "The Bar Deck",
  "פינת ישיבה בגן": "The Garden Nook",
  "חופה בגן": "The Garden Chuppah",
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

const FR: Record<string, string> = {
  // ── Hall labels + field keys ──
  "אולם": "Salle",
  "ריזורט": "Resort",
  "מיקום": "Emplacement",
  "שנה": "Année",

  // ── Chrome UI ──
  "דלג לגלריה": "Aller à la galerie",
  "חזרה לבחירת אולם באתר Gamos": "Retour au choix de la salle sur le site GAMOS",
  "חזרה לאתר": "Retour au site",
  "לאתר": "Site",
  "מעבר אולם": "Changer de salle",
  "גללו לצפייה בתמונות": "Faites défiler pour explorer la galerie",
  "עבור ל": "Aller à ",

  // ── Locations ──
  "גן האירועים": "Le Jardin des Événements",
  "המתחם": "Le Domaine",
  "המדבר": "Le Désert",
  "מתחם הבריכה": "L'Espace Piscine",
  "הריזורט": "Le Resort",

  // ── Events hall — image titles (17) ──
  "שדרת הקשתות": "L'Allée des Arches",
  "מנהרת הזהב": "Le Tunnel Doré",
  "פינת הישיבה": "Le Coin Salon",
  "גינת הישיבה": "Le Salon du Jardin",
  "מושבי הלאונג'": "Les Assises du Lounge",
  "פינת GAMOS": "Le Coin GAMOS",
  "בר המשקאות": "Le Bar",
  "אזור הבר": "L'Espace Bar",
  "רחבת הבר": "La Terrasse du Bar",
  "פינת ישיבה בגן": "Le Coin Salon du Jardin",
  "חופה בגן": "La Houppa au Jardin",
  "עיצוב הקריסטל הכחול": "La Décoration en Cristal Bleu",
  "עיצוב הנרות הצפים": "La Décoration aux Bougies Flottantes",
  "עיצוב מינימלי עם ניאון": "Décoration Minimaliste au Néon",
  "עיצוב נברשת הקריסטל": "La Décoration au Lustre de Cristal",
  "עיצוב הנברשות והאגרטלים": "Décoration Lustres et Vases",
  "עיצוב בלאש וסאטן": "Décoration Blush et Satin",

  // ── Resort hall — image titles (12 unique; resort-12/13/14 share one) ──
  "הנוף מול החופה": "La Vue Face à la Houppa",
  "בריכת האינסוף": "La Piscine à Débordement",
  "מרפסת הבריכה": "La Terrasse de la Piscine",
  "מיטות במים": "Les Lits dans l'Eau",
  "חופת הבריכה": "La Houppa au Bord de la Piscine",
  "מתחם הטקס": "Le Site de la Cérémonie",
  "חופת הפרחים": "La Houppa Fleurie",
  "מתחם האירוע": "Le Site de l'Événement",
  "אזור הישיבה": "L'Espace Salon",
  "שולחנות הסעודה": "Les Tables du Dîner",
  "עיצוב הזכוכית והעץ": "La Décoration Verre et Bois",
  "עיצוב הזכוכית והעץ — מזווית אחרת": "La Décoration Verre et Bois — Sous un Autre Angle",
};

const DICTS: Record<Exclude<Lang, "he">, Record<string, string>> = { en: EN, fr: FR };

/** Translate a Hebrew string to the active language (identity in Hebrew). */
export function t(he: string): string {
  if (!he) return he;
  return lang === "he" ? he : (DICTS[lang]?.[he] ?? he);
}
