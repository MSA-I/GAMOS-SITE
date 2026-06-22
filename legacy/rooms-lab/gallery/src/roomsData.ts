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
    { imageNo: "01", titleHe: "פינת רוך בגווני ענן", body: "כורסאות קטיפה רכות בגוון תכלת־ענן ניצבות מול וילון פשתן עוטף. כאן מתיישבים לרגע של שקט — לנשום, להאט, ולספוג את האווירה לפני שיורדים אל החגיגה." },
    { imageNo: "02", titleHe: "החדר הזוגי הקלאסי", body: "מיטה זוגית רחבה במצעים לבנים פריכים, תאורת קריאה רכה משני צדדים וקיר אמנות שמחמם את החלל. מרחב מנוחה שמחכה לכם בסוף הערב — שלם, שקט, ושלכם בלבד." },
    { imageNo: "03", titleHe: "מבט אל המרחב הזוגי", body: "החדר הזוגי במלואו — מיטה מוצעת, פינת ישיבה ומראה גבוהה שמכפילה את האור. כל פינה תוכננה כדי שתרגישו בבית מהרגע שתפתחו את הדלת." },
    { imageNo: "04", titleHe: "מוכן עד הפרט האחרון", body: "שתי מגבות מגולגלות בקפידה על מצעים פריכים — סימן קטן לכך שמישהו חשב על הכול. נכנסים לחדר שכבר מחכה לכם, בלי דבר שצריך לסדר." },
    { imageNo: "05", titleHe: "קבלת פנים של פליז", body: "מתלה פליז מבריק מקבל אתכם כבר בכניסה, על רקע גווני המתחם החמים. נגיעה קטנה של יוקרה שמלווה אתכם מהצעד הראשון פנימה." },
  ],
  "חדר משפחה": [
    { imageNo: "06", titleHe: "פינת ההתכנסות המשפחתית", body: "ספה מעוקלת בגוון חול, פוּף בוקלה רך וקיר עץ מסורג שמרכך את האור. מרחב מזמין שבו המשפחה נאספת יחד בין רגע לרגע של היום הגדול." },
    { imageNo: "07", titleHe: "חדר המשפחה המלא", body: "מיטה רחבה, פינת ישיבה וכורסה ירוקה רכה — חדר שנותן מקום לכולם. שקט ונוחות במרחק צעדים מן האולם, לכל מי שיקר לכם." },
    { imageNo: "08", titleHe: "אור רך לצד המיטה", body: "מנורת לילה חמה, עציץ קטן וראש מיטה מרופד שמזמין להישען לאחור. הפרטים השקטים שהופכים חדר אירוח לפינה אישית." },
    { imageNo: "09", titleHe: "חדר רחצה שמרגיש כמו ספא", body: "כיור עץ צף, מראה עגולה עטופת אור ומקלחון זכוכית פתוח. רגע של רעננות פרטית לפני שמתלבשים לכבוד הערב." },
    { imageNo: "10", titleHe: "מגע הקטיפה", body: "תקריב של בד הקטיפה הרך שמרפד את פינת הישיבה — חומרים שנבחרו כדי שיורגשו יוקרתיים, לא רק ייראו. בגאמוס כל פרט נברר גם במגע." },
  ],
  "סוויטה": [
    { imageNo: "11", titleHe: "סוויטת הכלה", body: "המרחב הפרטי של הכלה ביום שלה — מיטה מוצעת, פינת ישיבה רכה ועגלת כיבוד ערוכה ומחכה. כאן מתארגנים בנחת, בשקט מוחלט, ברגעים שלפני החופה." },
    { imageNo: "12", titleHe: "סלון הסוויטה", body: "ספה חומה מעוקלת, בקבוק מצונן בדלי כסף ועגלת בר ערוכה במלואה. אזור מגורים פרטי שבו אוספים אוויר, מרימים כוסית, ונהנים מכל רגע." },
    { imageNo: "13", titleHe: "חדר הרחצה של הסוויטה", body: "אבן רכה בגוון אפור, ברז נחושת חם ואמבט לצד מקלחון פתוח. מרחב פינוק שלם שהופך את ההתארגנות לחוויה בפני עצמה." },
    { imageNo: "14", titleHe: "הסוויטה במבט מלא", body: "תקרה גבוהה, ספה מעוקלת, מיטה מוצעת וכורסת ענן — כל מה שצריך כדי לשהות בנחת לאורך כל היום. הסוויטה המרווחת ביותר במתחם, שמורה לאורחי הכבוד." },
    { imageNo: "15", titleHe: "רגע השמפניה", body: "ספה חומה רכה ובקבוק מצונן שמחכה על השולחן — הזמנה להאט, להרים כוסית ולחגוג בשקט. הפינה שבה הרגע הגדול מתחיל עוד לפני הכניסה לאולם." },
  ],
  "חדר נוף": [
    { imageNo: "16", titleHe: "שתי כורסאות אל המדבר", body: "כורסאות קלועות רכות ניצבות מול חלון פינתי שממסגר את גבעות המדבר. מקום לשבת בו בזוג, בכוס קפה, ולתת למבט לנדוד אל קו האופק." },
    { imageNo: "17", titleHe: "חדר שינה אל הנוף", body: "מיטה רכה, אמנות גלים מופשטת והשתקפות אור שמרחיבה את החלל. חדר בהיר ושקט שכל כולו מזמין מנוחה מול הנוף הפתוח." },
    { imageNo: "18", titleHe: "מקלחת עם נוף מדבר", body: "מקלחון אבן עם חלון שנפתח אל מרחבי המדבר, ברז נחושת חם ואמבט שקוע לצדו. להתרענן מול קו האופק — חוויה שנשארת איתכם." },
    { imageNo: "19", titleHe: "המדבר במלוא הרוחב", body: "חלונות מרצפה עד תקרה פותחים את החדר אל גבעות המדבר, עד קצה האופק. מתעוררים אל אור הבוקר על המדבר — הנוף שהופך את השהות לבלתי־נשכחת." },
    { imageNo: "20", titleHe: "דמדומים על המדבר", body: "חלון ענק שממסגר את המדבר באור הרך של בין הערביים, ופוּף בוקלה רך להישען עליו. הרגע השקט של סוף היום, רק אתם והנוף." },
  ],
  "סאונה רטובה ויבשה": [
    { imageNo: "21", titleHe: "מתחם הסאונות", body: "סאונה יבשה מעץ ארז וסאונה רטובה זו לצד זו, מסומנות ומוכנות. פינה להאט בה את הקצב — להתרענן לפני הערב, או לפתוח בה את הבוקר שאחרי." },
    { imageNo: "22", titleHe: "הסאונה היבשה", body: "ספסלי עץ ארז בהיר, תנור אבנים לוהט וחום יבש ועוטף. רגע של רוגע מוחלט שמרפה את הגוף בין רגעי החגיגה." },
    { imageNo: "23", titleHe: "חדר האדים", body: "חלל מקומר מחופה פסיפס כהה, אדים חמים ותאורה דרמטית רכה. מרחב כמו חמאם מזרחי, שבו הזמן נעצר לכמה נשימות עמוקות." },
    { imageNo: "24", titleHe: "מקלחת הגשם", body: "קיר אבן טבעי וראש מקלחת נחושת רחב שמוריד גשם חמים. פרט קטן של פינוק שמשלים את חוויית ההתחדשות במתחם." },
    { imageNo: "25", titleHe: "גומחת החמאם", body: "גומחה מקומרת מחופה פסיפס נוצץ, מוארת באור רך, עם ספל אבן מסורתי. הפינה השלווה והמעוצבת ביותר במתחם ההתחדשות." },
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
