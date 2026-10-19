# Assets and Licenses

Every asset that ships with Codeweald is listed here, with its author and license.
Only original or CC0-licensed art and audio are allowed, plus open-licensed fonts. No
copyrighted characters, franchises or recognizable game IP.

## Art

All art is **original, created for Codeweald as code in `src/art/`**, and dedicated to the
public domain under **[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)**. Each
sprite is written as text (one character per pixel). `scripts/make-art.ts` renders the
PNG files at build time into `public/assets/art/`, which is not committed.

| Category | Source | Generated files | Author | License |
|---|---|---|---|---|
| Palette | `src/art/palette.ts` | (used by all art) | Codeweald contributors | CC0 1.0 |
| Tiles: overworld ground, buildings, props and quest-stage tiles (31 tiles) | `src/art/tiles.ts` | `tiles.png`, `tiles.json` | Codeweald contributors | CC0 1.0 |
| Avatars: 8 characters × 6 color themes × 4 directions × 2 walk frames | `src/art/characters.ts` | `characters.png`, `characters.json`, `icons/avatar-*.png` | Codeweald contributors | CC0 1.0 |
| Byte the owl (sprite and 32×32 portrait), villagers, Bugs and firefly | `src/art/characters.ts` | `characters.png`, `characters.json`, `portraits/byte-*.png` | Codeweald contributors | CC0 1.0 |
| Item icons (12) | `src/art/items.ts` | `icons/<item>.png` | Codeweald contributors | CC0 1.0 |
| Art preview page | `scripts/make-art.ts` | `preview.html` | Codeweald contributors | CC0 1.0 |

## Fonts

No fonts are bundled yet. Each font will be listed here when it is added, with its source and
license (e.g. SIL Open Font License 1.1).

## Audio

None yet.
