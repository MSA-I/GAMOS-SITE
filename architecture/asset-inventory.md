# Asset Inventory

> מאסטר manifest של כל הassets בפרויקט. מקורות → יעדים → variants → owner.

**Status:** Half 1 = פלט של Agent 1 (scrape gamos.co.il + audit מקומי).
            Half 2 = פלט של Agent 3 (asset pipeline).

---

## Source Locations (READ-ONLY)

### תיקיית מקור עיקרית
`D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\`

```
תמונות לאנימציית האתר/
├─ ריזורט 1/                   919 MB
│  ├─ סרטוני אנימציה/          13 × Seedance MP4 (1_V1..13_V1)
│  ├─ לייטרום/                 18 PNG ערוכים (resort scenes)
│  ├─ אופציה אולם מעל/         4 JPG references
│  ├─ 1.5.mp4                   ← רפרנס לבועות פורטל
│  └─ פרומפטים לסרטוני אנימציה.txt (תיעוד)
├─ אולם 3/                     334 MB — 15+ PNG
├─ קולינריה 4/                 149 MB — 11 JPG + 1.2.mp4 (84MB)
├─ חדרי נופש 2/                57 MB — 5 JPG
├─ LAUNGE/                     39 MB — 5 JPG
└─ פונט/                       28 MB — PNG references (NOT actual fonts)
```

### Live source
`https://gamos.co.il/` — Agent 1 scrape.

---

## Destination Layout (`assets/`)

```
assets/
├─ video/
│  ├─ hero-master-1080.mp4       ← Agent 3 (תפור מ-13)
│  ├─ hero-master-720.mp4        ← Agent 3 (variant)
│  ├─ hero-master.webm           ← Agent 3 (variant)
│  ├─ hero-poster.jpg            ← Agent 3 (LCP candidate)
│  └─ portal-loop.mp4            ← Agent 3 (port מ-1.5.mp4)
├─ images/
│  ├─ halls/
│  │  ├─ venue/                  ← Agent 3 (אולם 3 → optimized)
│  │  │  ├─ 01.full.webp 1920w
│  │  │  ├─ 01.half.webp 960w
│  │  │  ├─ 01.full.jpg          (fallback)
│  │  │  └─ 01.half.jpg
│  │  ├─ resort/                 ← Agent 3 (ריזורט 1/לייטרום → optimized)
│  │  ├─ lounge/                 ← Agent 3 (LAUNGE → optimized)
│  │  └─ rooms/                  ← Agent 3 (חדרי נופש 2 → optimized)
│  ├─ culinary/                  ← Agent 3 (קולינריה 4 → optimized, gallery only)
│  └─ brand/                     ← Agent 1 scrape (logo, og, social)
├─ fonts/                        ← Agent 2 (Frank Ruhl Libre + Heebo + Playfair WOFF2)
└─ icons/                        ← inline SVG sprite (Agent 2 / 4)
```

---

## Manifest Table (TBD — to be filled by Agents 1 + 3)

| ID            | Source path                                      | Dest path                                | Variants            | Owner   | Status |
|---------------|--------------------------------------------------|------------------------------------------|---------------------|---------|--------|
| hero-master   | תמונות לאנימציית האתר/ריזורט 1/סרטוני אנימציה/{1..13}_V1.mp4 | assets/video/hero-master-1080.mp4       | 1080/720/webm/poster| Agent 3 | TODO   |
| portal-loop   | תמונות לאנימציית האתר/ריזורט 1/1.5.mp4           | assets/video/portal-loop.mp4             | mp4                 | Agent 3 | TODO   |
| venue-imgs    | תמונות לאנימציית האתר/אולם 3/                    | assets/images/halls/venue/               | full/half + WebP/JPG| Agent 3 | TODO   |
| resort-imgs   | תמונות לאנימציית האתר/ריזורט 1/לייטרום/          | assets/images/halls/resort/              | full/half + WebP/JPG| Agent 3 | TODO   |
| lounge-imgs   | תמונות לאנימציית האתר/LAUNGE/                    | assets/images/halls/lounge/              | full/half + WebP/JPG| Agent 3 | TODO   |
| rooms-imgs    | תמונות לאנימציית האתר/חדרי נופש 2/               | assets/images/halls/rooms/               | full/half + WebP/JPG| Agent 3 | TODO   |
| culinary-imgs | תמונות לאנימציית האתר/קולינריה 4/ (JPG בלבד)     | assets/images/culinary/                  | full/half + WebP/JPG| Agent 3 | TODO   |
| logo          | scrape gamos.co.il                              | assets/images/brand/logo.svg             | SVG primary         | Agent 1 | TODO   |
| og-image      | scrape gamos.co.il                              | assets/images/brand/og.jpg               | 1200x630 social     | Agent 1 | TODO   |
| fonts-he-disp | Google Fonts                                     | assets/fonts/frank-ruhl-libre-{400,500,700}.woff2 | subset Hebrew | Agent 2 | TODO   |
| fonts-he-body | Google Fonts                                     | assets/fonts/heebo-{400,500,600}.woff2  | subset Hebrew       | Agent 2 | TODO   |
| fonts-en-disp | Google Fonts                                     | assets/fonts/playfair-display-{400,700}.woff2 | subset Latin Basic | Agent 2 | TODO   |

---

## Asset Pipeline Commands (Agent 3 reference)

### ffmpeg — concat 13 videos
```bash
# בנה concat-list.txt:
# file '1_V1.mp4'
# file '2_V1.mp4'
# ...
# file '13_V1.mp4'

ffmpeg -f concat -safe 0 -i concat-list.txt \
  -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-1080.mp4
```

### ffmpeg — 720p variant
```bash
ffmpeg -i hero-master-1080.mp4 -vf scale=-2:720 \
  -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-720.mp4
```

### ffmpeg — WebM VP9
```bash
ffmpeg -i hero-master-1080.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -row-mt 1 -threads 8 -an \
  hero-master.webm
```

### ffmpeg — poster
```bash
ffmpeg -ss 0.5 -i hero-master-1080.mp4 -vframes 1 -q:v 2 hero-poster.jpg
```

### sharp — image optimization (Node.js)
```js
import sharp from "sharp";

await Promise.all([
  sharp(input).resize(1920).webp({ quality: 82 }).toFile(out("full.webp")),
  sharp(input).resize(960).webp({ quality: 80 }).toFile(out("half.webp")),
  sharp(input).resize(1920).jpeg({ quality: 85, mozjpeg: true }).toFile(out("full.jpg")),
  sharp(input).resize(960).jpeg({ quality: 80, mozjpeg: true }).toFile(out("half.jpg"))
]);
```

---

## Filled by Agent 01 (2026-05-28)

### Brand colors (real, from live site DOM + Firecrawl extract — see `BRANDING.JSON` source in `D:\משה פרוייקטים\עיצוב אתר מחודש\Scrape\`)

```
--brass         #CFAE83   /* live primary — buttons, brand accent, halls hover */
--cocoa         #534133   /* live secondary — heading on cream, deep border */
--accent-rose   #B8576F   /* replacement for live's #CC3366 (90s pink) */
--ivory         #F5EFE6   /* surface — replaces live #FFFFFF medical white */
--ink-deep      #1A1410   /* body text — replaces live #000000 */
--mist          #E8DFD3   /* surface tint */
--brass-deep    #8B6F46   /* hover/active state */
```

(See `CLAUDE.md` §5 — LOCKED 2026-05-28 by Agent 01.)

### Logo + brand image source URLs (Agent 3 will download → optimize → save)

| ID | Live URL | Local destination | Format target |
|----|----------|-------------------|---------------|
| logo | `https://gamos.co.il/wp-content/uploads/2023/06/%D7%9C%D7%95%D7%92%D7%95-%D7%91%D7%A6%D7%91%D7%A2-%D7%90%D7%97%D7%A8-003-02-e1687092028602.png` (2116×1317 PNG) | `assets/images/brand/logo.png` + `logo.webp` (+ `logo.svg` if vectorized later) | PNG primary + WebP variant |
| favicon | `https://gamos.co.il/wp-content/uploads/2023/06/cropped-%D7%9C%D7%95%D7%92%D7%95-%D7%91%D7%A6%D7%91%D7%A2-%D7%90%D7%97%D7%A8-003-02-e1687092028602-32x32.png` | `assets/images/brand/favicon-32.png` + `favicon.ico` (multi-size) | PNG + ICO |
| og | `https://gamos.co.il/wp-content/uploads/2023/09/Untitled-design-2023-09-12T104720.238-e1694504897130.png` (this is the GAMOS EVENTS hall logo at 413×477) | `assets/images/brand/og.jpg` (1200×630 generated) | JPEG mozjpeg q85 |
| logo-events | `https://gamos.co.il/wp-content/uploads/2023/10/cropped-Untitled-design-2023-09-12T105300.017-e1697362701352.png` | `assets/images/brand/logo-events.png` | PNG + WebP |
| logo-resort | `https://gamos.co.il/wp-content/uploads/2023/10/Untitled-design-2023-09-10T144152.854-e1697362755185.png` | `assets/images/brand/logo-resort.png` | PNG + WebP |

> ⚠️ Bash/curl/WebFetch were denied during the Agent 1 research session — binary downloads were deferred to Agent 3 in Phase 2b. URLs above are recorded as authoritative source. (Phase 2b completed; `findings.md` was removed in 2026-06-01 cleanup, see CLAUDE.md §12.)

### Existing live-site media NOT already in local folders (Agent 3 fetch list)

| URL | Used in live | Notes |
|-----|---------|-------|
| `https://gamos.co.il/wp-content/uploads/2024/12/Gamos-V7-Glazer-Productions.mp4` | live hero loop | reference only — we tile our own 13-clip hero |
| `https://gamos.co.il/wp-content/uploads/2024/12/Glazer1254097-1-1.mov` | live secondary video (about-section) | reference; can pull a 5s clip if needed |
| `https://gamos.co.il/wp-content/uploads/2024/12/ec4of70-scaled.jpg` | hall card 1 background | substitutable with `אולם 3/` images |
| `https://gamos.co.il/wp-content/uploads/2024/12/ec132of240-scaled.jpg` | hall card 2 background | substitutable with `ריזורט 1/לייטרום/` images |
| `https://gamos.co.il/wp-content/uploads/2025/06/KARELA-15-scaled.jpg` | culinary section image | substitutable with `קולינריה 4/KARELA-*.jpg` (locally available) |

### Contact info (verbatim from live footer)

| Channel | Value | Notes |
|---------|-------|-------|
| Phone 1 | `077-9972343` (`tel:0779972343`) | primary |
| Phone 2 | `077-8036482` (`tel:0778036482`) | secondary |
| WhatsApp | `https://wa.me/9725` | ⚠️ **broken on live — only 4 digits.** Must verify with user before launch. Likely should be `+972-XX-XXXXXXX` E.164 format. |
| Email | `office@gamos.co.il` (`mailto:office@gamos.co.il`) | |
| Address | `די זהב 7, פארק ישראל מעלה אדומים` | |
| Waze | `https://ul.waze.com/ul?preview_venue_id=23134526.231607403.655613&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location` | preview venue id `23134526.231607403.655613` |

### Social media

| Network | URL |
|---------|-----|
| Facebook | `https://www.facebook.com/Pavilionevetns` |
| Instagram | `https://www.instagram.com/gamos__event/` |

> Live site has typo "וואסטפ" (should be "וואטסאפ"). We fix this in rebuild copy.

### Brand metadata

- **Site title:** `גאמוס - אולם וגן אירועים >>`
- **OG title:** `גאמוס - אולם וגן אירועים >>`
- **OG site_name:** `גאמוס אירועים`
- **OG description:** "גאמוס-אירועים חווית אירועים חדשה בישראל גאמוס הוא קומפלקס אירועים יחודי עצום בגודלו…"
- **Brand tagline (canonical):** `חווית אירועים חדשה בישראל`
- **Live HTML:** `<html lang="he-IL" dir="rtl">`.
- **Locale alternate:** `fr_FR` (live exposes a French alternate but no actual content). Skip in rebuild unless requested.
- **CMS (live):** WordPress 6.9.4 + Elementor 3.35.5. We rebuild as vanilla HTML/CSS/JS (Constitution §2).

---

## Half 2 — Agent 03 Manifest (filled 2026-05-28)

> **Status:** Source files identified and counted. Output directories planned.
> Build was gated on shell access to run ffmpeg + sharp at the time this was authored.
> (Build executed and completed; pipeline now lives in `scripts/encode-{frames,images}.mjs`
> + npm scripts. `findings.md` referenced earlier was removed in 2026-06-01 cleanup.)

### Naming convention

- **Videos:** kebab-case, fixed names (no index).
- **Images:** zero-padded numeric index per folder, with variant suffix:
  - `NN.full.webp` — 1920w, q=82
  - `NN.half.webp` — 960w,  q=80
  - `NN.full.jpg`  — 1920w, mozjpeg q=85
  - `NN.half.jpg`  — 960w,  mozjpeg q=80
- **Order rule:** alphanumeric sort of source filename → ascending index.
  Re-runs are stable as long as source folders don't change.

### Detailed manifest — Videos

| Output                            | Source                                                   | Codec / Specs                          | Budget   |
|-----------------------------------|----------------------------------------------------------|----------------------------------------|----------|
| `assets/video/hero-master-1080.mp4` | concat 13× `ריזורט 1/סרטוני אנימציה/{1..13}_V1.mp4`      | H.264 CRF 22, yuv420p, +faststart, -an | ≤ 12 MB  |
| `assets/video/hero-master-720.mp4`  | derived from 1080                                        | H.264 CRF 23, scale=-2:720             | ≤ 6 MB   |
| `assets/video/hero-master.webm`     | derived from 1080                                        | VP9 CRF 32, row-mt 1                   | (free)   |
| `assets/video/hero-poster.jpg`      | derived from 1080 @ 0.5s                                 | JPEG q=4, 1920w → fallback 1600w q5    | ≤ 80 KB  |
| `assets/video/portal-loop.mp4`      | `ריזורט 1/1.5.mp4`                                       | copy if ≤ 2 MB; else trim 4s + 720p    | ≤ 2 MB   |

### Detailed manifest — Images

#### `assets/images/halls/venue/` (from `אולם 3/` top-level only)

| Idx | Source filename             | Outputs (×4 variants) |
|-----|------------------------------|------------------------|
| 01  | `1.png`                      | 01.{full,half}.{webp,jpg} |
| 02  | `2.png`                      | 02.{full,half}.{webp,jpg} |
| 03  | `3.png`                      | 03.{full,half}.{webp,jpg} |
| 04  | `4.png`                      | 04.{full,half}.{webp,jpg} |
| 05  | `5.png`                      | 05.{full,half}.{webp,jpg} |
| 06  | `6.png`                      | 06.{full,half}.{webp,jpg} |
| 07  | `7.png`                      | 07.{full,half}.{webp,jpg} |
| 08  | `7.1.png`                    | 08.{full,half}.{webp,jpg} |
| 09  | `8.png`                      | 09.{full,half}.{webp,jpg} |
| 10  | `9.png`                      | 10.{full,half}.{webp,jpg} |
| 11  | `10.png`                     | 11.{full,half}.{webp,jpg} |
| 12  | `11.png`                     | 12.{full,half}.{webp,jpg} |
| 13  | `12.jpg`                     | 13.{full,half}.{webp,jpg} |
| 14  | `13.jpg`                     | 14.{full,half}.{webp,jpg} |
| 15  | `14.png`                     | 15.{full,half}.{webp,jpg} |
| 16  | `15.png`                     | 16.{full,half}.{webp,jpg} |

> Note: `אולם 3/פנימי-אולי/` (7 JPGs) **excluded** in current pipeline (top-level only).
> Index numbers above are illustrative — actual indexing follows `Get-ChildItem` sort
> which is filename-lexical. Will be confirmed at first run.

#### `assets/images/halls/resort/` (from `ריזורט 1/לייטרום/`)

17 PNGs (`2.png` .. `18.png`) → indexes `01` .. `17`, each with 4 variants.

#### `assets/images/halls/lounge/` (from `LAUNGE/`)

| Idx | Source filename            |
|-----|------------------------------|
| 01  | `ec(5of240).jpg`             |
| 02  | `ec(7of240).jpg`             |
| 03  | `ec(8of240).jpg`             |
| 04  | `ec(162of240).jpg`           |
| 05  | `ec(169of240).jpg`           |

#### `assets/images/halls/rooms/` (from `חדרי נופש 2/`)

11 JPGs (5× `20240809_*.jpg`, 1× `IMG-20240815-WA0014.jpg`, 5× `ec(*of240).jpg`)
→ indexes `01` .. `11`, each with 4 variants.

#### `assets/images/culinary/` (from `קולינריה 4/`, **JPG only**)

13 JPGs `KARELA-*.jpg` → indexes `01` .. `13`, each with 4 variants.
**Excluded:** `1.png`, `1.1.png`, `1.2.png` (rendered design references, not photos), `1.2.mp4` (per spec).

### Run-status tracker (update after pipeline executes)

| ID            | Output path                              | Run | Size | Notes |
|---------------|------------------------------------------|-----|------|-------|
| hero-1080     | `assets/video/hero-master-1080.mp4`      | ⏸️  | —    | gated on ffmpeg |
| hero-720      | `assets/video/hero-master-720.mp4`       | ⏸️  | —    |       |
| hero-webm     | `assets/video/hero-master.webm`          | ⏸️  | —    |       |
| hero-poster   | `assets/video/hero-poster.jpg`           | ⏸️  | —    |       |
| portal-loop   | `assets/video/portal-loop.mp4`           | ⏸️  | —    |       |
| venue-imgs    | `assets/images/halls/venue/*` (×16 sources × 4 variants = 64 files) | ⏸️ | — | |
| resort-imgs   | `assets/images/halls/resort/*` (×17 × 4 = 68 files) | ⏸️ | —   |       |
| lounge-imgs   | `assets/images/halls/lounge/*` (×5 × 4 = 20 files)  | ⏸️ | —   |       |
| rooms-imgs    | `assets/images/halls/rooms/*` (×11 × 4 = 44 files)  | ⏸️ | —   |       |
| culinary-imgs | `assets/images/culinary/*` (×13 × 4 = 52 files)     | ⏸️ | —   |       |

**Totals (planned):** 5 videos + 248 image files.

### Pipeline scripts (canonical)

- **PowerShell:** `.tmp/run-asset-pipeline.ps1`
- **Bash:**       `.tmp/run-asset-pipeline.sh`
- **Concat list:** `.tmp/concat-list.txt`

The scripts are the single source of truth for re-encoding parameters.
Any `ffmpeg` flag tuning happens there, **not** by hand-editing per file.
