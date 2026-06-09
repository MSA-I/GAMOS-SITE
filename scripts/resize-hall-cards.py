"""
Resize the 12 hall card source images (6 oasis + 6 lumina) into 1440x900
center-cropped PNGs that match the rest of the screenshot set.

Source: D:\\משה פרוייקטים\\GAMOS-DOCS\\תמונות לאנימציית האתר\\השראות\\תמונות מרחפות\\
        (READ-ONLY per CLAUDE.md §7)
Out:    D:\\GAMOS-screenshots-tmp\\18..29-{oasis,lumina}-N.png
"""

from PIL import Image
import os, sys

SRC = r"D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\השראות\תמונות מרחפות"
OUT = r"D:\GAMOS-screenshots-tmp"

# Pick 6 from each (alphabetical by filename so it's deterministic).
# אולם has 10 files, ריזורט has 6.
OASIS_PICK  = ["2.png", "4.png", "5.png", "6.png", "7.png", "9.png"]
LUMINA_PICK = ["10.png", "14.png", "15.jpg", "17.png", "4.1.png", "5.png"]

W, H = 1440, 900

def resize_to_canvas(src_path, dest_path):
    img = Image.open(src_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    sw, sh = img.size
    src_ratio  = sw / sh
    targ_ratio = W / H
    if src_ratio > targ_ratio:
        # source is wider — crop sides
        new_h = sh
        new_w = int(sh * targ_ratio)
        x0 = (sw - new_w) // 2
        img = img.crop((x0, 0, x0 + new_w, sh))
    else:
        # source is taller — crop top/bottom
        new_w = sw
        new_h = int(sw / targ_ratio)
        y0 = (sh - new_h) // 2
        img = img.crop((0, y0, sw, y0 + new_h))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(dest_path, "PNG", optimize=True)
    return os.path.getsize(dest_path)

def main():
    os.makedirs(OUT, exist_ok=True)

    counter = 18
    for i, name in enumerate(OASIS_PICK, 1):
        src = os.path.join(SRC, "אולם", name)
        if not os.path.exists(src):
            print(f"MISSING oasis: {src}", file=sys.stderr); continue
        dest = os.path.join(OUT, f"{counter:02d}-oasis-{i:02d}.png")
        sz = resize_to_canvas(src, dest)
        print(f"  → {os.path.basename(dest)} ({sz//1024}KB)  [from {name}]")
        counter += 1

    for i, name in enumerate(LUMINA_PICK, 1):
        src = os.path.join(SRC, "ריזורט", name)
        if not os.path.exists(src):
            print(f"MISSING lumina: {src}", file=sys.stderr); continue
        dest = os.path.join(OUT, f"{counter:02d}-lumina-{i:02d}.png")
        sz = resize_to_canvas(src, dest)
        print(f"  → {os.path.basename(dest)} ({sz//1024}KB)  [from {name}]")
        counter += 1

    print("\nDone.")

if __name__ == "__main__":
    main()
