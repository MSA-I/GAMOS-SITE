/**
 * i18n-build.mjs — build assets/i18n/en.json + assets/i18n/fr.json from
 * authored HE→EN→FR triples.
 *
 * Each dictionary is keyed by the CANONICAL form of the Hebrew source string
 * (decode &nbsp;, collapse whitespace incl. U+00A0, trim). `canon()` here MUST
 * stay byte-identical to canon() in js/i18n.js so the runtime lookup finds every
 * key. Both files share the same key set (one pass). Run:
 * `node scripts/i18n-build.mjs` (also part of `npm run build`).
 *
 * To add/adjust a translation: edit the PAIRS array (Hebrew verbatim from the
 * DOM, then English, then French) and re-run. English is France-agnostic; French
 * is France French, formal register ("vous"), LTR. Extraction of the current
 * Hebrew set lives in git history under .tmp/i18n-extract.mjs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const canon = (s) =>
  String(s)
    .replace(/&nbsp;/g, " ")
    .replace(/[\u200e\u200f\u200b]/g, "") // drop invisible bidi marks (LRM/RLM/ZWSP)
    .replace(/\s+/g, " ")
    .trim();

// [ Hebrew source (verbatim), English, French ]
const PAIRS = [
  ["גאמוס אירועים | אולם, ריזורט וגן אירועים במעלה אדומים", "Gamos Events | Hall, Resort & Garden Venue in Ma'ale Adumim", "GAMOS Événements | Salle, Resort et jardin d'événements à Maalé Adoumim"],
  ["דלג לתוכן הראשי", "Skip to main content", "Aller au contenu principal"],
  ["אולם", "Hall", "Salle"],
  ["ריזורט", "Resort", "Resort"],
  ["קולינריה", "Culinary", "Gastronomie"],
  ["שבתות חתן", "Groom's Shabbat", "Shabbat du marié"],
  ["חדרי נופש", "Guest Rooms", "Chambres"],
  ["אודות", "About", "À propos"],
  ["המלצות", "Testimonials", "Témoignages"],
  ["גלריה", "Gallery", "Galerie"],
  ["אירועים", "Events", "Événements"],
  ["כשרות", "Kashrut", "Cacherout"],
  ["מן העיתונות", "Press", "Presse"],
  ["מתחם קבלת פנים", "Reception Lounge", "Salon de réception"],
  ["צור קשר", "Contact", "Contact"],
  ["בין השמיים למדבר", "Between the Sky and the Desert", "Entre le ciel et le désert"],
  ["המקום שבו האירועים מקבלים", "Where every celebration finds", "Là où chaque célébration se pare"],
  ["תפאורה יחודית.", "a setting all its own.", "d'un décor qui lui est propre."],
  ["גן אירועים, אולם, ריזורט וחדרי אירוח, מול נוף פתוח ועוצר נשימה של מדבר יהודה", "A garden venue, hall, resort and guest rooms, framed by the open, breathtaking landscape of the Judean Desert", "Un jardin d'événements, une salle, un resort et des chambres, encadrés par le paysage ouvert et à couper le souffle du désert de Judée"],
  ["לחצו כדי לבחור תצוגת אולם", "Tap to choose your venue", "Appuyez pour choisir votre espace"],
  ["פינה לנשום בלב הערב", "A place to breathe, at the heart of the evening", "Une parenthèse pour respirer, au cœur de la soirée"],
  ["קבלת הפנים", "The Reception", "La réception"],
  ["מתחם קבלת הפנים", "The Reception Lounge", "Le salon de réception"],
  ["טרקלין הישיבה", "The Seating Lounge", "Le salon de séjour"],
  ["פסנתר הכנף", "The Grand Piano", "Le piano à queue"],
  ["פינת הפסנתר", "The Piano Corner", "Le coin piano"],
  ["פינת הכיבוד", "The Refreshments Corner", "Le coin rafraîchissements"],
  ["פרטי העיצוב", "Design Details", "Détails du décor"],
  ["הכניסה", "The Entrance", "L'entrée"],
  ["גררו לסיבוב הגלריה", "Drag to rotate the gallery", "Faites glisser pour faire pivoter la galerie"],
  ["המשיכו לגלול", "Keep scrolling", "Continuez à faire défiler"],
  ["המטבח שלנו", "From Our Kitchen", "En cuisine"],
  ["חוויה קולינרית עילית", "Cuisine, Elevated", "La gastronomie, sublimée"],
  ["בגאמוס, חוויית האירוח מתחילה במטבח. בהובלת שף מוערך וצוות מקצועי ומנוסה, נבנים תפריטים בהתאמה אישית, המשלבים חומרי גלם מובחרים וטריים, יצירתיות קולינרית והקפדה על כל פרט", "At Gamos, the hospitality begins in the kitchen. Led by an acclaimed chef and a seasoned professional team, bespoke menus are crafted to order — combining the finest fresh ingredients, culinary creativity and attention to every detail", "Chez GAMOS, l'accueil commence en cuisine. Sous la direction d'un chef renommé et d'une équipe professionnelle et expérimentée, des menus sur mesure sont élaborés à la demande — alliant les meilleurs ingrédients frais, la créativité culinaire et le souci du moindre détail"],
  ["עיקרית", "Main", "Plat principal"],
  ["מדליוני בקר", "Beef Medallions", "Médaillons de bœuf"],
  ["נתח רך, צלייה מדויקת ורוטב יין כהה.", "A tender cut, precisely roasted, in a dark wine sauce.", "Une pièce tendre, rôtie avec précision, dans une sauce au vin foncée."],
  ["ראשונה", "Starter", "Entrée"],
  ["קרודו דג לבן", "White Fish Crudo", "Crudo de poisson blanc"],
  ["פרוסות דג טרי בשמן זית, צ'ילי וצנונית.", "Fresh fish, thinly sliced, with olive oil, chili and radish.", "Fines tranches de poisson frais, huile d'olive, piment et radis."],
  ["פתיחה", "Opening", "Amuse-bouche"],
  ["פילו ופיסטוק", "Filo & Pistachio", "Filo et pistache"],
  ["מאפה פריך, סירופ חם ופיסטוק קצוץ.", "Crisp pastry, warm syrup and chopped pistachio.", "Pâtisserie croustillante, sirop chaud et pistache concassée."],
  ["קרפצ'יו סלמון", "Salmon Carpaccio", "Carpaccio de saumon"],
  ["פרוסות דקות בשמן הדרים, צ'ילי וצנוניות.", "Thin slices in citrus oil, chili and radishes.", "Fines tranches à l'huile d'agrumes, piment et radis."],
  ["על האש", "Grilled", "Grillades"],
  ["אנטריקוט על האש", "Grilled Entrecôte", "Entrecôte grillée"],
  ["נתח על הגריל, תפוחי אדמה חרוכים ושיפוד ירקות.", "A grilled cut with charred potatoes and a vegetable skewer.", "Une pièce grillée, pommes de terre grillées et brochette de légumes."],
  ["פילה בקר ודובדבנים", "Beef Fillet & Cherries", "Filet de bœuf et cerises"],
  ["נתח רך ברוטב דובדבנים, שעועית ובצל מקורמל.", "A tender cut in cherry sauce, green beans and caramelized onion.", "Une pièce tendre en sauce aux cerises, haricots verts et oignon caramélisé."],
  ["סלט", "Salad", "Salade"],
  ["סלט עלים ותפוח", "Leaf & Apple Salad", "Salade de jeunes pousses et pomme"],
  ["עלים ירוקים, פלחי תפוח ירוק ופצפוצי קראנץ'.", "Green leaves, green apple slices and a crunchy topping.", "Jeunes pousses vertes, lamelles de pomme verte et éclats croustillants."],
  ["גליל פילו על סלק", "Filo Roll on Beetroot", "Roulé de filo sur betterave"],
  ["עטיפת פילו פריכה על מצע סלק עם נבטים.", "A crisp filo wrap over a bed of beetroot with sprouts.", "Un roulé de filo croustillant sur un lit de betterave et de jeunes pousses."],
  ["קרפצ'יו בקר", "Beef Carpaccio", "Carpaccio de bœuf"],
  ["פרוסות דקות בשמן זית, רוקט, שום ובלסמי.", "Thin slices in olive oil, arugula, garlic and balsamic.", "Fines tranches à l'huile d'olive, roquette, ail et balsamique."],
  ["בופה", "Buffet", "Buffet"],
  ["שולחן שכולו שפע", "A Table of Pure Abundance", "Une table de pure abondance"],
  ["בופה עשיר ומעוצב — מעמדות שף חיות, סושי-בר, על האש ומאפים מהטאבון, הכל בעבודת יד מול האורחים.", "A rich, curated buffet — live chef stations, a sushi bar, open grill and taboon-baked pastries, all prepared by hand before your guests.", "Un buffet riche et raffiné — stations de chef en direct, bar à sushis, grillades et pâtisseries cuites au four taboon, le tout préparé à la main devant vos convives."],
  ["פיצה נאפוליטנית", "Neapolitan Pizza", "Pizza napolitaine"],
  ["מגש סושי קשת", "Rainbow Sushi Platter", "Plateau de sushis arc-en-ciel"],
  ["פוקאצ'ה ופסטו בזיליקום", "Focaccia & Basil Pesto", "Focaccia et pesto au basilic"],
  ["שווארמת פרגית על האש", "Grilled Chicken Shawarma", "Shawarma de poulet grillé"],
  ["פלפלים קלויים בשמן ושום", "Roasted Peppers in Oil & Garlic", "Poivrons rôtis à l'huile et à l'ail"],
  ["טרטר סלמון על קרוסטיני", "Salmon Tartare on Crostini", "Tartare de saumon sur crostini"],
  ["טרטר בהרכבה חיה", "Tartare Assembled to Order", "Tartare assemblé à la minute"],
  ["מאפי בוטיק מהטאבון", "Boutique Taboon Pastries", "Pâtisseries de boutique au four taboon"],
  ["באו בריסקט פולד", "Pulled Brisket Bao", "Bao à la poitrine de bœuf effilochée"],
  ["סביצ'ה לבן בהדרים", "White Ceviche in Citrus", "Ceviche blanc aux agrumes"],
  ["שבת חתן בניחוח של חוץ לארץ", "A Groom's Shabbat that Feels a World Away", "Un Shabbat du marié aux airs d'ailleurs"],
  ["שבת חתן שלמה — הכול במתחם אחד", "A Complete Shabbat, One Estate", "Un Shabbat entier, un seul domaine"],
  ["מרגע קבלת השבת ועד לסיומה, כל שלבי האירוח מתקיימים במתחם אחד, המשלב לינה, סעודות, תפילות וזמן משפחתי באווירה ייחודית.", "From the welcoming of Shabbat to its close, every part of the hosting unfolds within a single estate — lodging, meals, prayers and family time, all in one distinctive setting.", "De l'accueil du Shabbat jusqu'à sa clôture, chaque étape de l'accueil se déroule au sein d'un même domaine — hébergement, repas, prières et moments en famille, le tout dans un cadre singulier."],
  ["מרחב נפתח אל המדבר", "Open to the Desert", "Ouvert sur le désert"],
  ["חלל רחב ומואר המשתלב עם הנוף הפתוח המאפשר לארח את יקיריכם במתחם פרטי, בנוחות ובתחושת מרחב יוצאת דופן.", "A wide, light-filled space that blends into the open landscape, letting you host your loved ones in a private estate — in comfort and with an exceptional sense of space.", "Un espace vaste et lumineux qui se fond dans le paysage ouvert, vous permettant d'accueillir vos proches dans un domaine privé — dans le confort et avec un sentiment d'espace exceptionnel."],
  ["שלווה ונחת", "Calm & Ease", "Calme et sérénité"],
  ["האור הטבעי, הקווים הנקיים והמרחב הפתוח יוצרים סביבת אירוח נעימה, אלגנטית ומזמינה לכל רגע במהלך השבת.", "The natural light, clean lines and open space create a warm, elegant and inviting setting for every moment of Shabbat.", "La lumière naturelle, les lignes épurées et l'espace ouvert créent un cadre chaleureux, élégant et accueillant pour chaque instant du Shabbat."],
  ["מתכנסים סביב שולחן אחד", "Gathering Around One Table", "Se réunir autour d'une même table"],
  ["מערך שולחנות נקי ומוקפד שנפתח אל המדבר. ישיבה משותפת שמחברת את כל המשפחה סביב שולחן אחד.", "A clean, carefully arranged setting of tables that opens to the desert — shared seating that brings the whole family around a single table.", "Une disposition de tables épurée et soignée qui s'ouvre sur le désert — un espace de convivialité qui réunit toute la famille autour d'une même table."],
  ["שולחן החתן ערוך בפרחי שדה", "The Groom's Table Set with Wildflowers", "La table du marié dressée de fleurs des champs"],
  ["סידור מוקפד המאפשר לכל בני המשפחה והאורחים להתכנס סביב שולחן אחד, באווירה המחברת בין אנשים, עיצוב ומרחב פתוח.", "A meticulous arrangement that gathers family and guests around one table, in an atmosphere that unites people, design and open space.", "Une disposition soignée qui réunit la famille et les convives autour d'une même table, dans une atmosphère qui unit les personnes, le décor et l'espace ouvert."],
  ["תשומת לב לכל פרט", "In Every Detail", "Jusque dans le moindre détail"],
  ["מהעמדת הכלים ועד סידורי השולחן, כל פרט זוכה לתשומת לב מירבית, מתוך תפיסה שאירוח מתחיל בפרטים הקטנים.", "From the placing of the tableware to the table arrangements, every detail receives the utmost care — from the belief that hospitality begins in the smallest things.", "Du dressage de la vaisselle jusqu'à la mise en place des tables, chaque détail reçoit le plus grand soin — dans la conviction que l'accueil commence par les plus petites choses."],
  ["חדרי אירוח", "Guest Rooms", "Chambres"],
  ["לישון במתחם, להתעורר אל המדבר", "Sleep at the Estate, Wake to the Desert", "Dormir au domaine, s'éveiller face au désert"],
  ["פתחו את הדלת אל גלריית החדרים והסוויטות של גאמוס.", "Open the door to the Gamos rooms and suites gallery.", "Ouvrez la porte sur la galerie des chambres et suites de GAMOS."],
  ["היכנסו אל חדרי האירוח", "Enter the Guest Rooms", "Entrez dans les chambres"],
  ["אירועים יוקרתיים&nbsp;·&nbsp;", "Luxury Events · ", "Événements de luxe · "],
  ["חתונות חלום&nbsp;·&nbsp;", "Dream Weddings · ", "Mariages de rêve · "],
  ["ימי הולדת בלתי נשכחים&nbsp;·&nbsp;", "Unforgettable Birthdays · ", "Anniversaires inoubliables · "],
  ["ריזורט&nbsp;·&nbsp;", "Resort · ", "Resort · "],
  ["אולם&nbsp;·&nbsp;", "Hall · ", "Salle · "],
  ["גן&nbsp;·&nbsp;", "Garden · ", "Jardin · "],
  ["ספא&nbsp;·&nbsp;", "Spa · ", "Spa · "],
  ["הסיפור שלנו", "Our Story", "Notre histoire"],
  ["חוויית אירועים המובילה בישראל", "Israel's Premier Event Experience", "La référence de l'événementiel en Israël"],
  ["גאמוס נולד מתוך חזון ליצור מקום שאין דומה לו בישראל. מתחם המשלב אדריכלות מוקפדת, מרחבים פתוחים, אירוח ברמה הגבוהה ביותר ונופי המדבר עוצרי הנשימה.", "Gamos was born of a vision to create a place unlike any other in Israel — an estate that blends refined architecture, open spaces, hosting of the highest order and breathtaking desert views.", "GAMOS est né d'une vision : créer un lieu sans pareil en Israël — un domaine qui allie une architecture raffinée, des espaces ouverts, un accueil du plus haut niveau et des panoramas désertiques à couper le souffle."],
  ["במתחם משתלבים אולם אירועים, ריזורט יוקרתי,", "The estate brings together an events hall, a luxury resort,", "Le domaine réunit une salle d'événements, un resort de luxe,"],
  ["סוויטות אירוח, מתחם Wellness, בריכה מחוממת, בית כנסת, מתחמי אירוח ייעודיים ושירות אישי המלווה כל אירוע מתחילתו ועד סופו.", "guest suites, a wellness area, a heated pool, a synagogue, dedicated hosting spaces and personal service that accompanies every event from start to finish.", "des suites d'hébergement, un espace bien-être, une piscine chauffée, une synagogue, des espaces d'accueil dédiés et un service personnalisé qui accompagne chaque événement du début à la fin."],
  ["כל פרט בגאמוס תוכנן בקפידה, כדי להעניק חוויה שלמה במקום אחד. מקום שבו חוגגים, מתארחים, נחים ויוצרים זיכרונות שנשארים הרבה אחרי שהאירוע מסתיים.", "Every detail at Gamos was carefully designed to offer a complete experience in one place — a place to celebrate, stay, rest and create memories that linger long after the event ends.", "Chaque détail chez GAMOS a été conçu avec soin afin d'offrir une expérience complète en un seul lieu — un lieu où l'on célèbre, séjourne, se repose et crée des souvenirs qui perdurent bien après la fin de l'événement."],
  ["שני מתחמי אירועים נפרדים ומושלמים", "Two Separate, Flawless Event Venues", "Deux espaces événementiels distincts et parfaits"],
  ["עד", "Up to", "Jusqu'à"],
  ["אורחים, ייחודי בישראל", "guests — unique in Israel", "convives — unique en Israël"],
  ["נוף מדבר עוצר נשימה ומיקום אסטרטגי", "Breathtaking desert views and a strategic location", "Des vues désertiques à couper le souffle et un emplacement stratégique"],
  ["חוויה קולינרית ברמה גבוהה", "A high-end culinary experience", "Une expérience gastronomique haut de gamme"],
  ["אורחים בערב אחד", "guests in a single evening", "convives en une seule soirée"],
  ["שנות מצוינות", "years of excellence", "années d'excellence"],
  ["אירועים מדי שנה", "events each year", "événements chaque année"],
  ["מה מספרים על האירוע אצלנו", "In Our Guests' Words", "Dans les mots de nos convives"],
  ["זוהר דורון", "Zohar Doron", "Zohar Doron"],
  ["חתונה · אפריל 2026", "Wedding · April 2026", "Mariage · avril 2026"],
  ["קטי זרזבסקי", "Katy Zarzavsky", "Katy Zarzavsky"],
  ["בר־מצווה · אפריל 2026", "Bar Mitzvah · April 2026", "Bar Mitzvah · avril 2026"],
  ["שבת חתן · דצמבר 2025", "Groom's Shabbat · December 2025", "Shabbat du marié · décembre 2025"],
  ["אסתר יצחק", "Esther Yitzhak", "Esther Yitzhak"],
  ["חתונה · יולי 2025", "Wedding · July 2025", "Mariage · juillet 2025"],
  ["יעלי סבאג", "Yaeli Sabag", "Yaeli Sabag"],
  ["בר־מצווה · דצמבר 2025", "Bar Mitzvah · December 2025", "Bar Mitzvah · décembre 2025"],
  ["אירוע · ספטמבר 2025", "Event · September 2025", "Événement · septembre 2025"],
  ["פברואר 2026", "February 2026", "février 2026"],
  ["יולי 2025", "July 2025", "juillet 2025"],
  ["חתונה · מרץ 2026", "Wedding · March 2026", "Mariage · mars 2026"],
  ["כפיר פרטוק", "Kfir Partuk", "Kfir Partuk"],
  ["בר־מצווה · פברואר 2026", "Bar Mitzvah · February 2026", "Bar Mitzvah · février 2026"],
  ["ארז כהן", "Erez Cohen", "Erez Cohen"],
  ["יוני 2025", "June 2025", "juin 2025"],
  ["עדן ביבי", "Eden Bibi", "Eden Bibi"],
  ["חתונה · נובמבר 2025", "Wedding · November 2025", "Mariage · novembre 2025"],
  ["ינון קוקה", "Yinon Koka", "Yinon Koka"],
  ["רגעים מהמתחם", "Moments from the Estate", "Instants du domaine"],
  ["סוגי אירועים", "Every Kind of Celebration", "Toutes les célébrations"],
  ["חתונות", "Weddings", "Mariages"],
  ["חתונה אינטימית / ממוצעת / גדולה במיוחד, בגן, באולם, בריזורט או במתחם כולו, אנו ערוכים לכל סוגי האירוע צוות מקצועי שילווה אתכם לכל אורך הדרך ויספק לכם מעטפת רחבה ומיטבית.", "An intimate wedding, a mid-size gathering or a grand celebration — in the garden, the hall, the resort or across the entire estate. We are ready for every kind of event, with a professional team that stays beside you from the first idea to the last dance, wrapping the whole day in complete, attentive care.", "Un mariage intime, une réception de taille moyenne ou une grande célébration — au jardin, dans la salle, au resort ou dans l'ensemble du domaine. Nous sommes prêts pour tout type d'événement, avec une équipe professionnelle qui reste à vos côtés de la première idée à la dernière danse, entourant toute la journée d'un soin complet et attentif."],
  ["בר ובת מצווה", "Bar & Bat Mitzvah", "Bar et Bat Mitzvah"],
  ["חגיגה בלתי נשכחת לילדים ולמשפחה, עם מתחמים מותאמים, תוכן, אטרקציות ואווירה שמרגשת את כל הדורות.", "An unforgettable celebration for children and family — with dedicated spaces, programming, attractions and an atmosphere that moves every generation.", "Une célébration inoubliable pour les enfants et la famille, avec des espaces dédiés, des animations, des attractions et une atmosphère qui émeut toutes les générations."],
  ["ברית ובריתה", "Brit & Britah", "Brit et Brita"],
  ["אירוע משפחתי באווירה אלגנטית ונעימה, עם אירוח מוקפד, קולינריה איכותית וליווי אישי מהרגע הראשון.", "A family event in an elegant, welcoming atmosphere, with meticulous hospitality, quality cuisine and personal guidance from the very first moment.", "Un événement familial dans une atmosphère élégante et chaleureuse, avec un accueil soigné, une cuisine de qualité et un accompagnement personnalisé dès le premier instant."],
  ["אירועי חברה", "Corporate Events", "Événements d'entreprise"],
  ["כנסים, השקות, ערבי גיבוש ואירועי יוקרה, עם פתרונות מותאמים, שירות מקצועי והפקה ברמה הגבוהה ביותר.", "Conferences, launches, team evenings and prestige events, with tailored solutions, professional service and production of the highest order.", "Conférences, lancements, soirées de cohésion et événements de prestige, avec des solutions sur mesure, un service professionnel et une production du plus haut niveau."],
  ["אירועים פרטיים", "Private Events", "Événements privés"],
  ["ימי הולדת, ימי נישואין, חגיגות משפחתיות וכל אירוע פרטי שמקבל אצלנו במה מרשימה וחוויה בלתי נשכחת.", "Birthdays, anniversaries, family celebrations and any private event — each given an impressive stage and an unforgettable experience with us.", "Anniversaires, anniversaires de mariage, célébrations familiales et tout événement privé — chacun bénéficiant d'une scène remarquable et d'une expérience inoubliable à nos côtés."],
  ["אירוח מלא במתחם הריזורט השמור רק לכם, עם סוויטות, בית כנסת, בריכה מחוממת וקולינריה שמעניקים לכם סוף שבוע שלם במקום אחד.", "Full hosting at the resort estate reserved just for you, with suites, a synagogue, a heated pool and cuisine that give you a whole weekend in one place.", "Un accueil complet dans le domaine du resort réservé rien qu'à vous, avec des suites, une synagogue, une piscine chauffée et une cuisine qui vous offrent un week-end entier en un seul lieu."],
  ["כשרות ורבנות", "Kashrut & Rabbinate", "Cacherout et Rabbinat"],
  ["בגאמוס מקפידים על סטנדרט כשרות גבוה, בפיקוח הרבנות, עם אפשרות להתאמת רמת הכשרות לצורכי האירוע. כך כל אורח נהנה מחוויה קולינרית מוקפדת, בראש שקט ובביטחון מלא.", "At Gamos we uphold a high standard of kashrut under Rabbinate supervision, with the option to adapt the level of kashrut to the event's needs — so every guest enjoys a refined culinary experience with complete peace of mind.", "Chez GAMOS, nous respectons un standard de cacherout élevé, sous la supervision du Rabbinat, avec la possibilité d'adapter le niveau de cacherout aux besoins de l'événement — ainsi, chaque convive profite d'une expérience gastronomique soignée, l'esprit tranquille et en toute confiance."],
  ["בואו נתחיל לתכנן את האירוע שלכם.", "Let's bring your event to life.", "Donnons vie à votre événement."],
  ["צוות המומחים של גאמוס עומד לרשותכם כדי להפוך את החזון שלכם למציאות. צרו עמנו קשר לתיאום סיור במתחם וקבלת הצעה מותאמת אישית.", "The Gamos team of experts is at your service to turn your vision into reality. Contact us to arrange a tour of the estate and receive a personalized proposal.", "L'équipe d'experts de GAMOS est à votre disposition pour transformer votre vision en réalité. Contactez-nous pour organiser une visite du domaine et recevoir une proposition personnalisée."],
  ["שדות חובה: שם, טלפון, דוא\"ל וסוג אירוע. נחזור אליכם בתוך יום עסקים.", "Required fields: name, phone, email and event type. We'll get back to you within one business day.", "Champs obligatoires : nom, téléphone, e-mail et type d'événement. Nous vous répondrons sous un jour ouvré."],
  ["שם מלא", "Full name", "Nom complet"],
  ["שם החברה", "Company name", "Nom de l'entreprise"],
  ["(אופציונלי)", "(optional)", "(facultatif)"],
  ["טלפון", "Phone", "Téléphone"],
  ["דוא\"ל", "Email", "E-mail"],
  ["סוג אירוע", "Event type", "Type d'événement"],
  ["בחרו סוג אירוע", "Choose an event type", "Choisissez un type d'événement"],
  ["חתונה", "Wedding", "Mariage"],
  ["בר/בת מצווה", "Bar / Bat Mitzvah", "Bar / Bat Mitzvah"],
  ["אירוע חברה", "Corporate event", "Événement d'entreprise"],
  ["אירוע פרטי", "Private event", "Événement privé"],
  ["אחר", "Other", "Autre"],
  ["תאריך מועדף", "Preferred date", "Date souhaitée"],
  ["הודעה", "Message", "Message"],
  ["שליחת פרטים ותיאום סיור במתחם", "Send details & arrange an estate tour", "Envoyer vos coordonnées et organiser une visite du domaine"],
  ["דברו איתנו", "Talk to Us", "Parlez-nous"],
  ["טלפון נוסף", "Additional phone", "Téléphone supplémentaire"],
  ["ווטסאפ", "WhatsApp", "WhatsApp"],
  ["כתובת", "Address", "Adresse"],
  ["די זהב 7, פארק ישראל, מעלה אדומים", "7 Dei Zahav St., Park Israel, Ma'ale Adumim", "7 rue Dei Zahav, Park Israel, Maalé Adoumim"],
  ["נגישות מלאה (100% נגיש)", "Full accessibility (100% accessible)", "Accessibilité totale (100 % accessible)"],
  ["המתחם כולו תוכנן ונבנה על פי תקני הנגישות המחמירים ביותר. כל החללים, מהחנייה ושערי הכניסה, דרך גן האירועים והאולם הראשי ועד תאי השירותים, מונגשים באופן מלא ומכבד. יציאות חירום מסומנות ומוארות פרוסות בכל רחבי המתחם.", "The entire estate was designed and built to the most stringent accessibility standards. Every space — from the parking and entrance gates, through the events garden and the main hall, to the restrooms — is fully and respectfully accessible. Marked, illuminated emergency exits are located throughout the estate.", "L'ensemble du domaine a été conçu et construit selon les normes d'accessibilité les plus strictes. Chaque espace — du parking et des portails d'entrée, en passant par le jardin d'événements et la salle principale, jusqu'aux sanitaires — est entièrement et respectueusement accessible. Des issues de secours signalées et éclairées sont réparties dans tout le domaine."],
  ["גללו לצפייה במפת ההגעה", "Scroll to view the directions map", "Faites défiler pour voir le plan d'accès"],
  ["איך מגיעים", "Getting Here", "Nous rejoindre"],
  ["מסלולי הגעה", "The Way Here", "Le chemin jusqu'à nous"],
  ["בחרו מאיפה אתם מגיעים, ואנחנו נסמן לכם את הדרך", "Choose where you're coming from, and we'll map the way for you", "Choisissez votre point de départ, et nous vous indiquerons le chemin"],
  ["חשבו מסלול", "Calculate route", "Calculer l'itinéraire"],
  ["מהמרכז", "From the Center", "Depuis le Centre"],
  ["מירושלים", "From Jerusalem", "Depuis Jérusalem"],
  ["מהצפון", "From the North", "Depuis le Nord"],
  ["מהדרום", "From the South", "Depuis le Sud"],
  ["≈ 17 דק׳ · 16 ק״מ", "≈ 17 min · 16 km", "≈ 17 min · 16 km"],
  ["נווטו ב-Waze", "Navigate with Waze", "Naviguer avec Waze"],
  ["שאלו בוואטסאפ", "Ask on WhatsApp", "Demander sur WhatsApp"],
  ["מפה: © OpenStreetMap, © CARTO", "Map: © OpenStreetMap, © CARTO", "Carte : © OpenStreetMap, © CARTO"],
  ["די זהב 7, פארק ישראל, מעלה אדומים.", "7 Dei Zahav St., Park Israel, Ma'ale Adumim.", "7 rue Dei Zahav, Park Israel, Maalé Adoumim."],
  ["פתחו ב-Google Maps", "Open in Google Maps", "Ouvrir dans Google Maps"],
  ["גאמוס, קומפלקס אירועים יוקרתי בפארק ישראל, מעלה אדומים. שני מתחמים: אולם זכוכית עד 1000 מוזמנים וריזורט עם בריכה, חדרי אירוח וקולינריה. חתונות, בר-מצווה ואירועי חברה.", "Gamos, a luxury events complex in Park Israel, Ma'ale Adumim. Two venues: a glass hall for up to 1,000 guests and a resort with a pool, guest rooms and cuisine. Weddings, Bar Mitzvahs and corporate events.", "GAMOS, un complexe événementiel de luxe à Park Israel, Maalé Adoumim. Deux espaces : une salle de verre pouvant accueillir jusqu'à 1 000 convives et un resort avec piscine, chambres et gastronomie. Mariages, Bar Mitzvah et événements d'entreprise."],
  ["גאמוס אירועים", "Gamos Events", "GAMOS Événements"],
  ["קומפלקס אירועים יוקרתי בפארק ישראל, מעלה אדומים. אולם זכוכית עד 1000 מוזמנים, ריזורט עם בריכה, חדרי אירוח וקולינריה.", "A luxury events complex in Park Israel, Ma'ale Adumim. A glass hall for up to 1,000 guests, a resort with a pool, guest rooms and cuisine.", "Un complexe événementiel de luxe à Park Israel, Maalé Adoumim. Une salle de verre pouvant accueillir jusqu'à 1 000 convives, un resort avec piscine, chambres et gastronomie."],
  ["מתחם האירועים של גאמוס במעלה אדומים", "The Gamos events estate in Ma'ale Adumim", "Le domaine événementiel de GAMOS à Maalé Adoumim"],
  ["קומפלקס אירועים יוקרתי בפארק ישראל, מעלה אדומים. אולם זכוכית עד 1000 מוזמנים, ריזורט, חדרי אירוח וקולינריה.", "A luxury events complex in Park Israel, Ma'ale Adumim. A glass hall for up to 1,000 guests, a resort, guest rooms and cuisine.", "Un complexe événementiel de luxe à Park Israel, Maalé Adoumim. Une salle de verre pouvant accueillir jusqu'à 1 000 convives, un resort, des chambres et une gastronomie."],
  ["ניווט ראשי", "Main navigation", "Navigation principale"],
  ["גאמוס, לדף הבית", "Gamos — to homepage", "GAMOS — vers l'accueil"],
  ["גאמוס", "Gamos", "GAMOS"],
  ["פתח תפריט", "Open menu", "Ouvrir le menu"],
  ["גלול לסקציה הבאה", "Scroll to the next section", "Faire défiler vers la section suivante"],
  ["בחירת תצוגת אולם", "Choose a venue view", "Choisir une vue de salle"],
  ["כניסה לאולם האירועים", "Enter the events hall", "Entrer dans la salle d'événements"],
  ["כניסה לריזורט", "Enter the resort", "Entrer dans le resort"],
  ["גלריית מתחם קבלת הפנים", "Reception lounge gallery", "Galerie du salon de réception"],
  ["מבט פנורמי על טרקלין קבלת הפנים — ספות קטיפה ירוקות, לוגו הזהב ופסנתר כנף בעומק", "A panoramic view of the reception lounge — green velvet sofas, the gold logo and a grand piano in the background", "Une vue panoramique du salon de réception — canapés en velours vert, le logo doré et un piano à queue en arrière-plan"],
  ["ספת קטיפה ירוקה מול קיר עץ כהה, מדליון הזהב של גאמוס ומסך אמנות", "A green velvet sofa against a dark wood wall, the Gamos gold medallion and an art screen", "Un canapé en velours vert contre un mur en bois foncé, le médaillon doré de GAMOS et un écran d'art"],
  ["ספות קרם וירוק-מרווה סביב שולחנות פליז, על שטיח אבן מעוצב", "Cream and sage-green sofas around brass tables, on a designed stone rug", "Des canapés crème et vert sauge autour de tables en laiton, sur un tapis de pierre au design travaillé"],
  ["פסנתר כנף לצד ספת קטיפה ירוקה ופופים, על רקע וילונות אווריריים", "A grand piano beside a green velvet sofa and poufs, against airy curtains", "Un piano à queue à côté d'un canapé en velours vert et de poufs, devant des rideaux vaporeux"],
  ["מושבי קטיפה תכולים סביב הפסנתר, על רקע קיר לבנים מואר", "Blue velvet seats around the piano, against an illuminated brick wall", "Des sièges en velours bleu autour du piano, devant un mur de briques éclairé"],
  ["נישה מוארת עם עציצים, פינת תה וקפה אלגנטית בגוון עץ כהה", "An illuminated niche with plants, an elegant tea and coffee corner in dark wood", "Une niche éclairée avec des plantes, un coin thé et café élégant en bois foncé"],
  ["שולחנות פליז מעוצבים עם קקטוסים, על רקע קיר הסריג המואר", "Designed brass tables with cacti, against the illuminated lattice wall", "Des tables en laiton au design travaillé avec des cactus, devant le mur en treillis éclairé"],
  ["לובי הכניסה — קיר אבן טבעית, מדרגות מוארות ווילונות אור", "The entrance lobby — a natural stone wall, illuminated stairs and light curtains", "Le hall d'entrée — un mur en pierre naturelle, des escaliers éclairés et des rideaux de lumière"],
  ["גלריית מנות", "Dish gallery", "Galerie des plats"],
  ["מדליוני בקר צלויים ברוטב יין על צלחת לבנה", "Roasted beef medallions in wine sauce on a white plate", "Des médaillons de bœuf rôtis en sauce au vin sur une assiette blanche"],
  ["קרודו דג לבן בשמן זית, צ'ילי, צנונית ובצל ירוק", "White fish crudo in olive oil, chili, radish and green onion", "Crudo de poisson blanc à l'huile d'olive, piment, radis et oignon vert"],
  ["מאפה פילו פריך בפיזור פיסטוק על מצע לבן", "Crisp filo pastry scattered with pistachio on a white base", "Une pâtisserie filo croustillante parsemée de pistache sur un fond blanc"],
  ["קרפצ'יו סלמון בקערה רחבה עם צ'ילי וצנוניות", "Salmon carpaccio in a wide bowl with chili and radishes", "Carpaccio de saumon dans un large bol avec piment et radis"],
  ["אנטריקוט על האש עם תפוחי אדמה חרוכים ושיפוד ירקות", "Grilled entrecôte with charred potatoes and a vegetable skewer", "Entrecôte grillée avec pommes de terre grillées et brochette de légumes"],
  ["פילה בקר ברוטב דובדבנים עם שעועית ירוקה ובצל מקורמל", "Beef fillet in cherry sauce with green beans and caramelized onion", "Filet de bœuf en sauce aux cerises avec haricots verts et oignon caramélisé"],
  ["סלט עלים ירוקים עם פלחי תפוח ירוק וקראנץ' כהה", "A green leaf salad with green apple slices and a dark crunch", "Une salade de jeunes pousses vertes avec lamelles de pomme verte et un croustillant foncé"],
  ["גליל פילו פריך על מצע סלק עם נבטים ושומשום שחור", "A crisp filo roll on a bed of beetroot with sprouts and black sesame", "Un roulé de filo croustillant sur un lit de betterave avec jeunes pousses et sésame noir"],
  ["קרפצ'יו בקר בשמן זית עם רוקט, שום ובלסמי", "Beef carpaccio in olive oil with arugula, garlic and balsamic", "Carpaccio de bœuf à l'huile d'olive avec roquette, ail et balsamique"],
  ["פיצה אישית נאפית בתנור אבן לוהט עם להבות אש מאחור", "A personal pizza baking in a blazing stone oven with flames behind", "Une pizza individuelle cuisant dans un four à pierre ardent avec des flammes derrière"],
  ["מגש סושי בצורת סירת עץ עם שורות רולים צבעוניים בסלמון, טונה ואבוקדו", "A wooden boat-shaped sushi platter with rows of colorful rolls of salmon, tuna and avocado", "Un plateau de sushis en forme de barque en bois avec des rangées de makis colorés au saumon, thon et avocat"],
  ["שף בכפפות מזליף שמן עשבים על פוקאצ'ה חמה על קרש עץ, סינר גאמוס", "A gloved chef drizzling herb oil over warm focaccia on a wooden board, wearing a Gamos apron", "Un chef ganté versant un filet d'huile aux herbes sur une focaccia chaude sur une planche en bois, portant un tablier GAMOS"],
  ["שיפוד שווארמת פרגית גדול מסתובב מעל גחלים לוהטות בגריל", "A large chicken shawarma skewer turning over glowing coals on the grill", "Une grande brochette de shawarma de poulet tournant au-dessus de braises ardentes sur le grill"],
  ["מגש פלפלים אדומים קלויים ומבריקים מקושטים במיקרו עשבים ושום", "A tray of glossy roasted red peppers garnished with micro herbs and garlic", "Un plateau de poivrons rouges rôtis et brillants garnis de micro-herbes et d'ail"],
  ["ריבועי קרוסטיני פריכים עם קוביות טרטר סלמון כתום", "Crisp crostini squares topped with cubes of orange salmon tartare", "Des carrés de crostini croustillants garnis de cubes de tartare de saumon orangé"],
  ["שף בכפפות שחורות מרכיב ביס טרטר טרי מקערת נתח קצוץ מול האורחים", "A chef in black gloves assembling a fresh tartare bite from a bowl of chopped cuts before the guests", "Un chef en gants noirs assemblant une bouchée de tartare frais à partir d'un bol de pièce hachée devant les convives"],
  ["מאפים אפויים מוזהבים על מעמדי עץ מדורגים באווירה חמה", "Golden baked pastries on tiered wooden stands in a warm setting", "Des pâtisseries dorées sur des présentoirs en bois à étages dans une ambiance chaleureuse"],
  ["באנים רכים ממולאים בבשר בריסקט פולד, כרוב סגול וכוסברה על צלחת לבנה", "Soft buns filled with pulled brisket, red cabbage and cilantro on a white plate", "Des pains moelleux garnis de poitrine de bœuf effilochée, chou rouge et coriandre sur une assiette blanche"],
  ["כוסות זכוכית קטנות עם סביצה צבעוני מסודרות על מעמד מדורג", "Small glass cups of colorful ceviche arranged on a tiered stand", "De petits verres de ceviche coloré disposés sur un présentoir à étages"],
  ["מבט-על על מתחם שבת חתן, שולחנות עגולים לצד בריכת האינסוף מול המדבר", "An aerial view of the Groom's Shabbat estate, round tables beside the infinity pool facing the desert", "Une vue aérienne du domaine du Shabbat du marié, des tables rondes au bord de la piscine à débordement face au désert"],
  ["אולם הסעודות הפתוח עם שולחנות עגולים ערוכים ונוף מדברי", "The open dining hall with set round tables and a desert view", "La salle à manger ouverte avec des tables rondes dressées et une vue sur le désert"],
  ["שולחנות שבת חתן ערוכים תחת יריעות בד לבנות מול המדבר", "Groom's Shabbat tables set beneath white fabric canopies facing the desert", "Des tables du Shabbat du marié dressées sous des voiles de tissu blanches face au désert"],
  ["שולחנות לבנים ארוכים ערוכים מול קו האופק הפתוח", "Long white tables set against the open horizon", "De longues tables blanches dressées face à l'horizon ouvert"],
  ["שולחן החתן הארוך ערוך בפרחי שדה וכלי זכוכית", "The long groom's table set with wildflowers and glassware", "La longue table du marié dressée de fleurs des champs et de verrerie"],
  ["פרטי שולחן עם זרי חמניות ונרות לכבוד שבת חתן", "Table details with sunflower bouquets and candles for the Groom's Shabbat", "Des détails de table avec des bouquets de tournesols et des bougies pour le Shabbat du marié"],
  ["כניסה לגלריית חדרי האירוח", "Enter the guest rooms gallery", "Entrer dans la galerie des chambres"],
  ["דלת קרם עם ידית שחורה אנכית, הכניסה לגלריית חדרי האירוח", "A cream door with a vertical black handle — the entrance to the guest rooms gallery", "Une porte crème avec une poignée noire verticale — l'entrée de la galerie des chambres"],
  ["המלצות לקוחות", "Client testimonials", "Témoignages clients"],
  ["ניווט המלצות", "Testimonials navigation", "Navigation des témoignages"],
  ["המלצה קודמת", "Previous testimonial", "Témoignage précédent"],
  ["ניווט שקופיות", "Slide navigation", "Navigation des diapositives"],
  ["המלצה הבאה", "Next testimonial", "Témoignage suivant"],
  ["הצגת התמונה במסך מלא", "View the image in full screen", "Afficher l'image en plein écran"],
  ["תמונה מגלריית המתחם", "An image from the estate gallery", "Une image de la galerie du domaine"],
  ["פרטי קשר וגישה", "Contact & access details", "Coordonnées et informations d'accès"],
  ["גללו לצפייה במפת ההגעה למתחם", "Scroll to view the map with directions to the estate", "Faites défiler pour voir le plan d'accès au domaine"],
  ["הקלידו כתובת מלאה לחישוב מסלול וזמן", "Enter a full address to calculate route and time", "Saisissez une adresse complète pour calculer l'itinéraire et la durée"],
  ["כתובת המוצא שלכם", "Your starting address", "Votre adresse de départ"],
  ["בחירת מוצא הנסיעה", "Choose your point of origin", "Choisir votre point de départ"],
  ["מפת הגעה לגאמוס, די זהב 7, פארק ישראל", "Directions map to Gamos, 7 Dei Zahav St., Park Israel", "Plan d'accès à GAMOS, 7 rue Dei Zahav, Park Israel"],

  // ===================================================================
  // /press/ page (מן העיתונות) — separate document, same runtime dict.
  // Reuses existing keys where they already appear above: "מן העיתונות",
  // "חתונה", "צור קשר", "גאמוס אירועים". The two venue-opening pills use
  // "פתיחת המתחם" (not bare "פתיחה") to avoid colliding with the culinary
  // "פתיחה" course above, whose French is "Amuse-bouche".
  // Card image alts carry an invisible LRM after the "ב" prefix in the DOM;
  // canon() strips it (both here and at runtime), so the keys below are the
  // stripped form ("בmynet", "בוואלה", …).
  // ===================================================================
  // Head
  ["מן העיתונות | גאמוס אירועים", "Press | Gamos Events", "Presse | GAMOS Événements"],
  ["כתבות וביקורות שהתפרסמו על מתחם גאמוס: אולמות, ריזורט וקולינריה, בעיתונות הארצית.", "Features and reviews about the Gamos estate — halls, resort and cuisine — published in the national press.", "Reportages et critiques sur le domaine GAMOS — salles, resort et gastronomie — parus dans la presse nationale."],
  ["כתבות וביקורות שהתפרסמו על מתחם גאמוס בעיתונות הארצית.", "Features and reviews about the Gamos estate published in the national press.", "Reportages et critiques sur le domaine GAMOS parus dans la presse nationale."],
  // Chrome / hero / intro
  ["דלג לתוכן", "Skip to content", "Aller au contenu"],
  ["חזרה לדף הבית גאמוס", "Back to the Gamos homepage", "Retour à l'accueil de GAMOS"],
  ["חזרה לאתר", "Back to site", "Retour au site"],
  ["מתחם גאמוס בפארק ישראל", "The Gamos estate in Park Israel", "Le domaine GAMOS à Park Israel"],
  ["פארק ישראל", "Park Israel", "Park Israel"],
  ["07 כתבות", "07 articles", "07 articles"],
  ["כותבים", "Writing", "On parle"],
  ["על גאמוס.", "about Gamos.", "de GAMOS."],
  ["כתבות וביקורות שהתפרסמו על המתחם בעיתונות הארצית.", "Features and reviews published about the estate in the national press.", "Reportages et critiques parus sur le domaine dans la presse nationale."],
  ["גלול לתוכן", "Scroll to content", "Faire défiler vers le contenu"],
  ["הקדמה", "Introduction", "Introduction"],
  ["ארכיון עיתונות", "Press Archive", "Archives de presse"],
  ["כל מה שעיתונות הארץ כתבה על המתחם — מעיצוב ויוקרה ועד חתונות שלא נשכחות.", "Everything the national press has written about the estate — from design and luxury to unforgettable weddings.", "Tout ce que la presse nationale a écrit sur le domaine — du design et du luxe jusqu'aux mariages inoubliables."],
  ["כתבות מהעיתונות", "Press features", "Articles de presse"],
  // Pills
  ["עיצוב", "Design", "Design"],
  ["מהדורה מקומית", "Local Edition", "Édition locale"],
  ["בר מצווה", "Bar Mitzvah", "Bar Mitzvah"],
  ["אורח VIP", "VIP Guest", "Invité VIP"],
  ["פתיחת המתחם", "Opening", "Ouverture"],
  // Outlets (Latin-script outlets ynet / ICE need no key)
  ["וואלה בית ועיצוב", "Walla Home & Design", "Walla Maison & Design"],
  ["mynet ירושלים", "mynet Jerusalem", "mynet Jérusalem"],
  ["מעריב Sport1", "Maariv Sport1", "Maariv Sport1"],
  ["EMESS רדיו", "EMESS Radio", "EMESS Radio"],
  ["וואלה מקומי", "Walla Local", "Walla Local"],
  // Dates
  ["31 ביולי 2025", "31 July 2025", "31 juillet 2025"],
  ["5 באוגוסט 2025", "5 August 2025", "5 août 2025"],
  ["16 באוקטובר 2025", "16 October 2025", "16 octobre 2025"],
  ["21 בנובמבר 2024", "21 November 2024", "21 novembre 2024"],
  ["28 ביוני 2024", "28 June 2024", "28 juin 2024"],
  ["9 ביוני 2024", "9 June 2024", "9 juin 2024"],
  // Titles
  ["מתחם האירועים בפארק ישראל: דובאי פוגשת את המדבר", "The events estate in Park Israel: Dubai meets the desert", "Le domaine événementiel de Park Israel : Dubaï rencontre le désert"],
  ["מתחם גאמוס בידיעות ירושלים", "The Gamos estate in Yediot Jerusalem", "Le domaine GAMOS dans Yediot Jérusalem"],
  ["כולל מסיבה מטורפת עד שעות הבוקר: החגיגה הענקית של משפחת בוזגלו", "Including a wild party until dawn: the Buzaglo family's huge celebration", "Avec une fête endiablée jusqu'à l'aube : l'immense célébration de la famille Buzaglo"],
  ["טוקר חיתן בת; כולם הגיעו להשתתף בשמחתו", "Tucker married off a daughter; everyone came to share in his joy", "Tucker a marié sa fille ; tous sont venus partager sa joie"],
  ["סודות הכסף", "Money Secrets", "Les secrets de l'argent"],
  ["חולמים על חתונה בסגנון דובאי: הכירו את GAMOS בפארק ישראל", "Dreaming of a Dubai-style wedding: meet GAMOS in Park Israel", "Rêver d'un mariage façon Dubaï : découvrez GAMOS à Park Israel"],
  ["בהשקעת 100 מיליון שקל: גן אירועים ומלון חדש נפתחו בישראל", "A 100-million-shekel investment: a new events garden and hotel open in Israel", "Un investissement de 100 millions de shekels : un nouveau jardin d'événements et un hôtel ouvrent en Israël"],
  // Excerpts
  ["קומפלקס אירועים יוקרתי חדש במעלה אדומים עם עיצוב בינלאומי, טכנולוגיה מתקדמת וריזורט פרטי.", "A new luxury events complex in Ma'ale Adumim, with international design, advanced technology and a private resort.", "Un nouveau complexe événementiel de luxe à Maalé Adoumim, au design international, à la technologie de pointe et doté d'un resort privé."],
  ["כתבה במהדורת mynet ירושלים על מתחם האירועים החדש במעלה אדומים.", "A feature in the mynet Jerusalem edition on the new events estate in Ma'ale Adumim.", "Un article de l'édition mynet Jérusalem sur le nouveau domaine événementiel de Maalé Adoumim."],
  ["משפחת בוזגלו חגגה בר מצווה בגאמוס בפארק ישראל עם שישה דיג'יים וסשן זריחה עד הבוקר.", "The Buzaglo family celebrated a bar mitzvah at Gamos in Park Israel, with six DJs and a sunrise session until morning.", "La famille Buzaglo a célébré une bar mitzvah à GAMOS, Park Israel, avec six DJ et une session au lever du soleil jusqu'au matin."],
  ["חתונת בתו של מנחם טוקר התקיימה באולמי גאמוס בפארק ישראל בהשתתפות רבנים ובכירי תעשיית המוזיקה.", "The wedding of Menachem Tucker's daughter took place at the Gamos halls in Park Israel, attended by rabbis and leading figures of the music industry.", "Le mariage de la fille de Menachem Tucker s'est tenu dans les salles GAMOS de Park Israel, en présence de rabbins et de personnalités de l'industrie musicale."],
  ["השף אבי ביטון חגג יום הולדת 40 לחברתו בריזורט פרטי במתחם האירועים היוקרתי גאמוס במעלה אדומים.", "Chef Avi Biton celebrated his partner's 40th birthday at a private resort within the luxury Gamos events estate in Ma'ale Adumim.", "Le chef Avi Biton a célébré les 40 ans de sa compagne dans un resort privé au sein du domaine événementiel de luxe GAMOS, à Maalé Adoumim."],
  ['נפתח קומפלקס אירועים בגודל 11 דונם בהשקעה של כ־100 מיליון ש"ח המכיל אולם, גן אירועים וריזורט עם 33 חדרים.', "An 11-dunam events complex has opened, with an investment of some 100 million shekels, comprising a hall, an events garden and a resort with 33 rooms.", "Un complexe événementiel de 11 dounams a ouvert, avec un investissement d'environ 100 millions de shekels, comprenant une salle, un jardin d'événements et un resort de 33 chambres."],
  ["קומפלקס גאמוס שנפתח בפארק ישראל כולל אולם אירועים, גן מעוצב וריזורט עם 33 סוויטות.", "The Gamos complex that opened in Park Israel includes an events hall, a landscaped garden and a resort with 33 suites.", "Le complexe GAMOS, ouvert à Park Israel, comprend une salle d'événements, un jardin paysager et un resort de 33 suites."],
  // Credits
  ["צילום מתוך הכתבה · וואלה בית ועיצוב", "Photo from the article · Walla Home & Design", "Photo tirée de l'article · Walla Maison & Design"],
  ["צילום מתוך הכתבה · mynet ירושלים", "Photo from the article · mynet Jerusalem", "Photo tirée de l'article · mynet Jérusalem"],
  ["צילום מתוך הכתבה · מעריב Sport1", "Photo from the article · Maariv Sport1", "Photo tirée de l'article · Maariv Sport1"],
  ["צילום: שלומי כהן · EMESS רדיו", "Photo: Shlomi Cohen · EMESS Radio", "Photo : Shlomi Cohen · EMESS Radio"],
  ["צילום מתוך הכתבה · ynet", "Photo from the article · ynet", "Photo tirée de l'article · ynet"],
  ["צילום מתוך הכתבה · וואלה מקומי", "Photo from the article · Walla Local", "Photo tirée de l'article · Walla Local"],
  ["צילום מתוך הכתבה · ICE", "Photo from the article · ICE", "Photo tirée de l'article · ICE"],
  // CTA
  ["קראו את הכתבה", "Read the article", "Lire l'article"],
  // Closer
  ["קריאה לפעולה", "Call to action", "Appel à l'action"],
  ["לתיאום ביקור באתר", "To arrange a visit to the venue", "Pour organiser une visite du domaine"],
  ["החגיגה הבאה", "The next celebration", "La prochaine fête"],
  ["אצלכם.", "at your place.", "chez vous."],
  ["חזרה לדף הבית", "Back to homepage", "Retour à l'accueil"],
  // Footer
  ["לדף הבית →", "To homepage →", "Vers l'accueil →"],
  // Card image alts (LRM-stripped keys)
  ["מתחם גאמוס בפארק ישראל, צילום מתוך הכתבה בוואלה בית ועיצוב", "The Gamos estate in Park Israel, a photo from the Walla Home & Design article", "Le domaine GAMOS à Park Israel, photo tirée de l'article de Walla Maison & Design"],
  ["מתחם גאמוס, צילום מתוך הכתבה בmynet ירושלים", "The Gamos estate, a photo from the mynet Jerusalem article", "Le domaine GAMOS, photo tirée de l'article de mynet Jérusalem"],
  ["החגיגה של משפחת בוזגלו במתחם גאמוס, צילום מתוך הכתבה בSport1", "The Buzaglo family's celebration at the Gamos estate, a photo from the Sport1 article", "La célébration de la famille Buzaglo au domaine GAMOS, photo tirée de l'article de Sport1"],
  ["חתונת בתו של מנחם טוקר באולמי גאמוס, צילום: שלומי כהן", "The wedding of Menachem Tucker's daughter at the Gamos halls, photo: Shlomi Cohen", "Le mariage de la fille de Menachem Tucker dans les salles GAMOS, photo : Shlomi Cohen"],
  ["השף אבי ביטון, צילום מתוך הכתבה בynet", "Chef Avi Biton, a photo from the ynet article", "Le chef Avi Biton, photo tirée de l'article de ynet"],
  ["מתחם מעוצב בהשראת דובאי לחתונות ואירועים, צילום מתוך הכתבה בוואלה מקומי", "A Dubai-inspired estate for weddings and events, a photo from the Walla Local article", "Un domaine d'inspiration Dubaï pour mariages et événements, photo tirée de l'article de Walla Local"],
  ["מתחם גאמוס בפארק ישראל, צילום מתוך הכתבה בICE", "The Gamos estate in Park Israel, a photo from the ICE article", "Le domaine GAMOS à Park Israel, photo tirée de l'article de ICE"],
  // Conversion pass (2026-07-13): CTA layer + trust line + bands + hints
  ["תיאום סיור", "Book a Tour", "Réserver une visite"],
  ["תיאום סיור ובדיקת תאריך", "Book a Tour & Check Your Date", "Réserver une visite et vérifier une date"],
  ["דברו איתנו בוואטסאפ", "Chat with Us on WhatsApp", "Écrivez-nous sur WhatsApp"],
  ["עד 1,000 אורחים · 33 סוויטות · בריכה וריזורט", "Up to 1,000 guests · 33 suites · Pool & Resort", "Jusqu'à 1 000 invités · 33 suites · Piscine et resort"],
  ["רוצים לראות את המתחם מקרוב?", "Want to see the estate up close?", "Envie de découvrir le domaine de plus près ?"],
  // Conversion pass (2026-07-13): #why-gamos trust section
  ["למה גאמוס", "Why Gamos", "Pourquoi GAMOS"],
  ["מתחם אירועים וריזורט מול נוף מדבר יהודה", "An Events Estate & Resort Facing the Judean Desert", "Un domaine d'événements et resort face au désert de Judée"],
  ["מתחם האירועים של גאמוס ערוך לסעודה חגיגית מול נוף המדבר הפתוח", "The Gamos events estate set for a festive meal facing the open desert landscape", "Le domaine d'événements GAMOS dressé pour un repas de fête face au paysage désertique ouvert"],
  ["סוויטות אירוח", "Guest Suites", "Suites"],
  ["לבחור בגאמוס הייתה הבחירה הטובה ביותר שיכולנו לעשות! האוכל פצצה! שירות ברמה!", "Choosing Gamos was the best decision we could have made! The food is amazing! Top-level service!", "Choisir GAMOS a été la meilleure décision possible ! La cuisine est incroyable ! Un service de haut niveau !"],
  ["זוהר דורון · חתונה", "Zohar Doron · Wedding", "Zohar Doron · Mariage"],
  ["אוכל מצוין, מקום חדש ונקי, נוף מהמם, ונכונות של הצוות לזרום עם הבקשות שלנו.", "Excellent food, a new and spotless venue, a stunning view, and a team happy to go along with our requests.", "Une cuisine excellente, un lieu neuf et impeccable, une vue superbe, et une équipe prête à s'adapter à nos demandes."],
  ["יעלי סבאג · בר־מצווה", "Yaeli Sabag · Bar Mitzvah", "Yaeli Sabag · Bar-mitsva"],
  ["בואו לראות את המתחם מקרוב — הסיור לא מחייב, הרושם כן.", "Come see the estate up close — the tour is free of obligation; the impression isn't.", "Venez découvrir le domaine de plus près — la visite est sans engagement, l'impression ne l'est pas."],
  // Conversion pass (2026-07-13): interaction-language unification hints
  ["לחצו על תמונה להגדלה", "Tap an image to enlarge", "Appuyez sur une image pour l'agrandir"],
  // Conversion pass (2026-07-13): mobile bottom CTA bar labels
  ["שיחה", "Call", "Appeler"],
  ["וואטסאפ", "WhatsApp", "WhatsApp"],
];

// Validate FIRST: a row missing its French (or English) cell would otherwise
// write `undefined` into fr.json (JSON.stringify drops it), silently shipping the
// Hebrew source for that key. Every row must be [he, en, fr], all non-empty.
const malformed = [];
PAIRS.forEach((row, i) => {
  const ok = Array.isArray(row) && row.length === 3 &&
    row.every((cell) => typeof cell === "string" && cell.trim() !== "");
  if (!ok) malformed.push(`  PAIRS[${i}]: ${JSON.stringify(row)}`);
});
if (malformed.length) {
  console.error(
    `i18n-build: ${malformed.length} malformed row(s) — each must be ` +
    `[he, en, fr] with three non-empty strings:\n${malformed.join("\n")}`
  );
  process.exit(1);
}

const en = {};
const fr = {};
let dupes = 0;
for (const [he, enVal, frVal] of PAIRS) {
  const key = canon(he);
  if (key in en && en[key] !== enVal) dupes++;
  en[key] = enVal;
  fr[key] = frVal;
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "assets", "i18n");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "en.json"), JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(join(outDir, "fr.json"), JSON.stringify(fr, null, 2) + "\n", "utf8");
console.log(`i18n: wrote ${Object.keys(en).length} keys → assets/i18n/en.json, ${Object.keys(fr).length} keys → assets/i18n/fr.json (${PAIRS.length} pairs, ${dupes} conflicting dupes)`);
