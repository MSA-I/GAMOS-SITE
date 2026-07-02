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
  "לינה ברמת פרימיום": "Lodging, Elevated",
  "להרגיש בבית, להתארח אחרת": "Feel at Home, Only Finer",
  "הפרטיות מתחילה כאן": "Privacy Begins Here",
  "ברוכים הבאים לסוויטה": "Welcome to the Suite",
  "מרחב למשפחה אחת": "Room for the Whole Family",
  "חדר המשפחה המלא": "The Complete Family Room",
  "אווירה שמתחילה בפרטים": "The Mood Is in the Details",
  "עיצוב שפוגש פונקציונליות": "Where Design Meets Function",
  "מגע הקטיפה": "The Velvet Touch",
  "סוויטת הכלה": "The Bridal Suite",
  "סלון הסוויטה": "The Suite Lounge",
  "חדר הרחצה של הסוויטה": "The Suite Bathroom",
  "הסוויטה במבט מלא": "The Suite in Full View",
  "רגע השמפניה": "The Champagne Moment",
  "המדבר נכנס פנימה": "The Desert Comes Inside",
  "להתעורר אל הנוף": "Waking to the View",
  "שגרת בוקר, בקצב אחר": "Mornings, at a Slower Pace",
  "מרחב שנפתח אל הנוף": "A Space That Opens to the View",
  "כשהאור משנה את האווירה": "When the Light Shifts the Mood",
  "להתחדש. להירגע. להמשיך.": "Reset. Unwind. Renew.",
  "החום שעושה את ההבדל": "The Heat That Makes the Difference",
  "חום שמרגיע את הגוף": "Warmth That Soothes",
  "להתחיל מחדש": "A Fresh Start",
  "מסורת בעיצוב עכשווי": "Tradition, Reimagined",

  // ── Room bodies (25) ──
  "פינת ישיבה אינטימית בגוונים טבעיים, המזמינה לעצור לרגע, להתרווח ולהתמסר לשקט שלפני החגיגה.": "An intimate lounge in natural tones — a place to pause, sink in, and savor the quiet that comes before the celebration.",
  "חדר זוגי מרווח המשלב קווים נקיים, חומרים איכותיים ותכנון מוקפד, לחוויית אירוח נעימה ומפנקת.": "A spacious room for two, where clean lines, fine materials, and considered detail come together for a stay that feels effortless and indulgent.",
  "חלל מואר ומאוזן, המעניק תחושת נוחות ורוגע ומשלים חוויית שהות מוקפדת לאורך כל סוף השבוע.": "A bright, balanced space that holds you in comfort and calm — the quiet counterpoint to a weekend made to be remembered.",
  "כניסה שקטה ומזמינה לחדר המעוצב בקווים נקיים, המעניקה תחושת פרטיות ונוחות כבר מהרגע הראשון.": "A quiet, welcoming threshold opens to a room of clean lines — privacy and ease settle over you from the very first step inside.",
  "חלל הכניסה מקבל את פניכם באווירה חמימה, עם תכנון מוקפד שמשרה תחושת סדר, נוחות ורוגע.": "The entrance greets you with warmth, every detail composed to set a tone of order, comfort, and calm.",
  "סלון מרווח ופינת ישיבה נעימה יוצרים מקום טבעי להתכנסות, לשיחות ולרגעים המשותפים שהופכים את שהותכם למיוחדת.": "A generous lounge and an easy seating nook invite the whole family to gather, talk, and share the small moments that make the stay yours.",
  "חדר משפחתי רחב ידיים, המשלב אזורי שינה וישיבה בחלל אחד, כדי שכל בני המשפחה ייהנו מנוחות מרבית.": "A wide-open family room that brings sleeping and lounging together in one flowing space, so everyone rests in comfort.",
  "תאורה רכה, גוונים חמימים וחומרי גמר מוקפדים יוצרים חלל נעים, רגוע ומזמין כבר מהכניסה לחדר.": "Soft light, warm tones, and hand-picked finishes make the room feel calm and welcoming the moment you step inside.",
  "חדר רחצה מרווח, תאורה נעימה ואבזור איכותי, לחוויה נעימה.": "A spacious bathroom bathed in soft light and appointed with quality fittings — where comfort is part of the design.",
  "כל חומר, מרקם וגוון נבחרו בקפידה, מתוך תפיסה שלפיה איכות אמיתית ניכרת גם בפרטים הקטנים ביותר.": "Every material, texture, and tone was chosen with care — because true luxury reveals itself in the smallest details.",
  "הסוויטה משלבת חלל אירוח רחב, פינת ישיבה נינוחה ואזור שינה מרווח, ליצירת חוויה מפנקת ומלאת נוחות.": "The suite unfolds across a wide reception space, a relaxed lounge, and a generous sleeping area — an indulgent retreat made for the occasion.",
  "חלל האירוח המרכזי מעוצב בגוונים חמימים, ומזמין למנוחה, לשיחה טובה ולרגעים של ביחד.": "The central lounge, dressed in warm tones, invites you to rest, talk, and linger together.",
  "עיצוב נקי, חומרים איכותיים ותאורה מדויקת יוצרים חלל מרווח ומוקפד, המשלים את חוויית שהותכם בסוויטה.": "Clean lines, fine materials, and precise lighting shape a spacious, refined space that completes the suite.",
  "חלל רחב, מואר ומאוזן המעניק שילוב מושלם בין נוחות, פרטיות ואלגנטיות.": "A wide, light-filled, beautifully balanced space where comfort, privacy, and elegance meet.",
  "פינת ישיבה אינטימית המיועדת לשיחה טובה, כוס יין או רגע של מנוחה בין שלבי האירוע.": "An intimate corner made for good conversation, a glass of something chilled, or a quiet pause between the moments of the day.",
  "חלון רחב ממסגר את הנוף הפתוח והופך אותו לחלק בלתי נפרד מחוויית האירוח, גם מתוך החדר.": "A wide window frames the open desert and draws it inside — the landscape becomes part of the room itself.",
  "אור טבעי ומבט פתוח אל מרחבי המדבר יוצרים פתיחה מושלמת לבוקר.": "Natural light and an open view across the desert make for a flawless start to the morning.",
  "חדר רחצה מואר ומוקפד, שבו כל פרט תוכנן כדי לפתוח את היום בתחושת רוגע, נוחות ואיכות.": "A bright, considered bathroom where every detail is set to open the day with calm, comfort, and quiet quality.",
  "חלונות רחבי ממדים מכניסים את אור היום פנימה ומטשטשים את הגבול בין החדר למרחבים הפתוחים שמחוץ לו.": "Expansive windows pull daylight in and dissolve the line between the room and the open country beyond.",
  "בשעות בין הערביים מתמלא החדר בגוונים טבעיים ורכים, היוצרים תחושה רגועה ונעימה.": "As dusk settles, the room fills with soft, natural light — and the whole mood turns quiet and warm.",
  "מתחם הסאונות נועד להעניק רגע של שחרור, פאוזה והתחדשות, כחלק מחוויית האירוח והפינוק של גאמוס.": "The sauna wing is made for release — a pause to breathe and renew, woven into the GAMOS experience of hosting and indulgence.",
  "סאונה יבשה בעיצוב עץ טבעי המאפשרת להאט את הקצב, להשתחרר מהעומס ולהעניק לגוף רגע של התאוששות.": "A dry sauna clad in natural wood, where the pace slows, tension lifts, and the body is given room to recover.",
  "חדר האדים עוטף את הגוף בחום עדין ובאדים נעימים, ומעניק רגע של שחרור, רוגע והתחדשות.": "The steam room wraps you in gentle heat and soft vapor — a moment of release, stillness, and renewal.",
  "מקלחת הגשם משלימה את חוויית ה־Wellness עם זרם מים מרענן, המעניק תחושת רעננות והתחדשות.": "The rain shower completes the wellness ritual with a cool, cleansing cascade that leaves you fresh and renewed.",
  "בהשראת בתי החמאם הקלאסיים, בעיצוב אלגנטי המעניק פרשנות מודרנית לחוויית רוגע והתחדשות.": "Inspired by the classic hammam and reimagined with contemporary elegance — a timeless ritual of calm and renewal.",

  // ── Placeholder bodies (dormant fallback; translated for completeness) ──
  "תצלום נוסף של חדר זוגי יתווסף בקרוב — מרחב מנוחה חם בגווני המתחם.": "More of the room for two, coming soon — a warm retreat in the estate's natural tones.",
  "תצלום נוסף של חדר המשפחה יתווסף בקרוב — מרחב מרווח לכל המוזמנים.": "More of the family room, coming soon — a spacious retreat for everyone you're bringing.",
  "תצלום נוסף של הסוויטה יתווסף בקרוב — מרחב יוקרתי ומעוצב לאורחי הכבוד.": "More of the suite, coming soon — a refined, luxurious space for your guests of honor.",
  "תצלום נוסף של חדר הנוף יתווסף בקרוב — מרחב הפתוח אל נוף המדבר.": "More of the view room, coming soon — a space that opens onto the desert horizon.",
  "תצלום נוסף של הסאונה הרטובה והיבשה יתווסף בקרוב — פינת רוגע והתחדשות.": "More of the wet and dry sauna, coming soon — a corner made for calm and renewal.",
};

const FR: Record<string, string> = {
  // ── Categories (row headings) ──
  "חדר זוגי": "Chambre Double",
  "חדר משפחה": "Chambre Familiale",
  "סוויטה": "Suite",
  "חדר נוף": "Chambre avec Vue",
  "סאונה רטובה ויבשה": "Sauna Humide et Sec",

  // ── Chips / tags ──
  "זוגי": "Double",
  "משפחה": "Famille",
  "נוף": "Vue",
  "סאונה": "Sauna",

  // ── Chrome UI ──
  "דלג לגלריה": "Aller à la galerie",
  "חזרה לחדרי האירוח באתר Gamos": "Retour aux chambres sur le site GAMOS",
  "חזרה לאתר": "Retour au site",
  "חזרה": "Retour",
  "חדרי אירוח": "Chambres",
  "הסוויטות והחדרים של גאמוס": "Les suites et les chambres de GAMOS",
  "גררו לצדדים כדי לגלות את החדרים": "Faites glisser latéralement pour découvrir les chambres",
  "החליקו לצדדים לגילוי החדרים": "Balayez latéralement pour découvrir les chambres",
  "סגירה": "Fermer",
  "בקרוב": "Prochainement",
  "גלריית חדרי האירוח — גררו לחקור, לחצו על חדר לפרטים": "Galerie des chambres — faites glisser pour explorer, cliquez sur une chambre pour les détails",

  // ── Room titles (25) ──
  "רגע של שלווה": "Un Instant de Sérénité",
  "לינה ברמת פרימיום": "Un Hébergement d'Exception",
  "להרגיש בבית, להתארח אחרת": "Se Sentir chez Soi, en Mieux",
  "הפרטיות מתחילה כאן": "L'Intimité Commence Ici",
  "ברוכים הבאים לסוויטה": "Bienvenue dans la Suite",
  "מרחב למשפחה אחת": "Un Espace pour Toute la Famille",
  "חדר המשפחה המלא": "La Chambre Familiale au Complet",
  "אווירה שמתחילה בפרטים": "L'Atmosphère Est dans les Détails",
  "עיצוב שפוגש פונקציונליות": "Le Design au Service de la Fonction",
  "מגע הקטיפה": "La Douceur du Velours",
  "סוויטת הכלה": "La Suite Nuptiale",
  "סלון הסוויטה": "Le Salon de la Suite",
  "חדר הרחצה של הסוויטה": "La Salle de Bain de la Suite",
  "הסוויטה במבט מלא": "La Suite en Vue d'Ensemble",
  "רגע השמפניה": "L'Instant Champagne",
  "המדבר נכנס פנימה": "Quand le Désert Entre",
  "להתעורר אל הנוף": "S'Éveiller face au Paysage",
  "שגרת בוקר, בקצב אחר": "Les Matins, à un Autre Rythme",
  "מרחב שנפתח אל הנוף": "Un Espace Ouvert sur le Paysage",
  "כשהאור משנה את האווירה": "Quand la Lumière Transforme l'Ambiance",
  "להתחדש. להירגע. להמשיך.": "Se Ressourcer. Se Détendre. Repartir.",
  "החום שעושה את ההבדל": "La Chaleur qui Fait la Différence",
  "חום שמרגיע את הגוף": "Une Chaleur qui Apaise",
  "להתחיל מחדש": "Un Nouveau Départ",
  "מסורת בעיצוב עכשווי": "La Tradition Réinventée",

  // ── Room bodies (25) ──
  "פינת ישיבה אינטימית בגוונים טבעיים, המזמינה לעצור לרגע, להתרווח ולהתמסר לשקט שלפני החגיגה.": "Un salon intime aux teintes naturelles, où l'on s'arrête un instant, où l'on se love, où l'on savoure le calme qui précède la célébration.",
  "חדר זוגי מרווח המשלב קווים נקיים, חומרים איכותיים ותכנון מוקפד, לחוויית אירוח נעימה ומפנקת.": "Une chambre double spacieuse où lignes épurées, matériaux nobles et conception soignée s'unissent pour un séjour aussi doux que raffiné.",
  "חלל מואר ומאוזן, המעניק תחושת נוחות ורוגע ומשלים חוויית שהות מוקפדת לאורך כל סוף השבוע.": "Un espace lumineux et équilibré qui enveloppe de confort et de sérénité — le contrepoint paisible d'un week-end à savourer.",
  "כניסה שקטה ומזמינה לחדר המעוצב בקווים נקיים, המעניקה תחושת פרטיות ונוחות כבר מהרגע הראשון.": "Un seuil calme et accueillant ouvre sur une chambre aux lignes épurées : l'intimité et le confort s'installent dès le premier pas.",
  "חלל הכניסה מקבל את פניכם באווירה חמימה, עם תכנון מוקפד שמשרה תחושת סדר, נוחות ורוגע.": "L'entrée vous accueille avec chaleur, chaque détail composé pour instaurer une impression d'ordre, de confort et de sérénité.",
  "סלון מרווח ופינת ישיבה נעימה יוצרים מקום טבעי להתכנסות, לשיחות ולרגעים המשותפים שהופכים את שהותכם למיוחדת.": "Un salon généreux et un coin détente invitent toute la famille à se réunir, à échanger et à partager les instants qui font tout le prix du séjour.",
  "חדר משפחתי רחב ידיים, המשלב אזורי שינה וישיבה בחלל אחד, כדי שכל בני המשפחה ייהנו מנוחות מרבית.": "Une chambre familiale généreuse, où espaces nuit et salon se réunissent dans un même volume, pour que toute la famille se repose en tout confort.",
  "תאורה רכה, גוונים חמימים וחומרי גמר מוקפדים יוצרים חלל נעים, רגוע ומזמין כבר מהכניסה לחדר.": "Lumière tamisée, teintes chaleureuses et finitions choisies rendent la chambre paisible et accueillante dès le seuil franchi.",
  "חדר רחצה מרווח, תאורה נעימה ואבזור איכותי, לחוויה נעימה.": "Une salle de bain spacieuse, baignée d'une lumière douce et dotée d'équipements de qualité — où le confort fait partie du décor.",
  "כל חומר, מרקם וגוון נבחרו בקפידה, מתוך תפיסה שלפיה איכות אמיתית ניכרת גם בפרטים הקטנים ביותר.": "Chaque matière, texture et teinte a été choisie avec soin, dans la conviction que le véritable luxe se révèle jusque dans les moindres détails.",
  "הסוויטה משלבת חלל אירוח רחב, פינת ישיבה נינוחה ואזור שינה מרווח, ליצירת חוויה מפנקת ומלאת נוחות.": "La suite se déploie en un vaste espace de réception, un salon paisible et un espace nuit généreux — une retraite raffinée à la hauteur de l'événement.",
  "חלל האירוח המרכזי מעוצב בגוונים חמימים, ומזמין למנוחה, לשיחה טובה ולרגעים של ביחד.": "Le salon principal, habillé de teintes chaleureuses, invite au repos, à la conversation et aux moments partagés.",
  "עיצוב נקי, חומרים איכותיים ותאורה מדויקת יוצרים חלל מרווח ומוקפד, המשלים את חוויית שהותכם בסוויטה.": "Lignes épurées, matériaux nobles et éclairage précis façonnent un espace spacieux et raffiné qui parachève la suite.",
  "חלל רחב, מואר ומאוזן המעניק שילוב מושלם בין נוחות, פרטיות ואלגנטיות.": "Un espace vaste, lumineux et parfaitement équilibré, où confort, intimité et élégance se rejoignent.",
  "פינת ישיבה אינטימית המיועדת לשיחה טובה, כוס יין או רגע של מנוחה בין שלבי האירוע.": "Un coin intime pensé pour une belle conversation, un verre bien frais ou un instant de repos entre les temps forts de la journée.",
  "חלון רחב ממסגר את הנוף הפתוח והופך אותו לחלק בלתי נפרד מחוויית האירוח, גם מתוך החדר.": "Une large baie encadre le désert et le fait entrer : le paysage devient une part de la chambre elle-même.",
  "אור טבעי ומבט פתוח אל מרחבי המדבר יוצרים פתיחה מושלמת לבוקר.": "La lumière naturelle et la vue dégagée sur les étendues du désert offrent une ouverture parfaite à la journée.",
  "חדר רחצה מואר ומוקפד, שבו כל פרט תוכנן כדי לפתוח את היום בתחושת רוגע, נוחות ואיכות.": "Une salle de bain lumineuse et soignée, où chaque détail a été pensé pour ouvrir la journée dans la sérénité, le confort et la qualité.",
  "חלונות רחבי ממדים מכניסים את אור היום פנימה ומטשטשים את הגבול בין החדר למרחבים הפתוחים שמחוץ לו.": "De vastes baies laissent entrer la lumière du jour et effacent la frontière entre la chambre et les étendues ouvertes qui l'entourent.",
  "בשעות בין הערביים מתמלא החדר בגוונים טבעיים ורכים, היוצרים תחושה רגועה ונעימה.": "Au crépuscule, la chambre se pare d'une lumière douce et naturelle, et toute l'atmosphère se fait paisible et chaleureuse.",
  "מתחם הסאונות נועד להעניק רגע של שחרור, פאוזה והתחדשות, כחלק מחוויית האירוח והפינוק של גאמוס.": "L'espace saunas est fait pour le lâcher-prise — une parenthèse pour souffler et se ressourcer, au cœur de l'expérience d'accueil et de bien-être GAMOS.",
  "סאונה יבשה בעיצוב עץ טבעי המאפשרת להאט את הקצב, להשתחרר מהעומס ולהעניק לגוף רגע של התאוששות.": "Un sauna sec habillé de bois naturel, où le rythme ralentit, les tensions s'apaisent et le corps retrouve un moment de récupération.",
  "חדר האדים עוטף את הגוף בחום עדין ובאדים נעימים, ומעניק רגע של שחרור, רוגע והתחדשות.": "Le hammam vous enveloppe d'une chaleur douce et d'une vapeur légère — un moment de lâcher-prise, de calme et de ressourcement.",
  "מקלחת הגשם משלימה את חוויית ה־Wellness עם זרם מים מרענן, המעניק תחושת רעננות והתחדשות.": "La douche à effet pluie parachève le rituel bien-être d'une cascade rafraîchissante qui laisse une sensation de fraîcheur et de renouveau.",
  "בהשראת בתי החמאם הקלאסיים, בעיצוב אלגנטי המעניק פרשנות מודרנית לחוויית רוגע והתחדשות.": "Inspiré des hammams d'autrefois et réinventé avec une élégance contemporaine — un rituel intemporel de sérénité et de ressourcement.",

  // ── Placeholder bodies (dormant fallback; translated for completeness) ──
  "תצלום נוסף של חדר זוגי יתווסף בקרוב — מרחב מנוחה חם בגווני המתחם.": "D'autres vues de la chambre double arrivent bientôt — une retraite chaleureuse dans les teintes du domaine.",
  "תצלום נוסף של חדר המשפחה יתווסף בקרוב — מרחב מרווח לכל המוזמנים.": "D'autres vues de la chambre familiale arrivent bientôt — un espace généreux pour tous vos invités.",
  "תצלום נוסף של הסוויטה יתווסף בקרוב — מרחב יוקרתי ומעוצב לאורחי הכבוד.": "D'autres vues de la suite arrivent bientôt — un espace luxueux et raffiné pour vos invités d'honneur.",
  "תצלום נוסף של חדר הנוף יתווסף בקרוב — מרחב הפתוח אל נוף המדבר.": "D'autres vues de la chambre avec vue arrivent bientôt — un espace ouvert sur l'horizon du désert.",
  "תצלום נוסף של הסאונה הרטובה והיבשה יתווסף בקרוב — פינת רוגע והתחדשות.": "D'autres vues du sauna humide et sec arrivent bientôt — un havre de calme et de ressourcement.",
};

const DICTS: Record<Exclude<Lang, "he">, Record<string, string>> = { en: EN, fr: FR };

/** Translate a Hebrew string to the active language (identity in Hebrew). */
export function t(he: string): string {
  if (!he) return he;
  return lang === "he" ? he : (DICTS[lang]?.[he] ?? he);
}
