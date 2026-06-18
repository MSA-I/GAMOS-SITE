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

/** Cards per row — the grid is CATEGORIES.length rows × COLS_PER_ROW cols.
 *  2026-06-16: widened 4→5 so the suite row (5 real photos) fills without
 *  dropping any; shorter rows pad with placeholders. Keep in sync with
 *  rooms/scripts/make-placeholders.mjs (COLS_PER_ROW + per-row real counts). */
export const COLS_PER_ROW = 5;

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
// 2026-06-17: re-curated from the full "חדרים" source pool (user: add/update,
// don't delete). Per-category counts kept ≥ prior (זוגי 2→3) so no room type
// lost coverage; rotated/weak/duplicate frames dropped. imageNo → encoded
// rooms/public/images/NN.webp (assets/_src/rooms grouped staging order).
const REAL_BY_CATEGORY: Record<RoomCategory, RealSlot[]> = {
  "חדר זוגי": [
    {
      imageNo: "01", // wide: bed + coat-stand + bar stools + blue armchair
      titleHe: "חדר זוגי מרווח",
      body: "חדר זוגי רחב ומואר עם מיטה זוגית, פינת ישיבה וכורסה רכה. מרחב מנוחה חם לאורחים שנשארים ללון, במרחק צעדים מן האירוע.",
    },
    {
      imageNo: "02", // front-on bed, wood wardrobe, orange nightstands
      titleHe: "חדר זוגי קלאסי",
      body: "חדר זוגי מוקפד עם מיטה רחבה, ארון עץ ושידות בגוון חם לצד קיר אמנות. מצעים פריכים ותאורה רכה למנוחה שלווה לפני הערב הגדול ואחריו.",
    },
    {
      imageNo: "03", // detail: pale-blue tie-dye poufs / sitting corner
      titleHe: "פינת הישיבה בחדר הזוגי",
      body: "פינת ישיבה רכה בגוונים תכולים בלב החדר הזוגי, מקום שקט להתארגן בו בנחת ולשבת לרגע לפני שיורדים אל האירוע.",
    },
  ],
  "חדר משפחה": [
    {
      imageNo: "04", // wide: bed + TV console + green armchairs + seating
      titleHe: "חדר משפחה עם אזור מנוחה",
      body: "מרחב אירוח רחב עם מיטה, פינת מסך וכורסאות בגוון ירוק — חדר שמזמין את המשפחה כולה להתכנס יחד בין רגעי האירוע ולנוח בנוחות.",
    },
    {
      imageNo: "05", // beige lounge: curved sofa, bouclé chair, lattice
      titleHe: "סלון המשפחה",
      body: "סלון רך בגווני שמנת עם ספה מעוגלת, כורסת בוקלה ומחיצת עץ מסורגת. פינת התכנסות אינטימית ומוארת לקרובים.",
    },
    {
      imageNo: "06", // green leather armchair detail
      titleHe: "פינת המנוחה הירוקה",
      body: "פינת מנוחה ירוקה ורכה בחדר המשפחה, מקום שקט להירגע בו לרגע הרחק משאון הערב.",
    },
  ],
  "סוויטה": [
    {
      imageNo: "07", // full suite: bed + lounge chairs + bar cart + drapes
      titleHe: "סוויטת היוקרה",
      body: "המרחב הפרטי של הכלה ביום החתונה — סוויטה מרווחת עם מיטה, פינת ישיבה, עגלת כיבוד ווילונות גבוהים. נקודת המוצא השלווה אל הערב הגדול.",
    },
    {
      imageNo: "08", // wide living area: curved sofa + blue chairs + bar cart
      titleHe: "סלון הסוויטה",
      body: "אזור מגורים רחב בסוויטה עם ספה מעוגלת חומה, כורסאות תכולות ועגלת כיבוד, באור חם ועוטף לכל אורך השהות.",
    },
    {
      imageNo: "09", // lounge corner with TV, sofa, bar cart
      titleHe: "אזור הישיבה בסוויטה",
      body: "פינת ישיבה אינטימית בסוויטה, מרחב פרטי להירגע בו ולספוג את אווירת היום הגדול בנחת.",
    },
    {
      imageNo: "10", // stone bathroom: backlit mirror, copper tap, tub + shower
      titleHe: "חדר הרחצה של הסוויטה",
      body: "חדר רחצה מאבן עם מראה מוארת, ברז נחושת, אמבט ומקלחת הליכה. פינה מפנקת ושלווה להתרעננות לפני הערב.",
    },
    {
      imageNo: "11", // travertine bathroom: backlit mirror, floating vanity, WC
      titleHe: "חדר הרחצה הפרטי",
      body: "חדר רחצה בטרברטין חם עם מראה עגולה מוארת, ברז נחושת ושיש מרחף — מרחב נקי ומעוצב בלב הסוויטה.",
    },
  ],
  "חדר נוף": [
    {
      imageNo: "12", // two woven chairs at floor-to-ceiling desert window
      titleHe: "מרפסת הנוף אל המדבר",
      body: "שתי כורסאות קלועות מול חלון מקיר-לקיר הממסגר את מרחבי המדבר. פינת צפייה שקטה אל קו האופק הפתוח.",
    },
    {
      imageNo: "13", // two bucket chairs at corner window + lattice screen
      titleHe: "פינת נוף עם כורסאות",
      body: "שתי כורסאות מרופדות מול חלון פינתי אל גבעות המדבר ומחיצת סריג. חדר נקי ובהיר שכל כולו פונה אל הנוף.",
    },
    {
      imageNo: "14", // bed + wardrobe + desk + dusk window + pouf
      titleHe: "חדר נוף בשעת בין הערביים",
      body: "חדר נוף עם מיטה, פינת עבודה ופוף לצד חלון פינתי הנפתח אל המדבר באור הדמדומים הרך.",
    },
    {
      imageNo: "15", // stone bathroom, backlit mirror, shower window to desert
      titleHe: "חדר רחצה עם נוף",
      body: "חדר רחצה מאבן עם מראה מוארת ומקלחת הליכה שחלונה נפתח אל נוף המדבר — רגע של רוגע מול קו האופק.",
    },
  ],
  "סאונה רטובה ויבשה": [
    {
      imageNo: "16", // hero: dry cedar sauna + brass signage + wet entry
      titleHe: "מתחם הסאונות — יבשה ורטובה",
      body: "מתחם הסאונה המלא — סאונה יבשה בחיפוי עץ ארז לצד כניסה לסאונה הרטובה ושילוט פליז. מרחב להאט בו את הקצב ולהתרענן לפני הערב או למחרת בבוקר.",
    },
    {
      imageNo: "17", // arched mosaic wet sauna: backlit niche, stone basin
      titleHe: "הסאונה הרטובה",
      body: "סאונה רטובה מקושתת בחיפוי פסיפס, נישה מוארת וכיור אבן. הפינה האטמוספרית ביותר במתחם ההתחדשות.",
    },
    {
      imageNo: "18", // clean cedar dry sauna interior: tiered benches, heater
      titleHe: "הסאונה היבשה",
      body: "פנים הסאונה היבשה בחיפוי עץ ארז, ספסלים מדורגים ותנור אבנים. חום יבש ושקט להירגע בו בשלווה.",
    },
    {
      imageNo: "19", // dark mosaic wet-sauna tunnel, lit arch
      titleHe: "חלל הסאונה הרטובה",
      body: "מבט אל חלל הסאונה הרטובה הכהה עם קשת מוארת בקצה — פינה דרמטית ועוטפת של רוגע והתחדשות.",
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
