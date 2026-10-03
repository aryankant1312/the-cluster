#!/usr/bin/env python3
"""Build the DOTM Services and Shows launchers as transparent animated WebPs.

The supplied MP4s have a white background baked into every frame. A plain
white chroma key also removes white details inside the artwork, so each frame
is segmented by connected region instead: only large white canvas regions
become transparent and the small enclosed details survive.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


APP = Path(__file__).resolve().parent.parent
ICONS = (
    (
        APP / "Image assets" / "delivery-process.mp4",
        APP / "public" / "images" / "dotm" / "services-icon.webp",
    ),
    (
        APP / "Image assets" / "singer.mp4",
        APP / "public" / "images" / "dotm" / "shows-icon.webp",
    ),
)


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def frame_rate(source: Path) -> str:
    result = subprocess.run(
        (
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=r_frame_rate",
            "-of",
            "json",
            str(source),
        ),
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)["streams"][0]["r_frame_rate"]


def clear_connected_white(frame: Path) -> None:
    with Image.open(frame) as source:
        image = source.convert("RGBA")
    pixels = np.asarray(image).copy()
    rgb = pixels[:, :, :3]

    # H.264 turns a nominally white card into a small cloud of near-whites.
    # Label every connected neutral/light region and remove only the large
    # ones: the outer card and the white gaps enclosed by the navy network are
    # thousands of pixels each, while the four white clothing details are
    # roughly 500 pixels and therefore remain part of the icon.
    light = (rgb.min(axis=2) > 225) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 22)
    labels, count = ndimage.label(light)
    sizes = np.bincount(labels.ravel(), minlength=count + 1)
    background = (labels > 0) & (sizes[labels] >= 2_000)
    pixels[background, 3] = 0

    Image.fromarray(pixels, "RGBA").save(frame, optimize=True)


def build(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fps = frame_rate(source)

    with tempfile.TemporaryDirectory(prefix=f"dotm-{source.stem}-") as scratch:
        frames = Path(scratch)
        run(
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            str(source),
            "-vsync",
            "0",
            str(frames / "frame-%04d.png"),
        )

        for frame in sorted(frames.glob("frame-*.png")):
            clear_connected_white(frame)

        run(
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-framerate",
            fps,
            "-i",
            str(frames / "frame-%04d.png"),
            "-loop",
            "0",
            "-c:v",
            "libwebp_anim",
            "-lossless",
            "0",
            "-quality",
            "86",
            "-compression_level",
            "6",
            str(target),
        )

    print(f"{source.name} -> {target.relative_to(APP)} ({target.stat().st_size // 1024} KB)")


def main() -> None:
    for source, target in ICONS:
        build(source, target)


if __name__ == "__main__":
    main()
