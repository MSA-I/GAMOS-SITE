# Agent 02 — Brand & Typography

**Agent ID:** agent-02
**Role:** Brand & Typography
**Subagent type:** frontend-design specialist
**Skills:** frontend-design
**Created:** 2026-05-28
**Status:** draft (pending Agent 1)

**Inputs:**
- `PLANS/research/2026-05-28_font-identification.md` (Agent 1)
- פלטה אמיתית מ-`CLAUDE.md` §5 (לאחר עדכון Agent 1)
- `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\פונט\1.2.png` (רפרנס)

**Outputs:**
- `architecture/tokens.md` (LOCK)
- `css/tokens.css` (implementation)
- `assets/fonts/*.woff2` (subset Hebrew + Latin Basic + numerals)

**Interfaces:**
- Agent 5 צורך את `tokens.css` מותקן
- Agents 6, 7, 8, 9 משתמשים ב-CSS variables של tokens

## 1. הקשר ומטרה

לבחור משולש פונטים (Hebrew display + Hebrew body + Latin display) שתואם
לסגנון "NOMAD" שבתמונת הרפרנס + לעקרונות יוקרה של הפרויקט. לקבע tokens
שכל הסוכנים אחרים יצרכו.

## 2. צעדים

- [ ] **2.1** קריאת `font-identification.md` של Agent 1
- [ ] **2.2** הורדת WOFF2 מ-Google Fonts:
  - Frank Ruhl Libre (400/500/700)
  - Heebo (400/500/600)
  - Playfair Display (400/700)
- [ ] **2.3** subsetting עם `glyphhanger` או `pyftsubset`:
  - Hebrew range
  - Latin Basic + numerals
  - punctuation
- [ ] **2.4** מיקום ב-`assets/fonts/` עם naming clear
- [ ] **2.5** עדכון `architecture/tokens.md` (lock)
- [ ] **2.6** יצירת `css/tokens.css` עם כל ה-CSS custom properties
- [ ] **2.7** הוספת `@font-face` rules ב-`tokens.css` או `base.css`
- [ ] **2.8** smoke test: דף HTML זמני שמציג את כל המשולש על טקסט עברי + לטיני
- [ ] **2.9** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- כל ה-WOFF2 קיימים, סך ≤ 200KB.
- `font-display: swap` חובה בכל `@font-face`.
- `tokens.css` מכיל colors, type scale, spacing, radii, motion, z-index — הכל במבנה `architecture/tokens.md`.

## 4. סיכונים

- Hebrew subsetting פגום — חסרים תווים → לבדוק עם נקסט פסקה עברי מלא.
- Font size visual mismatch בין עברית ולטינית — Heebo נוטה להיות "קטן" יותר; ייתכן `font-size-adjust`.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
