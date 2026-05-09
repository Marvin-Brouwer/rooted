# Styling

Rooted apps put CSS in four places, in this order:

1. **Tokens.** CSS custom properties at `:root`. Colours, spacing, type scale, dark-mode overrides. No selectors, no rules.
2. **Theme.** Defaults for plain HTML elements (`p`, `h1`, `button`, `input`). Read tokens. Don't reference component classes.
3. **App shell.** The layout of the page itself: header sticky behaviour, `<main>` width, footer position. Lives in one file.
4. **Components.** Per-component styles, scoped automatically. Lives in the component's `.css` file and is imported via the `styles` field.

Each layer reads from the layer above it. Component CSS uses tokens. Theme CSS uses tokens. The app shell uses both. Component CSS does not re-define theme defaults.

## Tokens

```css
/* src/_styles/tokens.css */
:root {
  --color-bg:    #faf7f2;
  --color-fg:    #1c1c1c;
  --color-accent: #e34;

  --space-xs: 0.25rem;
  --space-s:  0.5rem;
  --space-m:  1rem;
  --space-l:  2rem;

  --radius-s: 4px;
  --radius-m: 8px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1c1c1c;
    --color-fg: #f4f1ec;
  }
}
```

Tokens are the only thing that changes when a designer asks for a colour update. Keep them in one place and reference them everywhere else.

## Theme

```css
/* src/_styles/theme.css */
body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: system-ui, sans-serif;
  margin: 0;
}

h1, h2, h3 {
  font-family: 'Source Serif', serif;
}

button {
  font: inherit;
  cursor: pointer;
  padding: var(--space-s) var(--space-m);
  border-radius: var(--radius-s);
}
```

Theme rules give you sane defaults. They are not specific to any one component.

Both tokens and theme are loaded once at the top of `index.html`, or imported from your app entry. They are not scoped by rooted.

## App shell

The shell is the layout of the page itself.

```css
/* src/application.css */
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

main {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-l) var(--space-l);
}

footer {
  margin-top: auto;
}
```

Keep this file short. Anything specific to a component belongs in the component.

## Component styles

Component CSS is imported and passed to `styles`:

```ts
import styles from './recipe.css'

export const Recipe = component({
  name: 'recipe',
  styles,
  onMount({ append, element }) {
    append(element('h1', { classes: styles.title, textContent: 'Recipe' }))
  },
})
```

Class names are scoped to this component. A `.title` here won't collide with a `.title` in another component.

```css
.title {
  font-size: 1.5rem;
  margin: 0 0 var(--space-s);
}

.title:hover {
  color: var(--color-accent);
}
```

CSS modules give you `styles.title` as a scoped class name.

### How scoping works

The rooted CSS loader plugin assigns each `.css` file a stable ID (a seeded hash of the file path). Every qualified rule selector in the file gets prefixed with `[r="<hash>"]`. At runtime the component's wrapper element has that attribute set, so only its subtree matches.

A `.title` rule in your component becomes `[r="abc123"] .title` in the output. Attribute selectors work in all current browsers.

A plain element selector like `h1 { ... }` is also scoped, so it only affects `h1` elements inside this component. That's usually what you want. If you need a rule to escape the component boundary, use the `:global()` escape hatch:

```css
:global(h1) { /* targets any h1 on the page, not scoped */ }
```

For the gritty details, see [advanced/internals](../advanced/internals.md).

## What does not belong in component CSS

- Token definitions. Use the token layer.
- Defaults for plain elements. Use the theme layer.
- Page-level layout (sticky headers, max-widths). Use the shell.

If you find yourself redefining `font-family` on every component, that's a sign the theme layer is missing it.

## View transitions

Rooted's router can wrap renders in `document.startViewTransition`. Style the transition with the standard `::view-transition-*` pseudo-elements:

```css
@keyframes fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes fade-in  { from { opacity: 0 } to { opacity: 1 } }

:root::view-transition-old(root) { animation: 180ms ease-out both fade-out; }
:root::view-transition-new(root) { animation: 220ms ease-in both fade-in; }

@media (prefers-reduced-motion: reduce) {
  :root::view-transition-old(root),
  :root::view-transition-new(root) {
    animation: none;
  }
}
```

Enable it on the router:

```ts
create(Router, { viewTransition: true })
```

Browsers without `startViewTransition` ignore the option and render without a transition.
