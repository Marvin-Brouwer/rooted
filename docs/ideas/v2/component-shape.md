# Proposal: the v2 component shape

One example of what a v2 component could look like, condensed from the [component sketches](./components.md). This is a proposal to react to, not a decision. Props in particular haven't been discussed yet, so that part is a set of options rather than an answer.

## The example

```typescript
import { component, option, property } from '@rooted/components'

import styles from './score-row.css'

export const ScoreRow = component({
	name: 'score-row',
	styles,

	// Set once, when the component is created
	label: option<string>(),
	// Can change after creation, see "Props" below
	score: property<number | undefined>(undefined),

	mount({ render, element, on, after, label, score }) {

		// Only in the browser, never during SSR or SSG
		on('component', 'mounted', () => {
			after(2000, () => render(scoreView(score.value, false)))
		})

		on(score, 'updated', ({ value }) => {
			render(scoreView(value, true))
		})

		// Runs everywhere, and is what the server renders
		return render(scoreView(score.value, false))

		function scoreView(value: number | undefined, changed: boolean) {
			return [
				element('th', { children: label }),
				element('td', {
					classes: [styles.score, changed && styles.changed],
					children: value === undefined ? '-' : String(value),
				}),
			]
		}
	},
})
```

Using it:

```typescript
const row = ScoreRow({ label: 'Full house', score: undefined })

// later, from the parent
row.score = 25
```

## What this shows

- **`mount` returns what to render.** That return value is what SSR and SSG output. Anything browser-only goes in the `mounted` event.
- **One `render`.** It diffs against the current DOM, so `scoreView` doesn't have to know whether it's the first render or the tenth.
- **Helpers clean up through the signal.** `after` is a `setTimeout` that's cancelled on unmount, and `on` listeners are removed the same way.
- **No re-render you didn't ask for.** Changing `score` fires `updated`, and the component decides what to do. That keeps v1's "not reactive by default".
- **No wrapper in the way.** If the [host element](./plan.md#2-the-host-element) work lands, `score-row` could render as a `<tr>` itself, which is the [table records](../../learnings/table-records.md) case.

## Props

This is the part that needs a discussion. A component needs:

- Options that are set once, when the component is created. Some required, some optional.
- Properties a parent can change later.

### Option A: helpers on the definition

What the example uses. `option<T>()` and `property<T>(initial)` sit next to `name` and `mount`, and the types come from them.

- Good: it reads as one object, and the types are inferred.
- Bad: definition keys and prop names share one namespace, so a prop can't be called `name`, `styles` or `mount`. And `property()` hands `mount` a wrapper (`score.value`) rather than the value itself.

### Option B: a typed generic

```typescript
export const ScoreRow = component<{ label: string }, { score: number | undefined }>({
	name: 'score-row',
	mount({ options, properties }) {
		// ...
	},
})
```

- Good: no namespace clash, and options and properties are visibly separate.
- Bad: two type arguments to write by hand, and no runtime defaults unless they get a separate field.

### Option C: v1's options, plus an explicit setter

Keep v1's typed options as they are, and add a `set` on the mount context that a parent can trigger, so a component lists the properties it accepts.

- Good: the smallest change from v1.
- Bad: properties end up declared in two places, the type and the setter.

### Still open

- Is `row.score = 25` (a proxy setter) the right way to update, or should it be `row.set({ score: 25 })`? A setter looks nicer but hides that it fires an event.
- Do property updates batch, or does every assignment fire `updated` straight away?
- How do options and properties end up in SSR output, so the browser can pick them up without putting data in the DOM? This ties into hydration.
