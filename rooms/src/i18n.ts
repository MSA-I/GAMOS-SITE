/**
 * i18n.ts — Hebrew⇄English for the rooms sub-app.
 *
 * Same design as halls/src/i18n.ts: resolve the language from the same-origin
 * localStorage key 'gamos-lang' (set by the main site's js/i18n.js) with the
 * identical geo-detect fallback, then translate rendered strings through a
 * dictionary keyed by the exact Hebrew string (EN[he] ?? he). No in-app toggle;
 * the sub-app follows the site's choice. roomsData.ts is not touched.
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

/** Resolved once at module load — constant per visit (no in-app toggle). */
export const lang: Lang = detect();

export function applyDocumentLang(l: Lang = lang): void {
  try {
    document.documentElement.lang = l;
    document.documentElement.dir = l === "he" ? "rtl" : "ltr";
  } catch { /* ignore */ }
}

const EN: Record<string, string> = {
  // ── Categories (row headings) ──
  "חדר זוגי": "Couple's Room",
  "חדר משפחה": "Family Room",
  "סוויטה": "Suite",
  "חדר נוף": "View Room",
  "סאונה רטובה ויבשה": "Wet & Dry Sauna",

  // ── Chips / tags ──
  "זוגי": "Couple",
  "משפחה": "Family",
  "נוף": "View",
  "סאונה": "Sauna",

  // ── Chrome UI ──
  "דלג לגלריה": "Skip to gallery",
  "חזרה לחדרי האירוח באתר Gamos": "Back to the guest rooms on the Gamos site",
  "חזרה לאתר": "Back to site",
  "חזרה": "Back",
  "חדרי אירוח": "Guest Rooms",
  "הסוויטות והחדרים של גאמוס": "The Gamos suites and rooms",
  "גררו לצדדים כדי לגלות את החדרים": "Drag sideways to explore the rooms",
  "החליקו לצדדים לגילוי החדרים": "Swipe sideways to explore the rooms",
  "סגירה": "Close",
  "בקרוב": "Coming soon",
  "גלריית חדרי האירוח — גררו לחקור, לחצו על חדר לפרטים": "Guest rooms gallery — drag to explore, tap a room for details",

  // ── Room titles (25) ──
  "רגע של שלווה": "A Moment of Calm",
  "לינה ברמת פרימיום": "Premium-Class Lodging",
  "להרגיש בבית, להתארח אחרת": "Feel at Home, Hosted Differently",
  "הפרטיות מתחילה כאן": "Privacy Begins Here",
  "ברוכים הבאים לסוויטה": "Welcome to the Suite",
  "מרחב למשפחה אחת": "Room for One Family",
  "חדר המשפחה המלא": "The Full Family Room",
  "אווירה שמתחילה בפרטים": "An Atmosphere That Begins in the Details",
  "עיצוב שפוגש פונקציונליות": "Design Meets Function",
  "מגע הקטיפה": "The Velvet Touch",
  "סוויטת הכלה": "The Bridal Suite",
  "סלון הסוויטה": "The Suite Lounge",
  "חדר הרחצה של הסוויטה": "The Suite Bathroom",
  "הסוויטה במבט מלא": "The Suite in Full View",
  "רגע השמפניה": "The Champagne Moment",
  "המדבר נכנס פנימה": "The Desert Comes Inside",
  "להתעורר אל הנוף": "Waking to the View",
  "שגרת בוקר, בקצב אחר": "A Morning Routine at a Different Pace",
  "מרחב שנפתח אל הנוף": "A Space That Opens to the View",
  "כשהאור משנה את האווירה": "When the Light Shifts the Mood",
  "להתחדש. להירגע. להמשיך.": "Renew. Relax. Continue.",
  "החום שעושה את ההבדל": "The Heat That Makes the Difference",
  "חום שמרגיע את הגוף": "Warmth That Soothes the Body",
  "להתחיל מחדש": "A Fresh Start",
  "מסורת בעיצוב עכשווי": "Tradition in Contemporary Design",

  // ── Room bodies (25) ──
  "פינת ישיבה אינטימית בגוונים טבעיים, המזמינה לעצור לרגע, להתרווח ולהתמסר לשקט שלפני החגיגה.": "An intimate seating corner in natural tones, inviting you to pause, settle in and surrender to the quiet before the celebration.",
  "חדר זוגי מרווח המשלב קווים נקיים, חומרים איכותיים ותכנון מוקפד, לחוויית אירוח נעימה ומפנקת.": "A spacious couple's room combining clean lines, quality materials and meticulous design, for a pleasant, indulgent stay.",
  "חלל מואר ומאוזן, המעניק תחושת נוחות ורוגע ומשלים חוויית שהות מוקפדת לאורך כל סוף השבוע.": "A bright, balanced space that offers comfort and calm and completes a refined stay throughout the whole weekend.",
  "כניסה שקטה ומזמינה לחדר המעוצב בקווים נקיים, המעניקה תחושת פרטיות ונוחות כבר מהרגע הראשון.": "A quiet, inviting entrance to a room designed in clean lines, offering a sense of privacy and comfort from the very first moment.",
  "חלל הכניסה מקבל את פניכם באווירה חמימה, עם תכנון מוקפד שמשרה תחושת סדר, נוחות ורוגע.": "The entrance welcomes you in a warm atmosphere, with careful design that instills a sense of order, comfort and calm.",
  "סלון מרווח ופינת ישיבה נעימה יוצרים מקום טבעי להתכנסות, לשיחות ולרגעים המשותפים שהופכים את שהותכם למיוחדת.": "A spacious lounge and a pleasant seating corner create a natural place to gather, talk and share the moments that make your stay special.",
  "חדר משפחתי רחב ידיים, המשלב אזורי שינה וישיבה בחלל אחד, כדי שכל בני המשפחה ייהנו מנוחות מרבית.": "A generously sized family room combining sleeping and seating areas in one space, so the whole family enjoys maximum comfort.",
  "תאורה רכה, גוונים חמימים וחומרי גמר מוקפדים יוצרים חלל נעים, רגוע ומזמין כבר מהכניסה לחדר.": "Soft lighting, warm tones and carefully chosen finishes create a pleasant, calm and inviting space from the moment you enter.",
  "חדר רחצה מרווח, תאורה נעימה ואבזור איכותי, לחוויה נעימה.": "A spacious bathroom, pleasant lighting and quality fittings, for a pleasant experience.",
  "כל חומר, מרקם וגוון נבחרו בקפידה, מתוך תפיסה שלפיה איכות אמיתית ניכרת גם בפרטים הקטנים ביותר.": "Every material, texture and tone was carefully chosen, from the belief that true quality shows even in the smallest details.",
  "הסוויטה משלבת חלל אירוח רחב, פינת ישיבה נינוחה ואזור שינה מרווח, ליצירת חוויה מפנקת ומלאת נוחות.": "The suite combines a wide hosting space, a relaxed seating corner and a spacious sleeping area, creating an indulgent, comfortable experience.",
  "חלל האירוח המרכזי מעוצב בגוונים חמימים, ומזמין למנוחה, לשיחה טובה ולרגעים של ביחד.": "The central hosting space is designed in warm tones, inviting rest, good conversation and moments of togetherness.",
  "עיצוב נקי, חומרים איכותיים ותאורה מדויקת יוצרים חלל מרווח ומוקפד, המשלים את חוויית שהותכם בסוויטה.": "Clean design, quality materials and precise lighting create a spacious, refined space that completes your stay in the suite.",
  "חלל רחב, מואר ומאוזן המעניק שילוב מושלם בין נוחות, פרטיות ואלגנטיות.": "A wide, bright and balanced space offering a perfect blend of comfort, privacy and elegance.",
  "פינת ישיבה אינטימית המיועדת לשיחה טובה, כוס יין או רגע של מנוחה בין שלבי האירוע.": "An intimate seating corner made for good conversation, a glass of wine or a moment of rest between the stages of the event.",
  "חלון רחב ממסגר את הנוף הפתוח והופך אותו לחלק בלתי נפרד מחוויית האירוח, גם מתוך החדר.": "A wide window frames the open landscape and makes it an inseparable part of the experience, even from inside the room.",
  "אור טבעי ומבט פתוח אל מרחבי המדבר יוצרים פתיחה מושלמת לבוקר.": "Natural light and an open view over the desert expanses make a perfect start to the morning.",
  "חדר רחצה מואר ומוקפד, שבו כל פרט תוכנן כדי לפתוח את היום בתחושת רוגע, נוחות ואיכות.": "A bright, refined bathroom where every detail was designed to open the day with a sense of calm, comfort and quality.",
  "חלונות רחבי ממדים מכניסים את אור היום פנימה ומטשטשים את הגבול בין החדר למרחבים הפתוחים שמחוץ לו.": "Wide windows bring daylight inside and blur the line between the room and the open spaces beyond it.",
  "בשעות בין הערביים מתמלא החדר בגוונים טבעיים ורכים, היוצרים תחושה רגועה ונעימה.": "At dusk the room fills with soft, natural tones that create a calm and pleasant feeling.",
  "מתחם הסאונות נועד להעניק רגע של שחרור, פאוזה והתחדשות, כחלק מחוויית האירוח והפינוק של גאמוס.": "The sauna wing is designed to offer a moment of release, pause and renewal, as part of the Gamos hosting and pampering experience.",
  "סאונה יבשה בעיצוב עץ טבעי המאפשרת להאט את הקצב, להשתחרר מהעומס ולהעניק לגוף רגע של התאוששות.": "A dry sauna in natural wood that lets you slow the pace, release the strain and give the body a moment of recovery.",
  "חדר האדים עוטף את הגוף בחום עדין ובאדים נעימים, ומעניק רגע של שחרור, רוגע והתחדשות.": "The steam room wraps the body in gentle heat and pleasant vapor, offering a moment of release, calm and renewal.",
  "מקלחת הגשם משלימה את חוויית ה־Wellness עם זרם מים מרענן, המעניק תחושת רעננות והתחדשות.": "The rain shower completes the wellness experience with a refreshing flow of water, for a sense of freshness and renewal.",
  "בהשראת בתי החמאם הקלאסיים, בעיצוב אלגנטי המעניק פרשנות מודרנית לחוויית רוגע והתחדשות.": "Inspired by classic hammams, in an elegant design that gives a modern interpretation to an experience of calm and renewal.",

  // ── Placeholder bodies (dormant fallback; translated for completeness) ──
  "תצלום נוסף של חדר זוגי יתווסף בקרוב — מרחב מנוחה חם בגווני המתחם.": "Another photo of the couple's room will be added soon — a warm resting space in the estate's tones.",
  "תצלום נוסף של חדר המשפחה יתווסף בקרוב — מרחב מרווח לכל המוזמנים.": "Another photo of the family room will be added soon — a spacious space for all your guests.",
  "תצלום נוסף של הסוויטה יתווסף בקרוב — מרחב יוקרתי ומעוצב לאורחי הכבוד.": "Another photo of the suite will be added soon — a luxurious, designed space for your guests of honor.",
  "תצלום נוסף של חדר הנוף יתווסף בקרוב — מרחב הפתוח אל נוף המדבר.": "Another photo of the view room will be added soon — a space open to the desert view.",
  "תצלום נוסף של הסאונה הרטובה והיבשה יתווסף בקרוב — פינת רוגע והתחדשות.": "Another photo of the wet & dry sauna will be added soon — a corner of calm and renewal.",
};

/** Translate a Hebrew string to the active language (identity in Hebrew). */
export function t(he: string): string {
  if (!he) return he;
  return lang === "en" ? (EN[he] ?? he) : he;
}
