# Agent 10 — QA & Performance

**Agent ID:** agent-10
**Role:** QA & Performance enforcer
**Subagent type:** tester
**Skills:** Lighthouse + axe-core + DevTools
**Created:** 2026-05-28
**Status:** draft (blocked by full integration)

**Inputs:**
- כל הקבצים שכל הסוכנים מ-1..9 ייצרו
- `architecture/performance.md`
- `architecture/rtl-and-a11y.md`

**Outputs:**
- `PLANS/performance/2026-05-28_lighthouse-baseline.md`
- `PLANS/fixes/{date}_<defect>.md` per defect found
- `findings.md` updates

**Interfaces:**
- Reports defects ל-Agents 1..9 לתיקון
- Gates release

## 1. הקשר ומטרה

לבדוק שהאתר עומד בכל הקריטריונים מ-`CLAUDE.md` §11 לפני release.

## 2. צעדים

### 2.1 Performance audit
- [ ] Lighthouse mobile (4G, Moto G4): ≥ 90 בכל ארבעת הצירים
- [ ] Lighthouse desktop: ≥ 95
- [ ] WebPageTest waterfall: poster preloaded, MP4 progressive
- [ ] Asset budget verification (per `architecture/performance.md`)
- [ ] DevTools Performance recording: 60fps scrub בדסקטופ

### 2.2 Accessibility audit
- [ ] axe-core: 0 serious / critical violations
- [ ] Tab-only navigation: כל אינטראקטיב מגיע
- [ ] Focus rings 3px brass נראים
- [ ] Skip-link works
- [ ] VoiceOver (Mac): hero (alt), portals (button labels), sections (landmarks)
- [ ] NVDA (Windows): same
- [ ] Color contrast: כל text ≥ 4.5:1

### 2.3 RTL & Hebrew
- [ ] Layout RTL נכון (Tab order ימין → שמאל)
- [ ] Bidi: מספרים לא נשברים
- [ ] Mirror של icons/arrows כשנדרש
- [ ] Font rendering: Frank Ruhl Libre + Heebo + Playfair מוצגים נכון

### 2.4 Reduced-motion
- [ ] DevTools Rendering → Emulate `prefers-reduced-motion: reduce`
- [ ] Hero scrub כבוי, poster מוצג
- [ ] Reveals → static final state
- [ ] Portal expand → smooth-scroll פשוט

### 2.5 Cross-browser
- [ ] Chrome desktop + Android
- [ ] Firefox desktop
- [ ] Safari macOS + iOS (real iPhone 12+)
- [ ] Edge desktop
- [ ] iOS Safari → fallback path verified

### 2.6 SEO
- [ ] meta tags OK
- [ ] OG image עובד (Facebook debugger)
- [ ] JSON-LD valid (Google Rich Results Test)
- [ ] sitemap.xml + robots.txt (אם נדרש)

### 2.7 Reporting
- [ ] `lighthouse-baseline.md` עם screenshots + numbers
- [ ] לכל defect: `PLANS/fixes/YYYY-MM-DD_<title>.md` עם owner agent
- [ ] עדכון `progress.md`
- [ ] עדכון `findings.md`

## 3. Done criteria

- כל הציונים ≥ targets.
- 0 axe-core violations חמורות.
- iOS fallback מאומת ב-real device.
- כל defects עם owner מוקצה.

## 4. סיכונים

- iOS testing ללא real device — emulation לא מספיקה. לוודא שיש גישה.
- Lighthouse variance בין הרצות — להריץ 3x ולקחת median.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
