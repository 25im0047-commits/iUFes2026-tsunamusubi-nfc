# Design reference fonts

The active `*-full.woff2` files include every glyph in the complete official
Google Fonts TTF distributions. They are served locally, without requests
to Google Fonts or another font CDN. `scripts/prepare-fonts.py` converts them
losslessly with FontTools/Brotli and verifies all Japanese characters used in
the TS/TSX source against each font's character map. Emoji and characters
outside the original fonts' coverage still use platform fallbacks; these are
not removed or claimed to be supported by the font.

The older numbered subsets extracted from the design HTML are retained but
are no longer referenced by CSS. They lacked many Japanese characters,
especially in bold text.

- Dela Gothic One: https://github.com/google/fonts/tree/main/ofl/delagothicone
- Zen Maru Gothic: https://github.com/google/fonts/tree/main/ofl/zenmarugothic

Copyright notices and the SIL Open Font License 1.1 are in `OFL.txt`.
