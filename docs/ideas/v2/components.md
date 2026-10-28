# Component sketches

The brain dump behind the [v2 plan](./plan.md): ideas for the component and element API, based on what didn't work in v1. The plan is where these got sorted, this page keeps the original sketches. Nothing here is built, and the code shows a shape, not a finished API.

## Proxies

Wrap both elements and components in a proxy:

```typescript
const elementExample = rooted(document.querySelector<HTMLDivElement>('div#id')) // returns RootedElement<'div'>
const createExample = create('div', {
	classes: 'example',
	on: {
		click(event) {
			// this still works like this
		}
	}
})

elementExample.classes = 'update classes' // you can set using string, will always be type CssClass[]
// partial and destructive: other events are untouched, the click event is cleared and overridden
elementExample.on({
	click(event) {
		// a consistent way to add events later
	}
})
```

Components work the same way:

```typescript
export const Example = component({
	name: 'example',
	mount({ render, on, element }) {
		//
	}
})
export const ExampleWithProps = component({
	name: 'example',
	someValue: property<number>(0),
	mount({ render, on, element }) {
		//
	}
})

const exampleComponent = Example() // returns RootedComponent<{ }>
const exampleComponent2 = ExampleWithProps() // returns RootedComponent<{ someValue: number }>
```

That keeps the API consistent, and because a component can be re-wrapped, the regular element selectors work on components too.

## What's wrong with v1

- State management is clunky. It should be built in.
- Event management is good, but it can be more consistent.
- Components only render in the browser. Since this was written, `@rooted/prerender` added build-time rendering and the Fastify and Express adapters added [server middleware](../../advanced/server-middleware.md), but a component still can't render on a server per request. Changing `onMount` to `mount`, and adding a `mounted` event for the browser, would fix that.
- The `GenericComponent` host (`<r-->` in production, `<rooted-component>` in dev) works, but it isn't semantic in any way. Naming the host `{componentName}-{filepathId}` would make it a real custom element instead of a wrapper, and the same name could scope the component's styles.
- `aria` values are mostly typed as plain strings. The ID-reference ones (`labelledBy`, `controls` and friends) take an `Element` now, the rest don't have proper types yet.

## New in v2

- Rendering HTML on the server (or SSG, for GitHub Pages and the like).
- Streaming HTML with a generator function.
- Component state that's reachable from outside the component. Still not reactive, but a first-class solution.
- One `render` function that diffs, instead of `append`, `replace`, `swap` and the rest.
  - The old functions could still be available, through `this` or `inner` or something like that.
  - The diffing shouldn't need a shadow DOM or a JSON DOM. References or `innerHTML` maybe, whatever uses the most of what the browser already offers.
- Extendable events: a type you can extend to add to the `on` function.
- Better default helpers:
  - `after(milliseconds, callback)`: `setTimeout`, cleaned up by the `abortSignal`.
  - `every(milliseconds, callback)`: `setInterval`, cleaned up by the `abortSignal`.
  - `query<keyof HTMLElementTagNameMap>(queryString)`: `document.querySelector` plus `rooted()`.
- Components that render as the element itself, the `is="td"` pattern, so a table row can be a component. The wrapper element breaks tables today, see [table records](../../learnings/table-records.md).

## What stays

- No data in the DOM.
- A nicer API than the plain DOM elements.
- An `abortSignal` that fires on unmount.
- Async support everywhere.
- CSS imported as `.css` files in the head.
- A prebuilt PWA from the manifest.

## Sketch

```typescript
// Default component
export const Example = component({
	name: 'example',
	someValue: option<boolean>(), // readonly option for the constructor
	mount({ render, on, element }) {

		on('component', 'mounted', (event) => {
			// this happens on the client
		})

		on('component', 'unmounted', (event) => {
			// still the same abortSignal
		})

		// this generates HTML
		return render(
			element('div', {
				classes: styles.example
			})
		)
	}
})

export const ExampleWithState = component({
	name: 'example',
	someValue: property<boolean>(), // returns a proxy you can listen to with `on`
	mount({ render, on, element, someValue }) {

		on(someValue, 'updated', ({ value, event }) => {
			// this happens when someValue changes
			render(
				element('div', {
					classes: styles.example,
					children: `is it true?, ${value ? 'yes' : 'no'}`,
				})
			)
		})

		// this generates HTML
		return render(
			element('div', {
				classes: styles.example,
				children: `is it true?, ${someValue ? 'yes' : 'no'}`,
			})
		)
	}
})

export const ExampleWithStreaming = component({
	name: 'example',
	* mount({ render, on, element, someValue }) {

		on(someValue, 'updated', ({ value, event }) => {
			// this happens when someValue changes
			render(
				element('div', {
					classes: styles.example,
					children: `is it true?, ${value ? 'yes' : 'no'}`,
				})
			)
		})

		// this generates HTML
		yield render(
			element('div', {
				classes: styles.first,
				children: 'first',
			})
		)
		yield render(
			element('div', {
				classes: styles.second,
				children: 'second',
			})
		)
		return render(
			element('div', {
				classes: styles.second,
				children: 'last, closes the stream',
			})
		)
	}
})
```

Using them:

```typescript
export const UsageExample = component({
	name: 'example',
	someValue: property<boolean>(),
	mount({ render, on, element, after }) {

		const example = Example({
			someValue: true
		})
		const exampleWithState = ExampleWithState({
			someValue: false
		})
		const exampleWithStreaming = ExampleWithStreaming()

		on('component', 'mounted', () => {
			after(200, () => {
				exampleWithState.someValue = true
			})
		})

		return render(
			element('div', {
				classes: styles.example,
				children: [
					example,
					exampleWithState,
					exampleWithStreaming,
				]
			})
		)
	}
})
```

## Open questions

Not sure about the `option` and `property` helpers yet. Whatever they end up as, a component needs:

- Constructor options, both required and optional.
- Properties you can set after construction.

How should a streaming component behave when it's rendered on the server (SSR) or at build time (SSG), and when the parts it yields wait on API calls? Under SSG there's no response to stream into, so it probably renders to the end, but then a slow call holds up the build. Under SSR it's not clear yet whether an API call that fails halfway closes the stream, renders a fallback, or leaves it to the browser.
