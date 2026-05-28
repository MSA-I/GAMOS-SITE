# Agent 01 — Research & Content Lead

**Agent ID:** agent-01
**Role:** Research & Content Lead
**Subagent type:** researcher
**Skills:** deep-research, web-scraper
**Created:** 2026-05-28
**Status:** draft (pending kickoff)

**Inputs (תלויות):**
- Live URL: https://gamos.co.il/
- Read-only access ל-`תמונות לאנימציית האתר/` (לcross-reference)
- Read-only ל-`עיצוב אתר מחודש\` (פרויקט קודם — provisional values בלבד)

**Outputs (deliverables):**
- `PLANS/research/2026-05-28_site-content-map.md` — מפת תוכן מלאה
- `PLANS/research/2026-05-28_full-tab-inventory.md` — **gate משתמש**: רשימת לשוניות
- `PLANS/research/2026-05-28_competitor-audit.md` — 5-7 רפרנסים
- `PLANS/research/2026-05-28_font-identification.md` — זיהוי הפונט מ-PNG + המלצה
- `architecture/asset-inventory.md` — חצי ראשון (מקורות + scrape findings)
- עדכון `CLAUDE.md` §5 (פלטה אמיתית מ-scrape) — בסיוע main agent
- העתקות: logo SVG, OG image ל-`assets/images/brand/`

**Interfaces (חוזה עם סוכנים אחרים):**
- Agent 2 צורך: צבעים, typography references מהאתר החי
- Agent 4 צורך: full-tab-inventory (חתום ע"י משתמש)
- Agent 8 צורך: Hebrew copy verbatim per section

---

## 1. הקשר ומטרה

לפני שאנחנו בונים את האתר, צריך להבין במלואו את האתר החי gamos.co.il:
- מה הלשוניות והתוכן בכל אחת
- מה הפלטה והטיפו האמיתיים
- מה המתחרים עושים טוב יותר
- איזה copy עברי לשמר verbatim

חוסר באחד מהפריטים האלה = אנחנו ממציאים. אסור.

## 2. צעדים

- [ ] **2.1** קריאת `CLAUDE.md` + `architecture/section-order.md` + `architecture/asset-inventory.md`
- [ ] **2.2** הפעלת skill `deep-research` עם prompt: "Comprehensive audit of gamos.co.il for a redesign rebuild"
- [ ] **2.3** scrape של gamos.co.il דרך `web-scraper`:
  - top-nav menu items + URLs
  - footer links
  - sub-pages (about, contact, halls, gallery, ...)
  - copy verbatim per section
  - declared CSS custom properties + computed primary colors
  - all image URLs + alt text
- [ ] **2.4** כתיבת `full-tab-inventory.md` עם טבלה: שם / URL / מיקום במבנה החדש / copy / assets
- [ ] **2.5** **gate משתמש** — שליחת inventory לאישור
- [ ] **2.6** competitor audit (5-7): Apple AirPods Pro page, Bvlgari Hotels, Aman Resorts, Six Senses, gardenia.co.il, herods.co.il, ronit-farm.co.il
- [ ] **2.7** font identification: השוואת `פונט/1.2.png` ("NOMAD") עם תמונות תוצאה ומסקנות
- [ ] **2.8** עדכון `CLAUDE.md` §5 בפלטה האמיתית
- [ ] **2.9** עדכון `architecture/asset-inventory.md` עם scrape findings
- [ ] **2.10** עדכון `findings.md` + `progress.md`

## 3. Done criteria

1. כל ה-deliverables קיימים בנתיבים המדויקים שצוינו.
2. `full-tab-inventory.md` כולל **כל** הלשוניות (top + footer + sub-pages).
3. אישור משתמש על ה-inventory.
4. פלטה ב-`CLAUDE.md` §5 נעולה.
5. font identification מציע 2-3 חלופות עבריות עם justification.

## 4. סיכונים

- **Scraping might be blocked** — gamos.co.il עשוי להחזיר rate-limit או robots.txt. fallback: manual browser inspection.
- **Hebrew encoding issues** — לוודא שה-copy נשמר UTF-8 ללא mojibake.
- **Outdated content** — ייתכן שהאתר החי לא מעודכן; לציין בקובץ אם משהו נראה stale.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
