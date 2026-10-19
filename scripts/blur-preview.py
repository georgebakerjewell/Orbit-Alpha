# Blurs the lower half of the report preview image, so the site shows a teaser, not the whole page.
# Usage: python3 scripts/blur-preview.py public/downloads/space-stocks-2026-preview.png
import sys
from PIL import Image, ImageFilter, ImageDraw
path = sys.argv[1]
im = Image.open(path).convert("RGB")
w, h = im.size
cut = int(h * 0.42)
low = im.crop((0, cut, w, h)).filter(ImageFilter.GaussianBlur(9))
im.paste(low, (0, cut))
# A soft fade over the join so the blur starts smoothly.
fade = Image.new("L", (w, 60))
for y in range(60):
    ImageDraw.Draw(fade).line([(0, y), (w, y)], fill=int(255 * y / 60))
im.paste(im.crop((0, cut - 60, w, cut)).filter(ImageFilter.GaussianBlur(9)), (0, cut - 60), fade)
im.save(path, optimize=True)
print(f"blurred {path} below {cut}px")
