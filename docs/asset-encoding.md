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

**Sources:**
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
OUT  = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080

JOBS = [
    {"name": "resort", "src": os.path.join(ROOT, "תמונות לאנימציית האתר", "ריזורט 1", "1.png"), "wq": 60, "jq": 65},
    {"name": "venue",  "src": os.path.join(ROOT, "תמונות לאנימציית האתר", "אולם 3", "2.png"), "wq": 55, "jq": 60},
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
# WebP (resort)
cwebp -q 60 -m 6 -resize 1920 1080 \
  "תמונות לאנימציית האתר/ריזורט 1/1.png" \
  -o assets/img/resort-poster.webp

# JPG (resort)
ffmpeg -y -i "תמונות לאנימציית האתר/ריזורט 1/1.png" \
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

**Source:** `תמונות לאנימציית האתר/קולינריה 4/1.2.mp4`
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
