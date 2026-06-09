# Asset Encoding

Commands and tools used to produce the binary assets that ship in `assets/`.
Re-runnable from a clean checkout. Source files are READ-ONLY (Constitution §7).

> **Note (2026-06-01):** Agent 17 normally owns this file. Agent 18 created
> the initial version because Agent 17's pass had not landed when Agent 18's
> task ran. When 17 re-runs the video pipeline, append below — do not delete.

---

## Tools assumed available

| Tool          | Used for                | How we found it on this box |
|---------------|-------------------------|-----------------------------|
| `ffmpeg`      | MP4 + WebM encoding     | bundled with `node-static-ffmpeg` *(blocked — see fallback)* |
| `cwebp`       | WebP image encoding     | bundled with libwebp *(blocked — see fallback)* |
| `python` + `pillow` | image resize / WebP / JPEG | `where python` + `python -c "from PIL import Image"` ✓ |
| `node` + `sharp`    | image resize / WebP / JPEG (alt path) | `where node` + `node -e "require('sharp')"` ✓ |

> **Why pillow / sharp instead of cwebp/ffmpeg?** On this dev box neither
> `cwebp` nor `ffmpeg` is on PATH. Pillow ships with full WebP encoder
> (`features.check('webp')` returned True). For JPG it uses libjpeg-turbo
> with progressive + optimize.

---

## Posters — resort + venue (Agent 18, scaffold scene phase)

**Sources** (paths below are relative to `../GAMOS-DOCS/` — the source library
moved out of GAMOS-SITE on 2026-06-09; see Constitution §7):
- Resort: `תמונות לאנימציית האתר/ריזורט 1/1.png` (3840×2160, 10.4 MB PNG)
- Venue : `תמונות לאנימציית האתר/אולם 3/2.png` (3840×2160, 19 MB PNG)

**Targets:** 1920×1080 (16:9 cover-fit, center crop), WebP + JPG fallback.

**Why these two?**
- Resort `1.png`: cinematic exterior overview of the resort grounds —
  warm desert/garden tones, the wide shot users expect to land on after
  clicking the right-hand portal. Compresses well (97 KB WebP at q=60).
- Venue `2.png`: wide interior with chandeliers + chairs — the most
  recognizable "אולם" shot in the directory. Detail-rich (chandelier
  patterns, chair backs) so it compresses to ~210 KB WebP at q=55, which
  is intentionally above the hero-poster budget. These are scaffolds —
  the real video will replace them and CSS will then load only the
  small video poster.

**Run command** (from project root):

```bash
python << 'PY'
from PIL import Image, ImageOps
import os
ROOT = r"D:\\משה פרוייקטים\\GAMOS-SITE"
DOCS = r"D:\\משה פרוייקטים\\GAMOS-DOCS"  # source library lives here since 2026-06-09
OUT  = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080

JOBS = [
    {"name": "resort", "src": os.path.join(DOCS, "תמונות לאנימציית האתר", "ריזורט 1", "1.png"), "wq": 60, "jq": 65},
    {"name": "venue",  "src": os.path.join(DOCS, "תמונות לאנימציית האתר", "אולם 3", "2.png"), "wq": 55, "jq": 60},
]

for job in JOBS:
    im = Image.open(job["src"])
    if im.mode != "RGB":
        im = im.convert("RGB")
    fitted = ImageOps.fit(im, (W, H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    fitted.save(os.path.join(OUT, f"{job['name']}-poster.webp"), "WEBP", quality=job["wq"], method=6)
    fitted.save(os.path.join(OUT, f"{job['name']}-poster.jpg"),  "JPEG", quality=job["jq"], optimize=True, progressive=True)
PY
```

**Output sizes (bytes):**

| File                              | Size     | Quality |
|-----------------------------------|----------|---------|
| `assets/img/resort-poster.webp`   | 96.6 KB  | q=60    |
| `assets/img/resort-poster.jpg`    | 166.4 KB | q=65    |
| `assets/img/venue-poster.webp`    | 210.9 KB | q=55    |
| `assets/img/venue-poster.jpg`     | 265.7 KB | q=60    |

**Equivalent `cwebp`/`ffmpeg` form** (for when those tools come back):

```bash
# WebP (resort) — paths are relative to ../GAMOS-DOCS/ (source library)
cwebp -q 60 -m 6 -resize 1920 1080 \
  "../GAMOS-DOCS/תמונות לאנימציית האתר/ריזורט 1/1.png" \
  -o assets/img/resort-poster.webp

# JPG (resort)
ffmpeg -y -i "../GAMOS-DOCS/תמונות לאנימציית האתר/ריזורט 1/1.png" \
       -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" \
       -q:v 4 -progressive 1 \
       assets/img/resort-poster.jpg
```

(Replace paths/quality numbers for venue.)

---

## Future video encoding — to be authored by Agent 17

When Agent 17 lands the video pipeline (Hero re-encode, Culinary clip),
append:

- Source path
- ffmpeg command (with `-movflags +faststart`, `-pix_fmt yuv420p`, etc.)
- Output paths (`-1080.mp4`, `-720.mp4`, `-poster.jpg`)
- Final byte sizes

Pattern from existing `hero-master-1080.mp4` (5.9 MB) implies:

```bash
ffmpeg -y -i source.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -preset slow -crf 23 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -an -movflags +faststart \
  assets/video/<scene>-1080.mp4
```

Per Constitution §8: 1080p ≤ 12 MB, 720p ≤ 6 MB, poster JPG ≤ 80 KB.

---

## Culinary scrub clip (Agent 17 — 2026-06-01)

**Source:** `../GAMOS-DOCS/תמונות לאנימציית האתר/קולינריה 4/1.2.mp4`
(3840×2160, HEVC, 60 fps, 15.02 s, ~88 MB).

**Final length:** trimmed to **6 s** (`-t 6`) to match the section's 250 vh
spacer (per `architecture/scroll-video-system.md §4.2`).

**Tooling on this dev box:** no system-wide ffmpeg on PATH; the Apowersoft
bundled binary (2018-vintage but full-featured) was used:

```bash
FFMPEG="/c/Program Files (x86)/Apowersoft/ApowerREC/ffmpeg.exe"
```

**Recipe** (run from project root after copying source to `.tmp/` to escape
the Hebrew-pathed source folder, then deleting the copy):

```bash
SRC=".tmp/culinary-source.mp4"
OUT="assets/video"

# 1) 1080p H.264 — CRF 22, slow preset, +faststart, no audio.
"$FFMPEG" -y -i "$SRC" -t 6 \
  -vf "scale='min(1920,iw)':-2" \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p \
  -movflags +faststart -an \
  "$OUT/culinary-1080.mp4"

# 2) 720p H.264 — CRF 24.
"$FFMPEG" -y -i "$SRC" -t 6 \
  -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -movflags +faststart -an \
  "$OUT/culinary-720.mp4"

# 3) Poster — frame at t=1.5s (skip a black/intro frame at 0), max 1600px
#    wide, JPEG q:v 5 (1 = best, 31 = worst). 80 KB target.
"$FFMPEG" -y -ss 1.5 -i "$SRC" -frames:v 1 \
  -vf "scale='min(1600,iw)':-2" -q:v 5 \
  "$OUT/culinary-poster.jpg"

# Cleanup
rm "$SRC"
```

**Output sizes** (verified 2026-06-01):

| file                                | size      | budget          |
| ----------------------------------- | --------- | --------------- |
| `assets/video/culinary-1080.mp4`    | 1.26 MB   | ≤ 6 MB OK       |
| `assets/video/culinary-720.mp4`     | 0.48 MB   | ≤ 3 MB OK       |
| `assets/video/culinary-poster.jpg`  | 67 KB     | ≤ 80 KB OK      |

---

## Frame extraction (Agent 21 — 2026-06-01, video-to-website skill)

**What:** the Hero scrub and Culinary scrub do not use `<video.currentTime>`
any more. Instead a `<canvas class="…__canvas">` is painted by
`js/canvas-frame-renderer.js` with pre-extracted **30fps WebP** frame
sequences. Migration motivation: iOS Safari `currentTime` scrub is unreliable
(jitter, decoder restarts). Canvas + image draw is deterministic 60fps on
every browser and platform.

**Extraction pipeline:** the bundled Apowersoft `ffmpeg.exe` (2018 vintage)
ships with **no `libwebp` encoder**, so we extract PNG via ffmpeg and
re-encode through Pillow's WebP encoder. Script: `.tmp/extract-frames.py`
(throwaway under `.tmp/`, kept for re-runnability — re-create as needed).

**Per-scene parameters (LOCKED for Hero + Culinary as of 2026-06-01):**

| scene    | source                              | fps | scale  | quality | frames | total size |
|----------|-------------------------------------|-----|--------|---------|--------|------------|
| hero     | `assets/video/hero-master-1080.mp4` | 30  | 1600px | 75      | 528    | ≈ 45 MB    |
| culinary | `assets/video/culinary-1080.mp4`    | 30  | 1600px | 75      | 180    | ≈ 6.5 MB   |

> **Hero size note.** The hero source is 17.58s — **far longer** than the
> 7s the spec assumed. At 30fps the resulting 528-frame sequence is ≈ 45 MB
> even at q=75 + 1600px. This is over the per-scene 6 MB budget but is
> acceptable for now: each WebP is fetched lazily by the renderer's
> two-phase preloader (10 frames eagerly; the rest stream in async at
> `fetchpriority=low`). The user has been informed; a future task may
> trim the hero video to its actual narrative beat (~7s) which would drop
> the frame count to ~210 and fit budget.

**Pure ffmpeg recipe** (when libwebp is on the local ffmpeg — e.g., the user
re-installs a modern ffmpeg). Use this when re-extracting on a clean box:

```bash
ffmpeg -i assets/video/hero-master-1080.mp4 \
  -vf "fps=30,scale=1600:-2" \
  -c:v libwebp -quality 75 -compression_level 6 \
  assets/frames/hero/frame_%04d.webp

ffmpeg -i assets/video/culinary-1080.mp4 \
  -vf "fps=30,scale=1600:-2" \
  -c:v libwebp -quality 75 -compression_level 6 \
  assets/frames/culinary/frame_%04d.webp
```

**Two-pass fallback** (current dev box — Apowersoft ffmpeg, no libwebp):

```bash
FFMPEG="/c/Program Files (x86)/Apowersoft/ApowerREC/ffmpeg.exe"

# Pass 1: PNG extraction
"$FFMPEG" -y -i assets/video/<scene>-1080.mp4 \
  -vf "fps=30,scale=1600:-2" \
  -pix_fmt rgb24 \
  .tmp/frames-<scene>/%04d.png

# Pass 2: PNG -> WebP via Pillow
python -c "
from PIL import Image
import os, json, glob
for p in sorted(glob.glob('.tmp/frames-<scene>/*.png')):
    img = Image.open(p).convert('RGB')
    out = 'assets/frames/<scene>/frame_' + os.path.basename(p).replace('.png','.webp')
    img.save(out, 'WEBP', quality=75, method=6)
"

# Cleanup
rm -rf .tmp/frames-<scene>/
```

**Manifest format** (one per scene, written next to the frames):

```json
{
  "scene": "<id>",
  "frameCount": <N>,
  "frameUrl": "/assets/frames/<id>/frame_{NNNN}.webp",
  "width": 1600,
  "height": 900,
  "sourceVideo": "<id>-1080.mp4",
  "sourceMtime": "<source-mtime ISO>",
  "encoded":     "<extraction-time ISO>",
  "fpsExtracted": 30,
  "scaleWidthPx": 1600,
  "webpQuality": 75
}
```

The `frameUrl` `{NNNN}` token is replaced by `canvas-frame-renderer.js` with
the 1-based 4-digit frame index (`frame_0001.webp` … `frame_0528.webp`).
`fpsExtracted` is read by `hero-video-scrub.js` to compute
`window.gamosHero.duration` (in seconds), which keeps the legacy API
contract semantically equivalent to the old `<video>.duration`.

**Resort + Venue scaffolds.** The Resort and Venue scenes still use the
poster-Ken-Burns mode (no source video has arrived). When their videos do
arrive: extract at 30fps with this same recipe, write a manifest into
`assets/frames/<id>/`, swap `data-scrub-mode="poster-ken-burns"` for
`data-scrub-mode="canvas-frames"` on the section, and replace the
`<picture>` poster fallback's video twin with a `<canvas
class="scroll-scene__canvas" data-manifest-url="...">`. See
`docs/adding-hall-video.md` for the exact field swap.
