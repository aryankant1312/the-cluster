#!/usr/bin/env python3
"""
The streaming-platform marks that sit under a track, as trimmed PNGs.

    npm run build:platform-icons

Spotify is drawn in code and stays that way. These three are not:

    apple-music    supplied at 3840px with transparent corners already. Only
                   needs trimming and resizing; its red ground is part of the
                   mark rather than a card behind it, so nothing is keyed out.

    jiosaavn       supplied as a small teal disc adrift on a 1000x900 white
                   canvas. That white is padding, not artwork, so it is keyed
                   to transparency and the disc cropped to its own bounding
                   box. Used untrimmed the mark would draw at roughly a quarter
                   the size of the others in the same box.

    youtube-music  drawn here. The supplied `app.png` is a generic red
                   play-circle with a pale inner ring, not the YouTube Music
                   mark, and shipping it would put a lookalike beside three
                   real logos. The real mark is a red disc with a white
                   triangle.

WHY PYTHON, IN A NODE REPO. This was written against ffmpeg first, to match
`build-icon-alpha.mjs`. It cannot work: the supplied Apple Music file is
lossless VP8L webp, and ffmpeg 8.0.1's native decoder rejects it outright
("Invalid data found when processing input") with no libwebp decoder registered
to fall back to. Pillow reads it without complaint. The repo already shells out
to ffmpeg for two other asset builds, so an external tool here is an existing
cost rather than a new one — and every output is committed, so nobody who is
not regenerating icons needs Pillow at all.

OUTPUT IS 76px. These draw at 38px beside the Spotify mark, so 76 covers a
retina display exactly with no resampling at paint time.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover - a setup problem, not a code path
    sys.exit("Pillow is required: python -m pip install Pillow")

HERE = Path(__file__).resolve().parent
APP = HERE.parent
SOURCE_DIR = APP / "Image assets"
OUT_DIR = APP / "public" / "images" / "brands"

# Drawn at 38px; 76 is that at 2x, with no resampling on a retina display.
SIZE = 76

# A pixel counts as padding if it is transparent or near-white. The white
# threshold is generous because a white canvas saved as a palette PNG and
# decoded back is rarely exactly 255.
WHITE = 244
ALPHA_FLOOR = 8

# YouTube Music red.
YT_RED = (255, 0, 51, 255)


def content_box(img: Image.Image) -> tuple[int, int, int, int]:
    """The tight box around everything that is not padding.

    `Image.getbbox()` is not enough on its own: it only knows about full
    transparency, and the JioSaavn source is a disc on an *opaque* white field,
    which it would report as the entire canvas.
    """
    pixels = img.load()
    width, height = img.size
    min_x, min_y, max_x, max_y = width, height, -1, -1

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < ALPHA_FLOOR:
                continue
            if r > WHITE and g > WHITE and b > WHITE:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < 0:
        raise SystemExit("the image is entirely padding")
    return (min_x, min_y, max_x + 1, max_y + 1)


def key_white(img: Image.Image) -> Image.Image:
    """Drop a white ground to transparency, leaving the artwork's colours."""
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > WHITE and g > WHITE and b > WHITE:
                pixels[x, y] = (r, g, b, 0)
    return img


def trim_and_scale(source: Path, out: Path, *, white_is_padding: bool) -> None:
    """Trim to content, square up, resize.

    Squaring before the resize is what keeps a non-square mark in proportion
    rather than stretched to fill the box it shares with three others.
    """
    img = Image.open(source).convert("RGBA")
    original = img.size
    box = content_box(img)
    if white_is_padding:
        img = key_white(img)

    cropped = img.crop(box)
    side = max(cropped.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))

    square.resize((SIZE, SIZE), Image.LANCZOS).save(out, "PNG", optimize=True)
    print(
        f"  {out.name} — trimmed {original[0]}x{original[1]} "
        f"to {cropped.width}x{cropped.height}"
    )


def draw_youtube_music(out: Path) -> None:
    """A red disc with a white play triangle.

    Drawn at 8x and resampled down: Pillow's `ellipse` and `polygon` do not
    antialias, so a mark rasterised straight at 76px would have a visibly
    stepped edge beside three marks that arrive smooth. Supersampling is the
    standard way round that and costs nothing at this size.

    The triangle points right and is inset to about a third of the disc, which
    are the proportions of the real mark.
    """
    scale = 8
    n = SIZE * scale
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.ellipse((0, 0, n - 1, n - 1), fill=YT_RED)

    cx = cy = n / 2
    radius = n / 2
    draw.polygon(
        [
            (cx - radius * 0.34, cy - radius * 0.46),
            (cx - radius * 0.34, cy + radius * 0.46),
            (cx + radius * 0.52, cy),
        ],
        fill=(255, 255, 255, 255),
    )

    img.resize((SIZE, SIZE), Image.LANCZOS).save(out, "PNG", optimize=True)
    print(f"  {out.name} — drawn at {SIZE}x{SIZE}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("platform icons:")

    trim_and_scale(
        SOURCE_DIR / "Apple_Music_icon.svg.webp",
        OUT_DIR / "apple-music.png",
        # The red ground is the mark. Keying it would leave a floating note.
        white_is_padding=False,
    )
    trim_and_scale(
        SOURCE_DIR / "jiosaavn-logo-icon.png",
        OUT_DIR / "jiosaavn.png",
        white_is_padding=True,
    )
    draw_youtube_music(OUT_DIR / "youtube-music.png")


if __name__ == "__main__":
    main()
