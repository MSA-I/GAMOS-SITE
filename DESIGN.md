---
name: GAMOS
description: אתר תדמית קולנועי למתחם אירועים, גנים וריזורט — האירוע והחופשה במקום אחד
colors:
  brass-engraved: "#CFAE83"
  brass-deep: "#8B6F46"
  brass-glow: "#D4B98A"
  brass-olive: "#857147"
  cocoa: "#534133"
  wine-rose: "#B8576F"
  warm-ivory: "#F5EFE6"
  ivory-warm: "#ECE3D3"
  desert-mist: "#E8DFD3"
  desert-ink: "#1A1410"
  ink-medium: "#2A2A28"
  stone-muted: "#5E5E5B"
typography:
  display:
    fontFamily: "Rubik, Heebo, Arial, sans-serif"
    fontSize: "clamp(3.5rem, 9vw, 8rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Rubik, Heebo, Arial, sans-serif"
    fontSize: "3.052rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Rubik, Heebo, Arial, sans-serif"
    fontSize: "1.953rem"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "Heebo, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 350
    lineHeight: 1.5
  label:
    fontFamily: "Heebo, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.18em"
rounded:
  none: "0"
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "32px"
  lg: "64px"
  xl: "96px"
  section: "128px"
components:
  button-primary:
    textColor: "{colors.desert-ink}"
    rounded: "{rounded.none}"
    padding: "0.6em 0"
  button-primary-hover:
    textColor: "{colors.cocoa}"
  button-secondary:
    textColor: "{colors.cocoa}"
    rounded: "{rounded.none}"
    padding: "0.45em 0"
  button-secondary-hover:
    textColor: "{colors.cocoa}"
  button-glass:
    textColor: "{colors.warm-ivory}"
    rounded: "{rounded.none}"
    padding: "0.45em 0"
  button-glass-hover:
    textColor: "{colors.brass-glow}"
  chip:
    textColor: "{colors.cocoa}"
    rounded: "{rounded.none}"
    padding: "0.45em 0"
---

# Design System: GAMOS

> נגזר מ-`css/tokens.css` (מקור-האמת היחיד, Constitution §10.2) ומ-`css/components/`.
> ערכים כאן הם **תיעוד** — שינוי ערך נעשה בטוקנים, לא כאן. על סתירה — החוקה (`CLAUDE.md`) גוברת.

## 1. Overview

**Creative North Star: "ההזמנה החקוקה"**

האתר הוא הזמנת יוקרה מודפסת בהטבעת-זהב שקמה לחיים: פליז חקוק על שנהב חמים, אותיות
מרווחות שנחקקו במכבש, קווים דקים במקום קופסאות, וצילום קולנועי מלא-מסך במקום איור.
כמו בהזמנה אמיתית — הנייר (השנהב), ההטבעה (הפליז הממורקם) והצילום עושים את הרושם;
הכרום שותק. הדפדוף בהזמנה הוא הגלילה: כוריאוגרפיה איטית ובטוחה (scroll-scrub, pin,
reveal) שמייצרת "וואו — יוקרה קולנועית" בעשר השניות הראשונות.

המערכת דוחה במפורש את מה ש-PRODUCT.md דוחה: הוורוד `#CC3366` והלבן הסטרילי של האתר
הישן, ותבניות אולמות גנריות — קרוסלות סטוק, רשימות-יתרונות עם אייקונים, פופ-אפים
תוקפניים. *Luxury or nothing* (Constitution §1): אלמנט שלא משדר יוקרה — לא נכנס.

**Key Characteristics:**
- RTL-first עברית; logical properties בלבד (§4), מספרים ב-`<bdi>`.
- צילום ווידאו של המתחם נושאים את המסר; טיפוגרפיה ממורקמת מעליהם.
- כרום "מאופק וחקוק": טקסט + קו פליז שצומח — אפס קופסאות, אפס מילויים.
- מקסימום 5 צבעים פעילים בו-זמנית; אקסנט אחד בלבד (§5).
- כל אנימציה מכבדת `prefers-reduced-motion` (מצב סופי סטטי).

## 2. Colors: The Estate Materials Palette

פלטת חומרים פיזיים מעולם המתחם — פליז, קקאו, שנהב, אבן ודיו-מדבר — נעולה ב-Constitution §5.

### Primary
- **פליז חקוק / Engraved Brass** (#CFAE83): צבע המותג החי. קווי ה-CTA הצומחים, הדגשות,
  נקודות ניווט, וטקסט/כותרות על רקע כהה. **דקורציה בלבד** — לעולם לא טקסט קטן או מחוון
  על רקע בהיר (1.83:1, ראה The Brass Decoration Rule). ההטבעה של ההזמנה.
- **פליז עמוק / Deep Brass** (#8B6F46): פסי underline במצב hover/active והטבעת החיצונית של `--focus-ring`. לעולם לא טקסט קטן או צבע שטח.
- **זוהר פליז / Brass Glow** (#D4B98A): הדגשות על רקע כהה (טקסט glass ב-hover).
- **פליז-זית / Olive Brass** (#857147): אקסנט כותרת ההירו ו-eyebrows (v10).

### Secondary
- **קקאו / Cocoa** (#534133): טקסט CTA משני, משטחי עומק חמים (רקעים כהים לסקציות).

### Tertiary
- **ורד-יין / Wine Rose** (#B8576F): אקסנט ה-CTA היחיד — שמור ל-hover של פעולה ראשית
  בלבד. לעולם לא מתחרה בפליז.

### Neutral
- **שנהב חמים / Warm Ivory** (#F5EFE6): משטח הבסיס — "הנייר" של ההזמנה. מחליף לבן טהור.
- **שנהב-חול / Sand Ivory** (#ECE3D3) + **ערפל מדבר / Desert Mist** (#E8DFD3): גוני משטח משניים ו-fade.
- **דיו-מדבר / Desert Ink** (#1A1410): טקסט גוף — שחור-חם. מחליף שחור טהור.
- **אבן עמומה / Muted Stone** (#5E5E5B): טקסט משני בלבד (`--fg-muted`); הגוון הוכהה כדי לעבור AA גם על ivory-warm ו-mist.
- גבולות: שקיפויות דיו (12% / 24%) — לעולם לא אפור שטוח.

### Named Rules
**The Five Voices Rule.** מקסימום 5 צבעים פעילים בכל רגע נתון (§5). צבע שישי = באג.
**The Single Accent Rule.** ורד-היין מופיע אך ורק ב-hover של ה-CTA הראשי. כל שימוש אחר אסור.
**The Brass Decoration Rule (LOCKED 2026-07-21, a11y pass).** פליז (#CFAE83) הוא
דקורציה — קו-תחתון צומח, הדגשה, נקודת ניווט, ורקע/טקסט **על משטח כהה** (8.72:1 על דיו-מדבר).
פליז **לעולם לא** טקסט קטן ולא מחוון (eyebrow, טבעת פוקוס, מצב-פעיל) על משטח בהיר — נמדד
1.83:1, כשל WCAG AA שיטתי. על משטח בהיר: טקסט → **קקאו** (8.46:1); טבעת פוקוס → הטבעת
הדו-גונית `--focus-ring` (gap שנהב + פליז-עמוק); מצב-פעיל על מילוי פליז → **דיו-מדבר** (8.72:1).
**The No Raw Hex Rule.** כל ערך צבע נמשך מ-`css/tokens.css` דרך `var(...)`. hex מוקלד = באג (§10.2).
**The No Gradient Rule.** אין גרדיאנטים אלא אם מוגדרים מתמטית מהטוקנים (סקרימים: `--scrim-strong`/`--scrim-overlay` בלבד).

## 3. Typography

**Display Font:** Rubik — וריאבילי 300–900 (fallback: Heebo, Arial) · עברית + לטינית
**Body Font:** Heebo — וריאבילי 100–900 (fallback: Arial)
**Flourish Fonts:** Cinzel 700 (תוויות EVENTS/RESORT חקוקות), Playfair Display 400/700; בשפות לטיניות (en/fr) ה-display מתחלף ל-**Canela** (serif) אוטומטית.

**Character:** גיאומטרי-הומניסטי מודרני שזורם בעברית בלי לאבד משקל פרימיום. הוקל
חצי-דרגה בכל האתר (350/400/500/600 — 2026-06-15): האוויר הוא היוקרה. הכותרות הגדולות
ממולאות בטקסטורת המותג — הן ההטבעה של ההזמנה.

### Hierarchy
- **Display** (600, clamp(3.5rem, 9vw, 8rem), lh 1.05, -0.02em): כותרת הירו בלבד, לרוב עם מילוי טקסטורה.
- **Headline** (600, 3.052rem, lh 1.2): כותרות סקציה.
- **Title** (500, 1.953rem, lh 1.2): תתי-כותרות, כותרות כרטיסים.
- **Body** (350, 1rem, lh 1.5): טקסט רץ, מקסימום 65–75ch.
- **Label** (500, 0.8125rem, lh 1, tracking 0.18em, UPPERCASE ללטינית בלבד): CTAs, eyebrows, chips. עברית לעולם לא uppercase — שומרת case טבעי עם אותו tracking.

### Named Rules
**The Engraved Tracking Rule.** תוויות ו-CTAs נושאים tracking של 0.18em — תחושת חקיקה. גוף הטקסט לעולם לא.
**The Texture Fill Rule.** מילויי טקסט ממורקמים נמשכים אך ורק מהתיקייה הקנונית (§4.1) דרך הטוקנים `--typo-on-light` (לרקע בהיר) / `--typo-on-dark` (לרקע כהה) ומחלקות `.texture-text*`. המצאת טקסטורה = הפרת חוקה. החלפת מקור מחייבת מדידת luma (§4.1).

## 4. Elevation

**שטוח-אדיטוריאלי.** הכרום — כפתורים, ניווט, שדות, chips — שטוח לחלוטין: אפס צל,
אפס קופסה, אפס blur. עומק מגיע משלושה מקורות בלבד: (א) צל תחת **תמונות גדולות**;
(ב) **סקרימים** טוקניים מעל מדיה לקריאוּת טקסט; (ג) שכבות ה-scroll הקולנועיות (pin,
parallax) שיוצרות עומק תנועתי במקום עומק מצויר.

### Shadow Vocabulary
- **Soft** (`0 8px 24px rgba(26,20,16,0.06)`): ריחוף עדין נדיר למשטחים בהירים.
- **Strong** (`0 24px 60px rgba(26,20,16,0.16)`): הרמה דרמטית — overlays בלבד.
- **Image lift** (`0 30px 80px -40px rgba(26,20,16,0.45)`): כרטיסי תמונה גדולים בלבד.

### Named Rules
**The Image-Only Shadow Rule.** צל מופיע רק תחת מדיה. כפתור או שדה עם צל = הפרת שפה.
**The Token Scrim Rule.** קריאוּת מעל תמונה נפתרת אך ורק ב-`--scrim-strong` / `--scrim-overlay` / `--fg-on-dark-muted` — לעולם לא בגרדיאנט אד-הוק.

## 5. Components

תחושת הליבה: **"מאופק וחקוק"** — טקסט + קו פליז שצומח. `css/components/buttons.css`
היא מערכת ה-CTA הקנונית האחת ("minimal-editorial chrome", 2026-06-15).

### Buttons
- **Shape:** ללא קופסה כלל — `padding-inline: 0`, radius 0 (`--radius-btn: 0`), הטקסט הוא המטרה.
- **Secondary (`.btn`):** טקסט קקאו 13px, tracking 0.18em; קו-תחתון פליז 1.5px צומח מתחילת כיוון הקריאה ב-hover; הטקסט נשאר קקאו כדי לשמור על 8.46:1.
- **Primary (`.btn--filled`):** טקסט דיו-מדבר; קו פליז עבה (2.5px) גלוי במנוחה — העוגן של הפעולה הראשית; מתעבה ל-3.5px ב-hover. גרסת `--primary-lg` ב-15px.
- **On-image (`.btn--glass`):** טקסט שנהב + text-shadow לקריאות; hover ל-brass-glow.
- **Icon (`.btn--icon`):** גליף בלבד, hit-area 44px (WCAG), tint פליז + scale 1.12 ב-hover, בלי קו.
- **Focus:** טבעת דו-גונית `box-shadow: var(--focus-ring)` (gap שנהב + פליז-עמוק) בכל הווריאנטים
  (עברה מ-`outline: 3px brass` ב-a11y pass 2026-07-21 — פליז שטוח נכשל 1.4.11); **Active:** dip של scale 0.98.
- **Hover text:** נשאר **קקאו** (8.46:1) — הקו-הפליז הצומח הוא ה-affordance; לא brass-deep (4.12:1, נכשל ב-13px).

### Chips
- **Style (`.btn--chip`):** תג אדיטוריאלי — 12px, tracking 0.14em, קו-תחתון 1px. בלי רקע, בלי מסגרת.

### Cards / Containers
- **Corner Style:** מדיה ב-radius 8–16px; כרום ב-0.
- **Background:** גוני השנהב בלבד; סקציות כהות על קקאו/דיו-מדבר.
- **Shadow Strategy:** Image lift לתמונות גדולות בלבד (סעיף 4).
- **Hover:** zoom אחיד `scale(1.04)` (`--card-zoom`) על המדיה — לעולם לא על הקופסה.

### Inputs / Fields
- **Style:** מינימלי על שנהב, גבול שקיפות-דיו (12%); radius 4px.
- **Focus:** טבעת דו-גונית (`--focus-ring` — gap שנהב + פליז-עמוק, ≥3:1 על כל משטח); מעל תמונה — טבעת כפולה עם gap (`--focus-ring-offset`).

### Navigation
- קישורים בשפת ה-Label (13px, tracking 0.18em) עם קו-פליז-צומח — אותה גרמטיקה כמו ה-CTAs.
- מוסתר בהירו (`data-hero-mode`), נחשף בגלילה; ניווט-נקודות צדי (side-dot-nav) לאורך הסקציות.
- מובייל: בר CTA תחתון קבוע (טלפון / וואטסאפ / תיאום סיור) + toggle שפה ב-navbar.

### Texture Headline (signature)
כותרת עם `background-clip: text` וטקסטורת המותג (`.texture-text` / `.texture-text--light`)
— חתימת "ההטבעה" של האתר. על רקע בהיר: טקסטורה חומה-כהה; על רקע כהה: קרם-מוזהב. אין
צבע כותרת שטוח בסקציות-חתימה.

## 6. Do's and Don'ts

### Do:
- **Do** למשוך כל ערך ויזואלי מ-`css/tokens.css` — צבע, מרווח, צל, easing, z-index (§10.2).
- **Do** לבנות כל CTA בשפת הקו: טקסט + `::after` פליז שצומח מימין (RTL, `transform-origin: right`).
- **Do** לשמור hit-area של ≥44px לכל אינטראקטיב, גם כשהוויזואל הוא טקסט דק.
- **Do** לתת לצילום לנשום: full-bleed, סקרים טוקניים, טקסט מעל רק כשיש סקרים.
- **Do** לספק מצב `prefers-reduced-motion` לכל אנימציה: מצב סופי סטטי, קווים מופיעים בלי לצמוח.
- **Do** לכתוב RTL-first עם logical properties בלבד; מספרים עטופים `<bdi>`.

### Don't:
- **Don't** ורוד `#CC3366` או כל ניאון — "אתר היכרויות משנות ה-90" (PRODUCT.md). ורד-היין #B8576F הוא התחליף, ורק ב-hover של CTA ראשי.
- **Don't** לבן `#FFFFFF` או שחור `#000000` טהורים — תמיד שנהב חמים ודיו-מדבר.
- **Don't** קופסאות/מסגרות/מילויים/pill ל-CTAs — "NO boxes, NO borders, NO fills, NO pill radius" (החלטת משתמש 2026-06-15).
- **Don't** צל על כרום (כפתור, שדה, nav) — צל שייך לתמונות בלבד.
- **Don't** תבניות אולמות גנריות: קרוסלת סטוק, רשימת "היתרונות שלנו" עם אייקונים, פופ-אפ "השאירו פרטים" (PRODUCT.md anti-references).
- **Don't** uppercase על עברית; אין faux-bold על Canela (`font-synthesis-weight: none`).
- **Don't** טקסטורת טקסט ממקור שאינו התיקייה הקנונית של §4.1, ואף פעם לא ב-url מוקלד — רק דרך הטוקנים.
- **Don't** גרדיאנט דקורטיבי, glassmorphism, או gradient-text — סקרימים טוקניים הם היוצא היחיד.
