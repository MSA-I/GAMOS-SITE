# 👥 agent-plans/ — תוכניות לפי בעלות

> **חוק.** כל סוכן ב-10-Agent Team חייב לכתוב את התוכנית שלו כאן **לפני** שהוא
> רץ קוד. הקובץ הזה משלים את `PLANS/` (שמאורגן לפי נושא): כאן הארגון הוא לפי
> **בעלות** — מי עושה מה.

---

## 1. עשרת הסוכנים

| # | Agent | Subagent type | Skills | תיאור קצר |
|---|---|---|---|---|
| 01 | Research & Content Lead       | researcher           | deep-research, web-scraper          | חילוץ תוכן + sitemap + competitor audit |
| 02 | Brand & Typography            | frontend-design      | frontend-design                     | פונטים, צבעים, tokens |
| 03 | Asset Pipeline                | coder                | (ffmpeg + sharp build-time)         | תפירת hero, אופטימיזציית תמונות |
| 04 | HTML / Structure              | backend-dev          | (semantic HTML)                     | index.html + RTL + ARIA + JSON-LD |
| 05 | CSS Tokens & Layout           | frontend-design      | frontend-design                     | base/layout/utilities |
| 06 | Hero Video-Scrub Engineer     | coder                | video-to-website                    | GSAP + ScrollTrigger + iOS fallback |
| 07 | Portal-Bubbles Engineer       | coder                | weblove-motion                      | שתי בועות + click-routing |
| 08 | Hall Sections Engineer        | frontend-design      | frontend-design                     | אולם / ריזורט / lounge / rooms / culinary |
| 09 | Motion Engineer (static)      | coder                | weblove-motion + frontend-design    | reveals + accordions + sliders |
| 10 | QA & Performance              | tester               | (Lighthouse + axe-core)             | בדיקה מקצה לקצה |

---

## 2. קונבנציית שמות קבצים

```
agent-NN_<role-kebab>__YYYY-MM-DD_<task-kebab>.md
```

דוגמאות:
- `agent-01_research-content__2026-05-28_initial-scrape.md`
- `agent-06_hero-scrub__2026-05-28_initial-binding.md`
- `agent-07_portals__2026-05-28_bubble-reveal-and-click.md`

NN = 01..10. role-kebab = הרול שלו במילה אחת/שתיים.
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
- <מה הסוכן הזה חושף לסוכנים אחרים — שמות פונקציות, CSS variables, קבצים>

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
- **מסיים → מסמן `done`** ומעדכן `progress.md` בשורש.
