# Branding tooling

Generates the branding assets in `docs/branding/` that are built from code rather than drawn. See the [style guide](../../docs/branding/style-guide.md) for what they are and how they're meant to be used.

## Commands

### `pnpm branding banners`

Writes `banner.svg` (the README banner), `social-card.svg` and `social-card.png` (the GitHub social preview).

To change the code shown in them, edit [`src/banners/code-example.mts`](./src/banners/code-example.mts) and run the command again. Sizes live at the top of `src/banners/banner.mts` and `src/banners/social-card.mts`, colours in `src/banners/palette.mts`.

GitHub doesn't read the social preview from the repository. After regenerating it, upload `social-card.png` again under Settings, General, Social preview.

## How it works

The wordmark (Inter Display Black, from `inter-ui`) and the code (JetBrains Mono, from `@fontsource/jetbrains-mono`) are turned into outlines with `fontkit`, so the SVGs look the same wherever they're shown and don't need any font installed. Each character of the code is defined once and placed with `<use>`. `sharp` renders the PNG from the same SVG.

The syntax colouring in `src/banners/highlight.mts` is a handful of regular expressions that are good enough for the example, not a TypeScript tokenizer. If you change the example and something comes out the wrong colour, that's the place to look.
