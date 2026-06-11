/**
 * roomsData.ts — the card set for the phantom-style wall.
 *
 * The venue currently has only 4 REAL room types (flagged `isReal: true` with a
 * `type`); the rest are tasteful §5-palette PLACEHOLDERS that fill out the wall
 * so the phantom density reads. Every card points at a generated placeholder
 * tile under `public/images/` (made by scripts/make-placeholders.mjs).
 *
 * TO SWAP IN REAL PHOTOS LATER: encode the real room photos and change only the
 * `image` path of each card here (and optionally flip more cards to isReal /
 * give them a real `titleHe` + `type`). Nothing else in the wall needs to know —
 * the texture pipeline + layout are identical for placeholders and real photos.
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
  year: string; // for the year scale
  image: string; // "images/NN.webp" — placeholder now, real photo later
  tone: Tone; // tile tint
}

const TONES: Tone[] = ["brass", "cocoa", "ivory", "mist", "rose"];

// The 4 REAL room types (names drawn from the live #rooms section). These get a
// brass-bordered "highlighted" placeholder + isReal flag.
const REAL: Array<Pick<RoomCard, "titleHe" | "type" | "tag">> = [
  { titleHe: "סוויטת הנוף", type: "נוף", tag: "סוויטה" },
  { titleHe: "סוויטת הכלה", type: "סוויטה", tag: "סוויטה" },
  { titleHe: "חדר דה-לוקס", type: "חדר", tag: "חדר" },
  { titleHe: "סוויטת הספא", type: "ספא", tag: "ספא" },
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

const TOTAL = 20;

function buildRooms(): RoomCard[] {
  const cards: RoomCard[] = [];
  // Interleave the 4 real cards across the wall (positions 0, 5, 10, 15) so the
  // highlighted types are spread out, not clustered.
  const realSlots = new Map<number, (typeof REAL)[number]>();
  REAL.forEach((r, i) => realSlots.set(i * 5, r));

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
      });
    }
  }
  return cards;
}

const roomsData: RoomCard[] = buildRooms();

export function getRooms(): RoomCard[] {
  return roomsData;
}
