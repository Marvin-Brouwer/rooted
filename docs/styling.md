# Styling

A rooted application's CSS is split into four layers, from most-global to
most-specific:

| Layer | File | Responsibility |
|-------|------|----------------|
| 1 | `index.tokens.css` | CSS custom properties — the full design vocabulary |
| 2 | `index.theme.css` | Base element styles that reference those tokens |
| 3 | `application.css` | Layout of the app shell and top-level wrapper elements |
| 4 | `component-name.css` | Per-component layout and exceptions to the theme |

Components at layer 4 never define colors or typography from scratch — they
reference token values and rely on the base styles established by layers 1–3.

---

## Contents

- [Tokens — `index.tokens.css`](#tokens--indextokenscss)
- [Theme — `index.theme.css`](#theme--indexthemecss)
- [App shell — `application.css`](#app-shell--applicationcss)
- [Component styles](#component-styles)
- [Loading the global files](#loading-the-global-files)

---

## Tokens — `index.tokens.css`

This file contains **only CSS custom properties**. No rules, no selectors
beyond `:root` and the dark-mode media query. It is the single source of truth
for every value in the design vocabulary.

```css
/* ── Color ──────────────────────────────────────────────────────────────── */
:root {
  --color-primary:    #0066cc;
  --color-on-primary: #ffffff;
  --color-surface:    #ffffff;
  --color-on-surface: #1a1a1a;
  --color-border:     #d1d5db;
  --color-error:      #dc2626;

  /* Typography */
  --font-family-base: system-ui, sans-serif;
  --font-size-sm:  0.875rem;
  --font-size-md:  1rem;
  --font-size-lg:  1.25rem;
  --font-size-xl:  1.5rem;
  --font-size-2xl: 2rem;
  --line-height:   1.5;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Shape */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;

  /* Motion */
  --duration-fast:   100ms;
  --duration-normal: 200ms;

  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary:    #4d9fff;
    --color-surface:    #1a1a1a;
    --color-on-surface: #f5f5f5;
    --color-border:     #374151;
  }
}
```

> [!TIP]
> - **Only token definitions live here** — no `color: var(--...)` rules, no
>   layout, nothing else.
> - When adapting for dark mode, override the token values rather than
>   duplicating element rules. Any file that references the token automatically
>   gets the dark variant for free.
> - Adding a new design decision (a new spacing step, a new semantic color)
>   always starts here.

---

## Theme — `index.theme.css`

This file styles **base HTML elements** by referencing the tokens defined in
`index.tokens.css`. It sets the default appearance of the document body,
headings, links, buttons, inputs, and other elements so components never have
to restate them.

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: var(--font-family-base);
  font-size:   var(--font-size-md);
  line-height: var(--line-height);
  color:       var(--color-on-surface);
  background:  var(--color-surface);
  margin: 0;
}

h1 { font-size: var(--font-size-2xl); }
h2 { font-size: var(--font-size-xl);  }
h3 { font-size: var(--font-size-lg);  }

p  { margin: 0 0 var(--space-4); }

a  { color: var(--color-primary); }

button {
  font: inherit;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: var(--color-on-primary);
  transition: opacity var(--duration-fast);
}
button:hover    { opacity: 0.85; }
button:disabled { opacity: 0.4; cursor: not-allowed; }

input, select, textarea {
  font: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}
```

> [!TIP]
> - **No layout rules here** — flexbox, grid, and padding that arrange a
>   specific component's children belong in the component's CSS file, not here.
> - If a component repeatedly overrides the same element rule, consider adding
>   a variant here (e.g. a `.button-ghost` base rule) rather than fighting the
>   theme per-component.
> - This file only ever references `var(--...)` values from
>   `index.tokens.css` — no hard-coded colors or sizes.

---

## App shell — `application.css`

This file handles the **app component itself and its immediate structural
wrappers** — the parts that only exist once on the page. The outermost layout
grid, a top navigation bar: things that are global to the site but are layout
rather than theme.

```css
#app {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100dvh;
}
```

> [!TIP]
> - Only rules that apply to the **single app shell** belong here. As soon as
>   a rule belongs to a reusable component (a card, a dialog, a list) it should
>   live in that component's CSS file instead.
> - This file may reference both tokens and base element styles from the two
>   files above.

---

## Component styles

Each component owns a single `.css` file placed next to its `.mts` file.
These files handle *how the component arranges its own children* and *exceptions
to the theme* that apply only in this context.

### What belongs in component styles

**Layout of the component's children** — flex direction, grid areas, gap, and
padding unique to this component:

```css
/* counter.css */
:scope {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
```

**Sizing and positioning of the component itself** — use `:scope` to target the
wrapper element directly rather than adding a wrapping `<div>`:

```css
/* sidebar.css */
:scope {
  width: 240px;
  flex-shrink: 0;
  padding: var(--space-4);
}
```

**Contextual exceptions** — when a standard element needs to behave differently
*inside this particular component*:

```css
/* card.css */
:scope {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

/* Exception: headings inside a card have no top margin */
h2, h3 { margin-top: 0; }

/* Exception: full-width submit button at the bottom of the card */
button[type="submit"] {
  width: 100%;
  margin-top: auto;
}
```

**Animations unique to this component:**

```css
/* toast.css */
:scope {
  animation: slide-in var(--duration-normal) ease-out;
}

@keyframes slide-in {
  from { transform: translateY(-1rem); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
```

Pair the CSS file with its component:

```ts
import styles from './card.css?inline'
import { component } from '@rooted/components'

export const Card = component({
  name: 'card',
  styles,
  onMount({ append }) {
    append('h2', { textContent: 'Card title' })
    append('p',  { textContent: 'Card body' })
  },
})
```

### What does NOT belong in component styles

- Redefining token values — reference `var(--space-4)` rather than duplicating
  `1rem`. New values go in `index.tokens.css`.
- Base element appearance already covered by `index.theme.css`.
- App-shell layout already covered by `application.css`.

> [!TIP]
> - **Use `:scope` for the host element** — `:scope` refers to the component's
>   own wrapper. Use it to set display, size, and padding rather than adding a
>   wrapping `<div>` just for layout.
> - **Keep component CSS files small** — if a file is growing large, the
>   component is probably doing too much. Split it into sub-components, each
>   with their own narrow stylesheet.
> - **Avoid deep nesting** — rooted's scoping already adds one level of
>   specificity. Nesting further makes overrides harder. Prefer flat selectors
>   with direct child combinators (`> h2`) over deep descendants.
> - **Animate at the component level** — keyframe animations unique to one
>   component belong in its CSS file. Shared timing values (`--duration-normal`)
>   come from `index.tokens.css`.

---

## Loading the global files

Layers 1 and 2 are plain CSS files that live at the project root alongside
`index.html`. Link them directly in the `<head>`, in layer order, so they are
parsed before any JavaScript runs:

```html
<link rel="stylesheet" href="/index.tokens.css" />
<link rel="stylesheet" href="/index.theme.css" />
```

Layer 3 (`application.css`) is scoped to the application component and loaded
inline like any other component stylesheet:

```ts
import styles from './application.css?inline'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'

export const Application = component({
  name: 'my-application',
  styles,
  onMount({ append, create }) {
    // ...
  },
})

application(Application)
```

Linking layers 1 and 2 from HTML ensures tokens and base element styles are
available as soon as the browser starts rendering, with no dependency on the
JavaScript bundle.
