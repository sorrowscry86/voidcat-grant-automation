#!/usr/bin/env python3
"""Regenerates the VoidCat Grants launcher, adaptive, splash and web icons.

Run from the mobile/ directory:  python3 scripts/generate-icons.py
Keeping this in the repo means the store assets can be rebuilt from source
rather than being opaque binaries.
"""
from PIL import Image, ImageDraw

SIZE = 1024
BG = (11, 18, 32, 255)          # matches theme background / splash colour
GRAD_TOP = (109, 158, 255, 255)  # light accent
GRAD_BOTTOM = (29, 78, 216, 255)  # brand accent


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGBA", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        grad.putpixel(
            (0, y),
            tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(4)),
        )
    return grad.resize((size, size))


def mark_mask(scale=1.0):
    """A bold 'V' chevron with an ascending spark — the VoidCat mark."""
    mask = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(mask)
    cx = SIZE // 2

    half_w = int(185 * scale)
    top = cx - int(182 * scale)
    bottom = cx + int(188 * scale)
    stroke = int(96 * scale)

    d.line([(cx - half_w, top), (cx, bottom)], fill=255, width=stroke, joint="curve")
    d.line([(cx + half_w, top), (cx, bottom)], fill=255, width=stroke, joint="curve")
    for point in ((cx - half_w, top), (cx + half_w, top), (cx, bottom)):
        r = stroke // 2
        d.ellipse([point[0] - r, point[1] - r, point[0] + r, point[1] + r], fill=255)

    # Four-point spark: the "funding secured" accent above the chevron.
    sx, sy, s = cx + int(250 * scale), top - int(130 * scale), int(52 * scale)
    d.polygon(
        [(sx, sy - s), (sx + s * 0.32, sy - s * 0.32), (sx + s, sy),
         (sx + s * 0.32, sy + s * 0.32), (sx, sy + s),
         (sx - s * 0.32, sy + s * 0.32), (sx - s, sy),
         (sx - s * 0.32, sy - s * 0.32)],
        fill=255,
    )
    return mask


def rounded_square(radius_ratio=0.22):
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, SIZE - 1, SIZE - 1], radius=int(SIZE * radius_ratio), fill=255
    )
    return mask


def coloured_mark(scale=1.0):
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    layer.paste(vertical_gradient(SIZE, GRAD_TOP, GRAD_BOTTOM), (0, 0), mark_mask(scale))
    return layer


def save(img, name):
    img.save(f"assets/{name}")
    print(f"  assets/{name}")


print("Generating icons…")

# iOS / store icon: fully opaque, no alpha channel (App Store rejects alpha).
icon = Image.new("RGBA", (SIZE, SIZE), BG)
icon.alpha_composite(coloured_mark(1.06))
save(icon.convert("RGB"), "icon.png")

# Android adaptive icon: foreground art must sit inside the centre ~66% safe zone.
save(coloured_mark(0.86), "android-icon-foreground.png")
save(Image.new("RGBA", (SIZE, SIZE), BG), "android-icon-background.png")

mono = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
mono.paste((255, 255, 255, 255), (0, 0), mark_mask(0.86))
save(mono, "android-icon-monochrome.png")

# Splash art sits on the configured background colour, so keep it transparent.
save(coloured_mark(1.0), "splash-icon.png")

# Web favicon: rounded so it reads as an app tile at 48px.
fav = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
fav.paste(Image.new("RGBA", (SIZE, SIZE), BG), (0, 0), rounded_square())
fav.alpha_composite(coloured_mark(1.06))
save(fav.resize((48, 48), Image.LANCZOS), "favicon.png")

print("Done.")
