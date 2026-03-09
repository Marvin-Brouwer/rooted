# Styling

A rooted application uses a two-layer CSS architecture:

1. **`application.theme.css`** — a global stylesheet that is the single source of truth
   for the app's visual language (colors, typography, spacing, base element appearance).
2. **Component `styles`** — per-component CSS files that handle *layout* and *exceptions*
   to the theme for that specific context.

This split means components never have to worry about how a button or heading
looks by default — they only describe *where* their children sit and *when*
something needs to diverge from the theme.

---

## Contents

- [Application theme — `application.theme.css`](#application-theme--applicationthemecss)
- [Component styles](#component-styles)

---

## Application theme — `application.theme.css`

This file owns the visual language of the whole app. Every element that has no
component-specific override will inherit from here.

### What belongs in the theme

**Design tokens** — define the full design vocabulary as CSS custom properties:

```css
/* ── Tokens ─────────────────────────────────────────────────────────────── */
:root {
  /* Color */
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
```

**Color scheme adaptation** — update tokens for dark mode rather than
duplicating rules:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary:    #4d9fff;
    --color-surface:    #1a1a1a;
    --color-on-surface: #f5f5f5;
    --color-border:     #374151;
  }
}
```

**Base element styles** — `body`, headings, `a`, `button`, `input`, etc.
Styled once here, they look correct everywhere without component-level
overrides:

```css
/* ── Base elements ───────────────────────────────────────────────────────── */
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

a { color: var(--color-primary); }

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
```

> [!TIP]
> - **Reference tokens everywhere** — write `var(--color-primary)` not
>   `#0066cc`. A single token change propagates to the whole app.
> - **Layout does not belong here** — flexbox, grid, gap, and padding are
>   specific to how a component arranges its children. Keep the theme file
>   free of layout rules.
> - **Extend, don't fight** — if a component is overriding many theme rules,
>   consider adding a new token or a base rule variant to the theme file
>   rather than fighting it per-component.

### What does NOT belong in the theme

- Layout rules specific to one component (flex direction, grid template areas).
- Anything that needs to be scoped to a subtree.

### Loading the theme

Import it once, at the top of `application.mts`, before any component is
mounted:

```ts
import './application.theme.css'

import { application } from '@rooted/components/application'
// ...
```

---

## Component styles

Each component owns a single `.css` file that sits next to its `.mts` file.
These files are narrow: they describe *how the component lays out its own
children* and *exceptions to the theme* that apply specifically in this context.

### What belongs in component styles

**Layout of the component's children** — flex direction, grid areas, gap, and
padding that are unique to this component:

```css
/* counter.css */
:scope {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
```

**Sizing and positioning of the component itself** — use `:scope` to target the
wrapper element directly:

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
import styles from './card.css'
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
  `1rem`. If you need a new spacing value, add it to the theme.
- Base element appearance already covered by `application.theme.css`.

> [!TIP]
> - **Use `:scope` for the host element** — `:scope` refers to the component's
>   own wrapper. Use it to set display, size, and padding rather than adding a
>   wrapping `<div>` just for layout.
> - **Keep component CSS files small** — if a file is growing large, the
>   component is probably doing too much. Split it into sub-components, each
>   with their own narrow stylesheet.
> - **Avoid deep nesting** — rooted's scoping already adds one level of
>   specificity. Nesting further makes overrides harder. Prefer flat rules with
>   direct child combinators (`> h2`) over deep descendants.
> - **Animate at the component level** — keyframe animations unique to one
>   component belong in its CSS file. Shared timing values
>   (`--duration-normal`) still come from the theme.
