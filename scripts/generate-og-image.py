#!/usr/bin/env python3
"""
Renders scripts/og-image.html to public/og.png, the 1200x630 social card.

Chrome does the drawing because the card uses the site's own webfonts, and the
alternative is a PIL layout in whatever face happens to be installed, which
looks like a different company. It renders at 2x and downscales, the same
supersampling trick generate-icons.py uses, because Threads and LinkedIn show
this thing at a third of its size and thin brass text falls apart otherwise.

Headless Chrome captures the page and then declines to exit, so this waits for
the PNG to appear and stop growing and then terminates it. Waiting on the
process instead hangs for minutes.

    python3 scripts/generate-og-image.py

Rerun it after editing scripts/og-image.html, and commit the PNG: the deploy
uploads public/ as static assets and does not run this.
"""

import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image

W, H, SS = 1200, 630, 2

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "og-image.html"
OUT = ROOT / "public" / "og.png"

CHROMES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    shutil.which("google-chrome") or "",
    shutil.which("chromium") or "",
]

chrome = next((c for c in CHROMES if c and Path(c).exists()), None)
if not chrome:
    sys.exit("No Chrome found. Install Chrome or edit CHROMES in this script.")

with tempfile.TemporaryDirectory() as tmp:
    shot = Path(tmp) / "og@2x.png"
    chrome_proc = subprocess.Popen(
        [
            chrome,
            "--headless",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            f"--user-data-dir={tmp}/profile",
            f"--window-size={W},{H}",
            f"--force-device-scale-factor={SS}",
            f"--screenshot={shot}",
            SOURCE.as_uri(),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Headless Chrome writes the PNG and then sits there rather than exiting,
    # so waiting on the process means waiting forever. Wait on the file: it
    # appears once the page has painted, and once its size stops moving the
    # write is finished. Then take the browser out.
    deadline = time.time() + 90
    stable_since, last_size = None, -1
    try:
        while time.time() < deadline:
            size = shot.stat().st_size if shot.exists() else -1
            if size > 0 and size == last_size:
                if stable_since is None:
                    stable_since = time.time()
                elif time.time() - stable_since > 0.6:
                    break
            else:
                stable_since = None
            last_size = size
            time.sleep(0.2)
        else:
            sys.exit("Chrome never produced a screenshot. Try opening "
                     f"{SOURCE} in a browser to see what it is doing.")
    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            chrome_proc.kill()

    img = Image.open(shot).convert("RGB")
    if img.size != (W * SS, H * SS):
        print(f"note: chrome returned {img.size}, expected {(W * SS, H * SS)}")
    img.resize((W, H), Image.LANCZOS).save(OUT, optimize=True)

print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
