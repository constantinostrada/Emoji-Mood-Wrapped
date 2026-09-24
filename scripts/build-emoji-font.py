#!/usr/bin/env python3
"""
Builds the share card's emoji font: Twemoji (COLRv0) with every color glyph
also reachable through its own Private Use Area code point.

Why: browsers split some emoji ZWJ sequences before shaping (Chrome breaks
🤦🏽‍♀️, 🏳️‍🌈 and ❤️‍🔥 at the VS16 even though the font's own ligature table
handles them), so the card would show two emoji instead of one. Addressing
each glyph by a single PUA character removes shaping from the picture: the
same sequence becomes the same glyph in every browser.

Outputs, in public/fonts/:
  twemoji-pua-<version>.woff2  the font, with the extra cmap entries
  twemoji-pua-<version>.txt    one sequence per line, line N is U+F0000+N;
                               code points in hex joined by "-", VS16 removed

Usage (needs `pip install fonttools brotli`):
  python3 scripts/build-emoji-font.py scripts/vendor/twemoji-colr-15.0.3.woff2
"""

import re
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

PUA_START = 0xF0000
OUT_DIR = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
VS16 = 'fe0f'


def main(src: str) -> None:
    src_path = Path(src)
    version = re.search(r'(\d+\.\d+\.\d+)', src_path.name).group(1)
    font = TTFont(src_path)

    glyphs = sorted(font['COLR'].ColorLayers)
    keys: list[str] = []
    mapping: dict[int, str] = {}
    seen: set[str] = set()
    for name in glyphs:
        cps = [cp for cp in name[1:].split('_') if cp != VS16]
        key = '-'.join(cps)
        # A fully-qualified and an unqualified name can collapse to one key;
        # the first one wins, they are the same picture.
        if key in seen:
            continue
        seen.add(key)
        mapping[PUA_START + len(keys)] = name
        keys.append(key)

    for table in font['cmap'].tables:
        if table.isUnicode() and table.format == 12:
            table.cmap.update(mapping)

    out_font = OUT_DIR / f'twemoji-pua-{version}.woff2'
    out_keys = OUT_DIR / f'twemoji-pua-{version}.txt'
    font.flavor = 'woff2'
    font.save(out_font)
    out_keys.write_text('\n'.join(keys) + '\n')
    print(f'{len(keys)} glyphs → {out_font.name}, {out_keys.name}')


if __name__ == '__main__':
    main(sys.argv[1])
