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
| Avatars: 8 characters × 6 color themes × 4 directions × (2 walk frames + a bump frame), plus a celebration frame | `src/art/characters.ts` | `characters.png`, `characters.json`, `icons/avatar-*.png` | Codeweald contributors | CC0 1.0 |
| Byte the owl (sprite and 32×32 portrait), villagers, Bugs and firefly (sprites and 16×16 portraits) | `src/art/characters.ts` | `characters.png`, `characters.json`, `portraits/*.png` | Codeweald contributors | CC0 1.0 |
| Item icons (12) | `src/art/items.ts` | `icons/<item>.png` | Codeweald contributors | CC0 1.0 |
| Art preview page | `scripts/make-art.ts` | `preview.html` | Codeweald contributors | CC0 1.0 |
| App icons (Byte, 192 and 512 px) | `scripts/make-art.ts` | `app/icon-192.png`, `app/icon-512.png` | Codeweald contributors | CC0 1.0 |

## Fonts

Fonts are installed from npm (Fontsource) and bundled into the build, so nothing is fetched
from a font CDN at runtime.

| Font | Used for | npm package | Author | License |
|---|---|---|---|---|
| Atkinson Hyperlegible Next | Interface text (default) | `@fontsource/atkinson-hyperlegible-next` 5.3.0 | Braille Institute of America | SIL Open Font License 1.1 |
| Atkinson Hyperlegible Mono | Code | `@fontsource/atkinson-hyperlegible-mono` 5.3.0 | Braille Institute of America | SIL Open Font License 1.1 |
| OpenDyslexic | Optional dyslexia-friendly font | `@fontsource/opendyslexic` 5.3.0 | Abbie Gonzalez | SIL Open Font License 1.1 |

## Code libraries (bundled)

| Library | License |
|---|---|
| Phaser 4.2.1 | MIT |
| Pyodide 314.0.7 (CPython 3.14 and its standard library) | MPL 2.0 (Pyodide); PSF License (CPython) |
| CodeMirror 6 (with its @lezer/highlight tags) | MIT |
| Preact, @preact/signals | MIT |
| idb-keyval | Apache 2.0 |
| Zod (checks imported progress files) | MIT |

## Audio

None yet.
