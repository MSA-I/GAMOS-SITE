/**
 * roomsData.ts — the card set for the phantom-style infinite-pan lens gallery.
 *
 * 2026-06-18: ROW-PER-CATEGORY layout, now ALL REAL. The venue has four room
 * types — חדר זוגי / חדר משפחה / סוויטה / חדר נוף — plus a wet&dry sauna wing
 * (סאונה רטובה ויבשה). The wall is a 5-row × COLS_PER_ROW grid: ONE ROW PER
 * CATEGORY, balanced (every row has COLS_PER_ROW cards). Every row is filled
 * with 5 real photos (full 5×5 grid) — no placeholders. (The placeholder branch
 * in buildRooms + make-placeholders.mjs stay as a dormant fallback if a row
 * ever goes short again.)
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

// Real photos per category, in grouped staging order. 2026-06-18: full
// re-curation — the whole "חדרים" source folder now feeds the wall, EVERY
// category row filled to COLS_PER_ROW (5) so the 5×5 grid is all-real with NO
// placeholders (user decision). imageNo → encoded rooms/public/images/NN.webp,
// staged זוגי(01-05) → משפחה(06-10) → סוויטה(11-15) → נוף(16-20) → סאונה(21-25)
// by assets/_src/rooms numbering (scripts/encode-images.mjs FLAT_WEBP).
const REAL_BY_CATEGORY: Record<RoomCategory, RealSlot[]> = {
  "חדר זוגי": [
    { imageNo: "01", titleHe: "חדר זוגי מרווח", body: "חדר זוגי רחב ומואר עם מיטה זוגית ופינת ישיבה רכה. מרחב מנוחה חם לאורחים שנשארים ללון, במרחק צעדים מן האירוע." },
    { imageNo: "02", titleHe: "חדר זוגי קלאסי", body: "חדר זוגי מוקפד עם מיטה רחבה וקיר אמנות. מצעים פריכים ותאורה רכה למנוחה שלווה לפני הערב הגדול ואחריו." },
    { imageNo: "03", titleHe: "פינת הישיבה הזוגית", body: "פינת ישיבה רכה בלב החדר הזוגי, מקום שקט להתארגן בו בנחת לפני שיורדים אל החגיגה." },
    { imageNo: "04", titleHe: "מבט אל החדר הזוגי", body: "החדר הזוגי על כל פרטיו — עיצוב חם בגווני המתחם שמזמין מנוחה אחרי ערב ארוך." },
    { imageNo: "05", titleHe: "פרטי החדר הזוגי", body: "פרטי העיצוב של החדר הזוגי, מן הטקסטיל ועד התאורה — אירוח שמרגיש כמו בית." },
  ],
  "חדר משפחה": [
    { imageNo: "06", titleHe: "חדר משפחה עם אזור מנוחה", body: "מרחב אירוח רחב עם מיטה ופינת ישיבה — חדר שמזמין את המשפחה כולה להתכנס יחד בין רגעי האירוע." },
    { imageNo: "07", titleHe: "סלון המשפחה", body: "סלון רך עם ספה מעוגלת ומחיצת עץ מסורגת. פינת התכנסות אינטימית ומוארת לקרובים." },
    { imageNo: "08", titleHe: "מרחב המשפחה", body: "חדר משפחה מרווח שנותן מקום לכולם — נוחות ושקט במרחק צעדים מן החגיגה." },
    { imageNo: "09", titleHe: "פינת המנוחה", body: "פינת מנוחה רכה בחדר המשפחה, מקום להירגע בו לרגע הרחק משאון הערב." },
    { imageNo: "10", titleHe: "פרטי חדר המשפחה", body: "פרטי האירוח בחדר המשפחה — עיצוב חם בגווני הפליז של המתחם." },
  ],
  "סוויטה": [
    { imageNo: "11", titleHe: "סוויטת היוקרה", body: "המרחב הפרטי של הכלה ביום החתונה — סוויטה מרווחת עם פינת ישיבה ווילונות גבוהים. נקודת המוצא השלווה אל הערב הגדול." },
    { imageNo: "12", titleHe: "סלון הסוויטה", body: "אזור מגורים רחב בסוויטה באור חם ועוטף, מרחב פרטי לכל אורך השהות." },
    { imageNo: "13", titleHe: "אזור הישיבה בסוויטה", body: "פינת ישיבה אינטימית בסוויטה, מרחב להירגע בו ולספוג את אווירת היום הגדול." },
    { imageNo: "14", titleHe: "מרחב הסוויטה", body: "הסוויטה על כל פרטיה — עיצוב יוקרתי ומוקפד לאורחי הכבוד של גאמוס." },
    { imageNo: "15", titleHe: "פינת הפינוק בסוויטה", body: "פינת פינוק שקטה בסוויטה, מקום להתארגן בו בנחת לפני הכניסה לחופה." },
  ],
  "חדר נוף": [
    { imageNo: "16", titleHe: "חדר הנוף אל המדבר", body: "חדר נוף שכל כולו פונה אל מרחבי המדבר — חלון גדול שממסגר את קו האופק." },
    { imageNo: "17", titleHe: "פינת נוף עם כורסאות", body: "כורסאות מול חלון פינתי אל גבעות המדבר. חדר בהיר ושקט שמזמין להתבונן." },
    { imageNo: "18", titleHe: "חדר נוף מרווח", body: "חדר נוף עם מיטה ופינת ישיבה לצד חלון הנפתח אל הנוף הפתוח." },
    { imageNo: "19", titleHe: "נוף בשעת הדמדומים", body: "חדר הנוף באור הרך של בין הערביים, כשהמדבר נצבע בגווני זהב." },
    { imageNo: "20", titleHe: "פרטי חדר הנוף", body: "פרטי העיצוב של חדר הנוף — קווים נקיים שמשאירים את הבמה לנוף עצמו." },
  ],
  "סאונה רטובה ויבשה": [
    { imageNo: "21", titleHe: "מתחם הסאונות", body: "מתחם הסאונה — יבשה ורטובה — מרחב להאט בו את הקצב ולהתרענן לפני הערב או למחרת בבוקר." },
    { imageNo: "22", titleHe: "הסאונה הרטובה", body: "סאונה רטובה אטמוספרית בחיפוי פסיפס — הפינה השלווה ביותר במתחם ההתחדשות." },
    { imageNo: "23", titleHe: "הסאונה היבשה", body: "סאונה יבשה בחיפוי עץ ארז וחום נעים — רגע של רוגע בין רגעי החגיגה." },
    { imageNo: "24", titleHe: "פינת ההתחדשות", body: "פינת הסאונה והרחצה — מרחב פינוק שמשלים את חוויית האירוח בגאמוס." },
    { imageNo: "25", titleHe: "חלל הסאונה", body: "מבט אל חלל הסאונה העוטף — אווירה דרמטית ושלווה של רוגע והתחדשות." },
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
