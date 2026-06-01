# 👥 agent-plans/ — תוכניות לפי בעלות

> **חוק.** כל סוכן ב-N-Agent Team חייב לכתוב את התוכנית שלו כאן **לפני** שהוא
> רץ קוד. הקובץ הזה משלים את `PLANS/` (שמאורגן לפי נושא): כאן הארגון הוא לפי
> **בעלות** — מי עושה מה.

**מצב נוכחי (2026-06-01):**
התיקייה ריקה כעת. כל 14 התוכניות של הגלים 1-5 (agent-01..12, 20, 23) **בוצעו ונמחקו**
לאחר השלמתן. כל ההיסטוריה זמינה ב-`git log` + `STATUS.md`.

תוכניות עתידיות לא-מוקצות עדיין נמצאות תחת [`PLANS/next-steps/`](../PLANS/next-steps/).

---

## 1. הסוכנים שכבר רצו ונסגרו (היסטורי)

| # | Agent | Wave | תוצרים |
|---|-------|------|--------|
| 01 | Research & Content Lead | 1 | `PLANS/research/{site-content-map, full-tab-inventory, competitor-audit, font-identification}.md` |
| 02 | Brand & Typography | 1 | `architecture/tokens.md`, `css/tokens.css`, 8 WOFF2 fonts |
| 03 | Asset Pipeline | 1 | hero-master MP4 + halls images (הוחלף ב-Wave 5 ב-canvas frames) |
| 04 | HTML / Structure | 1 | `index.html` + `js/main.js` shell |
| 05 | CSS Tokens & Layout | 1 | `css/{base, layout, utilities}.css` |
| 06 | Hero Video-Scrub | 1 | `js/hero-video-scrub.js` + `css/sections/hero.css` |
| 07 | Portal-Bubbles | 1 | `js/portals.js` + `css/sections/portals.css` |
| 08 | Hall Sections | 1 | 5 stylesheets — venue/resort/lounge/rooms/culinary |
| 09 | Motion (static) | 1 | `js/{reveals, accordions, slider}.js` + 3 motion stylesheets |
| 10 | QA & Performance | 1 | Lighthouse baseline + 13 defect tickets (כולם נסגרו) |
| 11 | Typography Research | 3 | Bodoni Moda 900 + texture-fill spec |
| 12 | Hero Spec V2 | 3 | 5-stage scroll timeline (0→8→22→88→100%) |
| 20 | Static-Sections Choreographer | 4 | 11 reveal patterns + marquee transition |
| 23 | Phase D Interactivity Coder | D | `js/{contact-form, site-nav, slider}.js` overlay nav + WhatsApp form |

---

## 2. קונבנציית שמות קבצים (לסוכנים עתידיים)

```
agent-NN_<role-kebab>__YYYY-MM-DD_<task-kebab>.md
```

דוגמאות:
- `agent-25_video-encoder__2026-06-15_resort-venue-pipeline.md`
- `agent-26_browser-qa-runner__2026-06-20_lighthouse-final.md`

NN = 24+ (1-23 כבר שומשו). role-kebab = הרול שלו במילה אחת/שתיים.
המופרד `__` (שני קווים תחתונים) מסמן את המעבר בין הזהות (קבועה) למשימה (משתנה).

---

## 3. תבנית קובץ סוכן (חובה)

```markdown
# Agent NN — <Role> — <Task title>

**Agent ID:** agent-NN
**Role:** <שם תפקיד>
**Subagent type:** <researcher | coder | frontend-design specialist | tester | ...>
**Skills:** <comma-separated list>
**Created:** YYYY-MM-DD
**Status:** draft | in-progress | done

**Inputs (תלויות):**
- <קובץ/פלט מסוכן N — מה צריך כדי להתחיל>

**Outputs (deliverables):**
- <קובץ/פלט קונקרטי שיווצר>

**Interfaces (חוזה עם סוכנים אחרים):**
- <מה הסוכן הזה חושף — שמות פונקציות, CSS variables, קבצים>

---

## 1. הקשר ומטרה

## 2. צעדים
- [ ] צעד 1 — קובץ ספציפי, פעולה ספציפית
- [ ] צעד 2 — ...

## 3. Done criteria
מה צריך להתקיים כדי שהמשימה תיחשב גמורה?

## 4. סיכונים
מה יכול להישבר? תלוי במה?

## 5. Log
| Date       | Action                                | Result |
|------------|---------------------------------------|--------|
| YYYY-MM-DD | התחיל                                  |        |
```

---

## 4. עקרונות

- **תוכנית לפני קוד.** סוכן שלא כתב — לא רץ.
- **חוזה ברור.** כל סוכן מגדיר את ה-Interface שלו (מה הוא חושף לאחרים).
- **תלויות מתועדות.** כל סוכן מציין מה הוא צריך כדי להתחיל.
- **Log תוך כדי עבודה.** עדכון ה-Log table בכל פעולה משמעותית.
- **מסיים → מסמן `done`** + מעדכן את `STATUS.md` בשורש (סקציה רלוונטית).
- **לאחר השלמה מלאה** → ניתן למחוק את הקובץ (ההיסטוריה נשמרת ב-git).
