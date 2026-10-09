"""Convert official, complete TTF files to WOFF2 without removing glyphs.

Usage: python scripts/prepare-fonts.py /path/to/downloaded-font-directory
Requires fonttools and brotli. Input names are listed below.
"""
import re
import subprocess
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
fonts = [
    ("iufes-dela-full.ttf", "dela-gothic-one-400-full.woff2"),
    ("iufes-zen-500-full.ttf", "zen-maru-gothic-500-full.woff2"),
    ("iufes-zen-700-full.ttf", "zen-maru-gothic-700-full.woff2"),
    ("iufes-zen-900-full.ttf", "zen-maru-gothic-900-full.woff2"),
]
text = subprocess.check_output(["rg", "--no-filename", "--glob", "*.tsx", "--glob", "*.ts", ".", "src"], cwd=root, text=True)
characters = set(re.findall(r"[\u3040-\u30ff\u3400-\u9fff]", text))
for input_name, output_name in fonts:
    font = TTFont(source / input_name)
    cmap = font.getBestCmap()
    missing = sorted(char for char in characters if ord(char) not in cmap)
    if missing:
        raise RuntimeError(f"{input_name}: missing Japanese characters: {''.join(missing)}")
    font.flavor = "woff2"
    target = root / "public" / "fonts" / output_name
    font.save(target)
    converted = TTFont(target)
    assert converted.getBestCmap() == cmap, "Conversion must preserve every character"
    print(f"{output_name}: {len(cmap)} characters; {len(characters)} source Japanese characters covered; {target.stat().st_size} bytes")
