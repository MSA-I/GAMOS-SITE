# Agent 03 — Asset Pipeline

**Agent ID:** agent-03
**Role:** Asset Pipeline (video stitching + image optimization)
**Subagent type:** coder
**Skills:** ffmpeg + sharp/cwebp/mozjpeg
**Created:** 2026-05-28
**Status:** draft

**Inputs:**
- READ-ONLY: `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\**`
- 13 Seedance MP4s ב-`ריזורט 1\סרטוני אנימציה\`
- `1.5.mp4` ב-`ריזורט 1\` (portal-loop reference)
- `architecture/asset-inventory.md` (manifest)

**Outputs:**
- `assets/video/hero-master-1080.mp4` (≤ 12 MB)
- `assets/video/hero-master-720.mp4` (≤ 6 MB)
- `assets/video/hero-master.webm` (VP9)
- `assets/video/hero-poster.jpg` (≤ 80 KB)
- `assets/video/portal-loop.mp4` (≤ 2 MB)
- `assets/images/halls/{venue,resort,lounge,rooms}/*.{webp,jpg}` — full+half variants
- `assets/images/culinary/*.{webp,jpg}` — full+half variants
- `architecture/asset-inventory.md` (חצי שני — full manifest table)

**Interfaces:**
- Agent 6 צורך hero-master-* + poster
- Agent 7 צורך portal-loop
- Agent 8 צורך images/halls/**
- Agent 9 צורך images/culinary

## 1. הקשר ומטרה

תפירה של 13 קטעי וידאו לסרטון hero אחד שמתאים ל-scroll-scrub.
אופטימיזציה של כל התמונות לכמה רזולוציות + WebP.

## 2. צעדים

- [ ] **2.1** קריאת `architecture/asset-inventory.md` + `architecture/video-scrub-spec.md`
- [ ] **2.2** ffprobe על 13 הסרטונים — לוודא codec/resolution/fps תואמים
- [ ] **2.3** בנייה של `concat-list.txt` בסדר 1..13
- [ ] **2.4** ffmpeg concat (no re-encode if compatible) → `hero-master-1080.mp4`
- [ ] **2.5** ffmpeg → 720p variant
- [ ] **2.6** ffmpeg → WebM VP9
- [ ] **2.7** ffmpeg → poster JPG (frame 0.5s)
- [ ] **2.8** העתקה + טרים אופציונלי של `1.5.mp4` → `portal-loop.mp4` (≤ 2 MB, אם גדול → re-encode)
- [ ] **2.9** sharp pipeline: לכל hall folder
  - full WebP @1920w (q=82)
  - half WebP @960w (q=80)
  - full JPG @1920w mozjpeg (q=85)
  - half JPG @960w mozjpeg (q=80)
- [ ] **2.10** culinary images באופן זהה
- [ ] **2.11** עדכון `architecture/asset-inventory.md` עם מסלול לכל קובץ + variants
- [ ] **2.12** וידוא שאף קובץ output לא חורג מ-budget
- [ ] **2.13** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- כל ה-deliverables קיימים בנתיבים המדויקים.
- `+faststart` flag חל על כל ה-MP4.
- כל התמונות עם `width × height` ידועים (יוטמע ב-HTML).
- manifest table ב-`asset-inventory.md` שלם.
- כל הקבצים בתוך budget.

## 4. סיכונים

- Codec mismatch בין 13 הסרטונים — צריך re-encode pass יחיד.
- iOS Safari לא תומך ב-VP9 — תמיד צריך MP4 fallback.
- Mozjpeg לא מותקן בסביבה — fallback ל-libjpeg-turbo (slightly larger).
- אם hero MP4 1080p > 12MB אחרי CRF 22 → לרדת ל-CRF 24 או 24fps.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
| 2026-05-28 | run attempt by Agent 03 | 🔴 Blocked — Bash denied in sandbox. Source files inventoried (13 hero MP4s + 1.5.mp4 + 5 image folders confirmed via Glob). Pipeline scripts authored: `.tmp/run-asset-pipeline.ps1`, `.tmp/run-asset-pipeline.sh`, `.tmp/concat-list.txt`. Manifest filled in `architecture/asset-inventory.md` (Half 2). User must run script after installing ffmpeg + Node locally. See `findings.md` Phase-2b section. |
