/**
 * roomsData.ts — the card set for the phantom-style infinite-pan lens gallery.
 *
 * 2026-06-15: ROW-PER-CATEGORY layout. The venue has four room types —
 * חדר זוגי / חדר משפחה / סוויטה / חדר נוף — plus a wet&dry sauna wing
 * (סאונה רטובה ויבשה). The wall is a 5-row × COLS_PER_ROW grid: ONE ROW PER
 * CATEGORY, balanced (every row has COLS_PER_ROW cards). Real photos fill each
 * row first; the remainder are brand PLACEHOLDERS (isReal:false) until more
 * photos arrive (right now the sauna and several rows are short).
 *
 * The Wall reads catRows = CATEGORIES.length and catCols = COLS_PER_ROW, and
 * maps catalogue cell (row,col) → cards[row*COLS_PER_ROW + col] 1:1 (the array
 * length is exactly rows×cols). So array order IS the grid: row r = category r.
 *
 * Real photos map to encoded rooms/public/images/NN.webp (assets/_src/rooms
 * staging, grouped order). Placeholders point at images/ph-CC-K.webp tiles made
 * by scripts/make-placeholders.mjs (brand §5 tiles, per category tone).
 */

/** The five room categories — one PER ROW; double as the prominent heading. */
export type RoomCategory =
  | "חדר זוגי"
  | "חדר משפחה"
  | "סוויטה"
  | "חדר נוף"
  | "סאונה רטובה ויבשה";

/** §5 palette tones used to tint the chip accents / placeholder tiles. */
export type Tone = "brass" | "cocoa" | "ivory" | "mist" | "rose";

export interface RoomCard {
  id: string;
  number: string; // "01".."NN" zero-padded (display order)
  category: RoomCategory; // MAIN heading (room type) — one per grid row
  titleHe: string; // specific card title (Hebrew)
  type: RoomCategory; // alias of category (kept for the chrome's optional line)
  isReal: boolean; // true → real photo; false → brand placeholder tile
  label: string; // floating-label text (Hebrew) = category
  tag: string; // short category chip text
  year: string; // for the year scale + detail page
  image: string; // "images/NN.webp" (real) | "images/ph-…​.webp" (placeholder)
  tone: Tone; // tile tint
  body: string; // Hebrew detail-page copy (2–3 sentences)
}

/** Cards per row — the grid is CATEGORIES.length rows × COLS_PER_ROW cols. */
export const COLS_PER_ROW = 4;

/** Row order = category order on the wall (top→bottom). */
export const CATEGORIES: RoomCategory[] = [
  "חדר זוגי",
  "חדר משפחה",
  "סוויטה",
  "חדר נוף",
  "סאונה רטובה ויבשה",
];

// Per-category tile tint (§5) — one tone per row so each category reads as a
// colour family, and placeholder tiles in that row match.
const CATEGORY_TONE: Record<RoomCategory, Tone> = {
  "חדר זוגי": "cocoa",
  "חדר משפחה": "brass",
  "סוויטה": "rose",
  "חדר נוף": "mist",
  "סאונה רטובה ויבשה": "ivory",
};

// Short chip label per category.
const CATEGORY_TAG: Record<RoomCategory, string> = {
  "חדר זוגי": "זוגי",
  "חדר משפחה": "משפחה",
  "סוויטה": "סוויטה",
  "חדר נוף": "נוף",
  "סאונה רטובה ויבשה": "סאונה",
};

// Placeholder body copy per category (until real photos land).
const PLACEHOLDER_BODY: Record<RoomCategory, string> = {
  "חדר זוגי": "תצלום נוסף של חדר זוגי יתווסף בקרוב — מרחב מנוחה חם בגווני המתחם.",
  "חדר משפחה": "תצלום נוסף של חדר המשפחה יתווסף בקרוב — מרחב מרווח לכל המוזמנים.",
  "סוויטה": "תצלום נוסף של הסוויטה יתווסף בקרוב — מרחב יוקרתי ומעוצב לאורחי הכבוד.",
  "חדר נוף": "תצלום נוסף של חדר הנוף יתווסף בקרוב — מרחב הפתוח אל נוף המדבר.",
  "סאונה רטובה ויבשה": "תצלום נוסף של הסאונה הרטובה והיבשה יתווסף בקרוב — פינת רוגע והתחדשות.",
};

/** A REAL card slot: its encoded photo number + specific title/body. */
interface RealSlot {
  imageNo: string; // "01".."NN" → images/NN.webp (assets/_src/rooms order)
  titleHe: string;
  body: string;
}

// Real photos available per category (in grouped staging order). Each category
// row is then padded with placeholders up to COLS_PER_ROW.
const REAL_BY_CATEGORY: Record<RoomCategory, RealSlot[]> = {
  "חדר זוגי": [
    {
      imageNo: "01", // 1-27 — clean bed, rolled towels, warm pendants
      titleHe: "חדר זוגי קלאסי",
      body: "חדר זוגי חם ומוקפד לאורחים שנשארים ללון — מיטה רחבה, מצעים פריכים ותאורה רכה בגווני הפליז של המתחם. מנוחה שלווה במרחק צעדים מן האירוע.",
    },
    {
      imageNo: "02", // 1-34 — wood-wardrobe wall, calmer palette
      titleHe: "חדר זוגי עם ארון עץ",
      body: "חדר זוגי בגוון שמנת ועץ, עם קיר ארון מלא ופינת לילה מוארת. מרחב נקי ושקט שמזמין להתארגן בנחת ולנוח לפני הערב הגדול.",
    },
  ],
  "חדר משפחה": [
    {
      imageNo: "03", // 1-22 — living suite, curved sofa + blue chairs + bar cart
      titleHe: "חדר משפחה מרווח",
      body: "מרחב אירוח רחב עם פינת ישיבה רכה — ספה מעוגלת, כורסאות קטיפה ועגלת כיבוד — שמזמין את המשפחה כולה להתכנס יחד בין רגעי האירוע ולחגוג בנוחות.",
    },
  ],
  "סוויטה": [
    {
      imageNo: "04", // 1-37 — vaulted suite, blue poufs + champagne
      titleHe: "סוויטת הכלה",
      body: "המרחב הפרטי של הכלה ביום החתונה — סוויטה מעוצבת תחת תקרה משופעת, עם פינת ישיבה רכה, עגלת שמפניה ופרטיות מלאה. נקודת המוצא השלווה אל הערב הגדול.",
    },
  ],
  "חדר נוף": [
    {
      imageNo: "05", // 1-108 — desert-view suite, floor-to-ceiling window
      titleHe: "חדר נוף אל המדבר",
      body: "חדר שכל כולו ממוסגר בחלון רצפה-תקרה אל מרחבי המדבר של מישור אדומים. האור הרך של בין-הערביים נכנס פנימה, וכל הריהוט מכוון אל קו האופק הרחוק.",
    },
  ],
  "סאונה רטובה ויבשה": [
    {
      imageNo: "06", // 1-41 — wet room, rain shower + bench, warm wood
      titleHe: "מקלחת הגשם",
      body: "פינת רחצה רטובה בחיפוי עץ חם, עם מקלחת גשם רחבה וספסל אבן. מרחב להאט בו את הקצב ולהתרענן לפני הערב או למחרת בבוקר.",
    },
    {
      imageNo: "07", // 1-53 — hammam mosaic niche, back-lit arch, stone basin
      titleHe: "מתחם החמאם",
      body: "גומחת חמאם מרוצפת פסיפס עם קשת מוארת וקערת אבן — פינה של רוגע אינטימי בלב מתחם הסאונה הרטובה והיבשה.",
    },
  ],
};

// Build the balanced grid: row r = CATEGORIES[r], each row padded to
// COLS_PER_ROW. Array index = r*COLS_PER_ROW + c → the Wall's catalogue cell.
function buildRooms(): RoomCard[] {
  const cards: RoomCard[] = [];
  CATEGORIES.forEach((category, r) => {
    const reals = REAL_BY_CATEGORY[category] ?? [];
    for (let c = 0; c < COLS_PER_ROW; c++) {
      const idx = r * COLS_PER_ROW + c;
      const number = String(idx + 1).padStart(2, "0");
      const real = reals[c];
      if (real) {
        cards.push({
          id: `room-${number}`,
          number,
          category,
          titleHe: real.titleHe,
          type: category,
          isReal: true,
          label: category,
          tag: CATEGORY_TAG[category],
          year: "2026",
          image: `images/${real.imageNo}.webp`,
          tone: CATEGORY_TONE[category],
          body: real.body,
        });
      } else {
        // Placeholder tile for this category (brand §5 tile, per-category tone).
        const phK = c - reals.length + 1; // 1-based placeholder index within row
        cards.push({
          id: `room-${number}`,
          number,
          category,
          titleHe: "בקרוב",
          type: category,
          isReal: false,
          label: category,
          tag: CATEGORY_TAG[category],
          year: "2026",
          image: `images/ph-${r + 1}-${phK}.webp`,
          tone: CATEGORY_TONE[category],
          body: PLACEHOLDER_BODY[category],
        });
      }
    }
  });
  return cards;
}

const roomsData: RoomCard[] = buildRooms();

export function getRooms(): RoomCard[] {
  return roomsData;
}
