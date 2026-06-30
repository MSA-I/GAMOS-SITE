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
    { imageNo: "01", titleHe: "רגע של שלווה", body: "פינת ישיבה אינטימית בגוונים טבעיים, המזמינה לעצור לרגע, להתרווח ולהתמסר לשקט שלפני החגיגה." },
    { imageNo: "02", titleHe: "לינה ברמת פרימיום", body: "חדר זוגי מרווח המשלב קווים נקיים, חומרים איכותיים ותכנון מוקפד, לחוויית אירוח נעימה ומפנקת." },
    { imageNo: "03", titleHe: "להרגיש בבית, להתארח אחרת", body: "חלל מואר ומאוזן, המעניק תחושת נוחות ורוגע ומשלים חוויית שהות מוקפדת לאורך כל סוף השבוע." },
    { imageNo: "04", titleHe: "הפרטיות מתחילה כאן", body: "כניסה שקטה ומזמינה לחדר המעוצב בקווים נקיים, המעניקה תחושת פרטיות ונוחות כבר מהרגע הראשון." },
    { imageNo: "05", titleHe: "ברוכים הבאים לסוויטה", body: "חלל הכניסה מקבל את פניכם באווירה חמימה, עם תכנון מוקפד שמשרה תחושת סדר, נוחות ורוגע." },
  ],
  "חדר משפחה": [
    { imageNo: "06", titleHe: "מרחב למשפחה אחת", body: "סלון מרווח ופינת ישיבה נעימה יוצרים מקום טבעי להתכנסות, לשיחות ולרגעים המשותפים שהופכים את שהותכם למיוחדת." },
    { imageNo: "07", titleHe: "חדר המשפחה המלא", body: "חדר משפחתי רחב ידיים, המשלב אזורי שינה וישיבה בחלל אחד, כדי שכל בני המשפחה ייהנו מנוחות מרבית." },
    { imageNo: "08", titleHe: "אווירה שמתחילה בפרטים", body: "תאורה רכה, גוונים חמימים וחומרי גמר מוקפדים יוצרים חלל נעים, רגוע ומזמין כבר מהכניסה לחדר." },
    { imageNo: "09", titleHe: "עיצוב שפוגש פונקציונליות", body: "חדר רחצה מרווח, תאורה נעימה ואבזור איכותי, לחוויה נעימה." },
    { imageNo: "10", titleHe: "מגע הקטיפה", body: "כל חומר, מרקם וגוון נבחרו בקפידה, מתוך תפיסה שלפיה איכות אמיתית ניכרת גם בפרטים הקטנים ביותר." },
  ],
  "סוויטה": [
    { imageNo: "11", titleHe: "סוויטת הכלה", body: "הסוויטה משלבת חלל אירוח רחב, פינת ישיבה נינוחה ואזור שינה מרווח, ליצירת חוויה מפנקת ומלאת נוחות." },
    { imageNo: "12", titleHe: "סלון הסוויטה", body: "חלל האירוח המרכזי מעוצב בגוונים חמימים, ומזמין למנוחה, לשיחה טובה ולרגעים של ביחד." },
    { imageNo: "13", titleHe: "חדר הרחצה של הסוויטה", body: "עיצוב נקי, חומרים איכותיים ותאורה מדויקת יוצרים חלל מרווח ומוקפד, המשלים את חוויית שהותכם בסוויטה." },
    { imageNo: "14", titleHe: "הסוויטה במבט מלא", body: "חלל רחב, מואר ומאוזן המעניק שילוב מושלם בין נוחות, פרטיות ואלגנטיות." },
    { imageNo: "15", titleHe: "רגע השמפניה", body: "פינת ישיבה אינטימית המיועדת לשיחה טובה, כוס יין או רגע של מנוחה בין שלבי האירוע." },
  ],
  "חדר נוף": [
    { imageNo: "16", titleHe: "המדבר נכנס פנימה", body: "חלון רחב ממסגר את הנוף הפתוח והופך אותו לחלק בלתי נפרד מחוויית האירוח, גם מתוך החדר." },
    { imageNo: "17", titleHe: "להתעורר אל הנוף", body: "אור טבעי ומבט פתוח אל מרחבי המדבר יוצרים פתיחה מושלמת לבוקר." },
    { imageNo: "18", titleHe: "שגרת בוקר, בקצב אחר", body: "חדר רחצה מואר ומוקפד, שבו כל פרט תוכנן כדי לפתוח את היום בתחושת רוגע, נוחות ואיכות." },
    { imageNo: "19", titleHe: "מרחב שנפתח אל הנוף", body: "חלונות רחבי ממדים מכניסים את אור היום פנימה ומטשטשים את הגבול בין החדר למרחבים הפתוחים שמחוץ לו." },
    { imageNo: "20", titleHe: "כשהאור משנה את האווירה", body: "בשעות בין הערביים מתמלא החדר בגוונים טבעיים ורכים, היוצרים תחושה רגועה ונעימה." },
  ],
  "סאונה רטובה ויבשה": [
    { imageNo: "21", titleHe: "להתחדש. להירגע. להמשיך.", body: "מתחם הסאונות נועד להעניק רגע של שחרור, פאוזה והתחדשות, כחלק מחוויית האירוח והפינוק של גאמוס." },
    { imageNo: "22", titleHe: "החום שעושה את ההבדל", body: "סאונה יבשה בעיצוב עץ טבעי המאפשרת להאט את הקצב, להשתחרר מהעומס ולהעניק לגוף רגע של התאוששות." },
    { imageNo: "23", titleHe: "חום שמרגיע את הגוף", body: "חדר האדים עוטף את הגוף בחום עדין ובאדים נעימים, ומעניק רגע של שחרור, רוגע והתחדשות." },
    { imageNo: "24", titleHe: "להתחיל מחדש", body: "מקלחת הגשם משלימה את חוויית ה־Wellness עם זרם מים מרענן, המעניק תחושת רעננות והתחדשות." },
    { imageNo: "25", titleHe: "מסורת בעיצוב עכשווי", body: "בהשראת בתי החמאם הקלאסיים, בעיצוב אלגנטי המעניק פרשנות מודרנית לחוויית רוגע והתחדשות." },
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
