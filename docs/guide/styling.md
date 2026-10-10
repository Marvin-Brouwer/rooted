# Styling

Rooted apps put CSS in four places, in this order:

1. **Tokens.** `index.tokens.css`. Design values only: colours, spacing, type scale, dark-mode overrides, as CSS custom properties on `:root`. No other rules.
2. **Theme.** `index.theme.css`. Everything that's global to the app: fonts, defaults for plain HTML elements, the root element the app mounts inside, thematic styles. Reads tokens, doesn't reference component classes.
3. **App shell.** `src/application.css`. Layout of the application component's own children: header sticky behaviour, `<main>` width, footer position. Scoped like any component stylesheet.
4. **Components.** Per-component styles, scoped automatically. Lives in the component's `.css` file and is imported via the `styles` field.

Each layer reads from the layer above it. Component CSS uses tokens. Theme CSS uses tokens. The app shell uses both. Component CSS does not re-define theme defaults.

Tokens and theme are linked from `index.html`, so they load with the page, before any JavaScript runs. Keeping them apart means a colour or spacing change only touches the tokens, and the theme never hard-codes a value.

## Tokens

```css
/* index.tokens.css */
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
/* index.theme.css */
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

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
```

Theme rules give you sane defaults. They are not specific to any one component.

`#app` is the element from `index.html` the app mounts inside. It sits outside every component, so it's styled here rather than in a component's scoped CSS.

Link both from `index.html`:

```html
<link rel="stylesheet" href="/index.tokens.css" />
<link rel="stylesheet" href="/index.theme.css" />
```

Don't import them from code. Rooted's CSS loader turns every `.css` import into a scoped component stylesheet, so the rules would only match inside one component, and the file isn't added to the page unless a component passes it to `styles`.

## App shell

The shell is the layout of the application component's own children: the sticky header, the width of `<main>`, where the footer sits. It's the application component's stylesheet, scoped like any other. App-global rules, like the root element or fonts, go in the theme.

```css
/* src/application.css */
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
    append(
      element('h1', {
        classes: styles.title,
        textContent: 'Recipe',
      })
    )
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

For classes that depend on state, use `cssClass` and `cssClasses` rather than string concatenation. See [conditional classes](./components.md#conditional-classes) in the components guide.

### How scoping works

The rooted CSS loader plugin assigns each `.css` file a stable ID (a seeded hash of the file path). Every qualified rule selector in the file gets prefixed with `[r="<hash>"]`. At runtime the component's wrapper element has that attribute set, so only its subtree matches.

A `.title` rule in your component becomes `[r="abc123"] .title` in the output. Attribute selectors work in all current browsers.

A plain element selector like `h1 { ... }` is also scoped, so it only affects `h1` elements inside this component. That's usually what you want. If you need a rule to escape the component boundary, use the `:global()` escape hatch:

```css
:global(h1) { /* targets any h1 on the page, not scoped */ }
```

It's meant for the odd selector inside a component. Rules that are global to the app belong in `index.theme.css`.

For the gritty details, see [advanced/internals](../advanced/internals.md).

## What does not belong in component CSS

- Token definitions. Use the token layer.
- Defaults for plain elements, fonts and other app-global styles. Use the theme layer.
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
create(Router, {
  viewTransition: true
})
```

Browsers without `startViewTransition` ignore the option and render without a transition.
