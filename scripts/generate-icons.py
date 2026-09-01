#!/usr/bin/env python3
"""
Renders the Closewatch mark to PNG.

public/favicon.svg is the source of truth and covers every modern browser.
These raster files exist only for the places that will not take an SVG:
Safari, older browsers, and the iOS home screen.

It draws from the same numbers as src/components/brand-mark.tsx rather than
converting the SVG, because SVG converters routinely fill a stroked path: the
ring is a `fill="none"` circle with a dash array, and a converter that ignores
either turns the C into a solid blob.

    python3 scripts/generate-icons.py
"""

from PIL import Image, ImageDraw

# The 32-unit viewBox from the component, and the light-mode pairing. iOS shows
# the icon on the owner's wallpaper with no theme signal, so it takes the
# primary presentation: ink tile, bright brass mark.
VIEW = 32
TILE = "#1a1815"
MARK = "#c08a2e"
RADIUS, RING_R, STROKE = 8.5, 9.0, 3.0
DOT = (22.99, 10.34, 2.7)
GAP_DEG = 78  # opening in the upper right, matching the SVG's dash array

SS = 4  # supersample, then downscale for antialiasing


def render(size: int, rounded: bool) -> Image.Image:
    px = size * SS
    k = px / VIEW
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=RADIUS * k, fill=TILE)
    else:
        # iOS applies its own corner mask, so a pre-rounded icon would be
        # rounded twice and sit inside a visible square.
        d.rectangle([0, 0, px - 1, px - 1], fill=TILE)

    c, r, w = px / 2, RING_R * k, STROKE * k
    # PIL strokes *inward* from the bounding box, so the box has to be grown by
    # half the stroke for the ring's centreline to land on r. Without this the
    # arc sits inside the caps and they read as separate blobs.
    rb = r + w / 2
    box = [c - rb, c - rb, c + rb, c + rb]
    end = 360 - GAP_DEG
    d.arc(box, start=0, end=end, fill=MARK, width=round(w))

    # PIL has no line caps, so the arc's two ends get a disc each.
    from math import cos, radians, sin

    for angle in (0, end):
        ex, ey = c + r * cos(radians(angle)), c + r * sin(radians(angle))
        d.ellipse([ex - w / 2, ey - w / 2, ex + w / 2, ey + w / 2], fill=MARK)

    dx, dy, dr = (v * k for v in DOT)
    d.ellipse([dx - dr, dy - dr, dx + dr, dy + dr], fill=MARK)

    return img.resize((size, size), Image.LANCZOS)


for name, size, rounded in [
    ("public/favicon-32.png", 32, True),
    ("public/favicon-180.png", 180, True),
    ("public/apple-touch-icon.png", 180, False),
    ("public/android-chrome-512x512.png", 512, True),
]:
    render(size, rounded).save(name)
    print("wrote", name)
