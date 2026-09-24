# Share card fonts

Self-hosted so the share card never depends on a third-party CDN or on the
fonts installed on the viewer's device. Loaded by
`app/_components/share/card-fonts.ts`.

| File | Source | License |
| --- | --- | --- |
| `baloo-2-*.woff2` | Baloo 2 by Ek Type, via `@fontsource/baloo-2@5.3.0` | SIL OFL 1.1 (`LICENSE-baloo-2.txt`) |
| `twemoji-pua-15.0.3.woff2` + `.txt` | Built by `scripts/build-emoji-font.py` from `scripts/vendor/twemoji-colr-15.0.3.woff2` (Twemoji compiled to COLRv0 by mozilla/twemoji-colr, via `twemoji-colr-font@15.0.3`) | Font: SIL OFL 1.1 (`LICENSE-twemoji.txt`). Artwork: Twemoji © Twitter, Inc. and other contributors, CC-BY 4.0 |

The `.txt` lists one emoji sequence per line; line N is drawn by U+F0000+N in
the font. Rebuild both together if the source font changes.
