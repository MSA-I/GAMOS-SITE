/**
 * roomsData.ts — the card set for the phantom-style infinite-pan lens gallery.
 *
 * The venue currently has only 4 REAL room types (flagged `isReal: true` with a
 * `type`); the rest are tasteful §5-palette PLACEHOLDERS that fill out the wall
 * so the phantom density reads. Every card points at a generated placeholder
 * tile under `public/images/` (made by scripts/make-placeholders.mjs).
 *
 * TO SWAP IN REAL PHOTOS LATER: encode the real room photos and change only the
 * `image` path of each card here (and optionally flip more cards to isReal /
 * give them a real `titleHe` + `type` + `body`). Nothing else in the gallery
 * needs to know — the texture pipeline + lens layout are identical for
 * placeholders and real photos.
 *
 * NOTE on ordering: the wall maps the array index → a CAT_COLS×CAT_ROWS catalogue
 * grid in order. To keep the 4 real cards from clustering in one column, they are
 * SCATTERED across the array at indices 0, 6, 11, 17 (a coprime-ish spread over
 * 20) so they land in different catalogue cells.
 */

export type RoomType = "סוויטה" | "חדר" | "ספא" | "נוף";

/** §5 palette tones used to tint placeholder tiles + (later) the chip accents. */
export type Tone = "brass" | "cocoa" | "ivory" | "mist" | "rose";

export interface RoomCard {
  id: string;
  number: string; // "01".."NN" zero-padded
  titleHe: string; // card title (Hebrew)
  type: RoomType | null; // set for the 4 real room types; null for placeholders
  isReal: boolean; // true → highlighted real room type
  label: string; // floating-label text (Hebrew)
  tag: string; // category chip, e.g. "אירוח" / "ספא"
  year: string; // for the year scale + detail page
  image: string; // "images/NN.webp" — placeholder now, real photo later
  tone: Tone; // tile tint
  body: string; // Hebrew detail-page copy (2–3 sentences)
}

const TONES: Tone[] = ["brass", "cocoa", "ivory", "mist", "rose"];

// The 4 REAL room types (names drawn from the live #rooms section). These get a
// brass-bordered "highlighted" placeholder + isReal flag + real detail copy.
const REAL: Array<
  Pick<RoomCard, "titleHe" | "type" | "tag" | "body">
> = [
  {
    titleHe: "סוויטת הנוף",
    type: "נוף",
    tag: "סוויטה",
    body: "סוויטה מרווחת הפתוחה אל מרחבי המדבר של מישור אדומים. חלונות רצפה-תקרה מכניסים את האור הרך של בין-הערביים פנימה, וכל פרט עוצב כדי שתרגישו את השקט הגדול שמסביב.",
  },
  {
    titleHe: "סוויטת הכלה",
    type: "סוויטה",
    tag: "סוויטה",
    body: "המרחב הפרטי של הכלה ביום החתונה — סוויטה מעוצבת בקפידה עם פינת איפור מוארת, שטח לצוות ההכנות ופרטיות מלאה. נקודת המוצא השלווה אל הערב הגדול.",
  },
  {
    titleHe: "חדר דה-לוקס",
    type: "חדר",
    tag: "חדר",
    body: "חדר אירוח חם ומוקפד לאורחים שנשארים ללון. מצעים רכים, גימור עץ ופליז, ושקט מוחלט — מנוחה אמיתית במרחק צעדים מן האירוע.",
  },
  {
    titleHe: "סוויטת הספא",
    type: "ספא",
    tag: "ספא",
    body: "חוויית רוגע שלמה: חמאם, פינת טיפולים ואווירה אינטימית הספוגה בגווני הפליז של המתחם. מקום להאט בו את הקצב לפני הערב או למחרת בבוקר.",
  },
];

// Placeholder card titles — generic, venue-voiced, clearly stand-ins until the
// real photos + copy land.
const PLACEHOLDER_TITLES = [
  "מבט אל המדבר",
  "פינת בוקר",
  "מרפסת פרטית",
  "אור רך",
  "פינת ישיבה",
  "חדר רחצה",
  "מקלחת גשם",
  "נוף ההרים",
  "פינת קפה",
  "סוף יום",
  "שקט מדברי",
  "מרחב פתוח",
  "ערב על הטרסה",
  "חמאם",
  "בריכה פרטית",
  "פינת שינה",
];

// A venue-voiced generic body for placeholder cards (until real per-room copy).
const PLACEHOLDER_BODY =
  "פינה נוספת מעולמות האירוח של גאמוס — מרחב מעוצב בגווני הפליז, השמנת והקקאו של המתחם, מול נוף המדבר של מישור אדומים. התמונות הסופיות והתיאור המלא יתווספו בקרוב.";

const TOTAL = 20;

// Scatter the 4 real cards across the array so they don't cluster in one
// catalogue column when index → grid is mapped in order.
const REAL_SLOTS = [0, 6, 11, 17];

function buildRooms(): RoomCard[] {
  const cards: RoomCard[] = [];
  const realSlots = new Map<number, (typeof REAL)[number]>();
  REAL.forEach((r, i) => realSlots.set(REAL_SLOTS[i], r));

  let placeholderIdx = 0;
  for (let i = 0; i < TOTAL; i++) {
    const number = String(i + 1).padStart(2, "0");
    const image = `images/${number}.webp`;
    const tone = TONES[i % TONES.length];
    const real = realSlots.get(i);
    if (real) {
      cards.push({
        id: `room-${number}`,
        number,
        titleHe: real.titleHe,
        type: real.type,
        isReal: true,
        label: real.titleHe,
        tag: real.tag,
        year: "2026",
        image,
        tone: "brass",
        body: real.body,
      });
    } else {
      const titleHe =
        PLACEHOLDER_TITLES[placeholderIdx % PLACEHOLDER_TITLES.length];
      placeholderIdx++;
      cards.push({
        id: `room-${number}`,
        number,
        titleHe,
        type: null,
        isReal: false,
        label: titleHe,
        tag: "אירוח",
        year: "2026",
        image,
        tone,
        body: PLACEHOLDER_BODY,
      });
    }
  }
  return cards;
}

const roomsData: RoomCard[] = buildRooms();

export function getRooms(): RoomCard[] {
  return roomsData;
}
