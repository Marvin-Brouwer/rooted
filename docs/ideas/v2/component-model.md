# Component model from the hydration discussion

The component shape that came out of the [hydration](./hydration.md) conversation, pieced together from the examples in it. Where the conversation didn't settle something, this page says so. For props, see the separate [component shape proposal](./component-shape.md), since props weren't part of this conversation.

## The shape

```typescript
export const ScoreRow = component<ScoreRowOptions>('tr', {
	name: 'score-row',
	mount({ on }) {
		// Runs on the server, during pre-rendering, and in the browser as the hydration step
		on('mounted', () => {
			// Only runs in the browser
		})
	},
})
```

- **The first argument is optional.** Leave it out and you get a component like today, an autonomous custom element. Pass a tag name and the component is that element: `ScoreRow` renders as a real `<tr>`.
- **`mount` runs everywhere.** On the server and during pre-rendering it builds the HTML. In the browser it runs again to hydrate. It's one body, and users don't need to know it's an HTML builder.
- **`on('mounted')` is browser-only.** Anything that needs a live DOM goes there.
- **`environment.is(...)` still works in `mount`**, with `'client'`, `'preRenderer'` and `'server'`. Server and client can differ, and [hydration](./hydration.md#3-the-build-marks-dynamic-child-positions) handles it, so developers don't have to work around it.

The docs need one sentence right next to the API: `mount` runs during pre-rendering *and* during hydration in the browser, and `on('mounted')` only runs in the browser. That's the most likely thing to get wrong.

## Extending built-in elements

This is how a table row gets to be a component (see [table records](../../learnings/table-records.md)).

- Under the hood it's a customized built-in: rooted writes `is="score-row"` into the server HTML and registers the element with `{ extends: 'tr' }` in the browser.
- Users never write `is` themselves. If the platform ever offers something better, it changes inside rooted and not in every component.
- **Safari doesn't support customized built-ins**, and WebKit has said it won't. So rooted ships [`@ungap/custom-elements`](https://github.com/ungap/custom-elements), imported once in the client entry. Chrome and Firefox use the native version, and the polyfill does nothing there.
- `is` is what makes this worth it: the HTML itself says what the element is. The parser leaves a `<tr is="...">` where it is, the validator accepts it, and it behaves like a row before the JS has loaded, or without JS at all.

What the polyfill costs:

- **It's permanent.** Safari's position is final, so this isn't a bridge to native support.
- **Timing differs.** Natively, upgrades and `connectedCallback` are synchronous. In Safari the polyfill upgrades through a `MutationObserver`, so they're async. `mount` and `mounted` order has to be tested in all three engines.
- **`createElement(tag, { is })` doesn't write an `is` attribute**, by spec. The server builder has to put it into the HTML itself, or the browser never upgrades the element.
- **Private class fields** on an element the polyfill upgrades in place need a test in Safari.
- The polyfill upgrades in place, without creating a new node. That's what keeps hydration's references valid.

The Playwright fixture from [hydration](./hydration.md#testing) covers this: a `<tr is="...">` that upgrades and runs its `mounted` handler in Chromium, Firefox and WebKit.

## IDs

- **`id('name')`** gives a stable, unique id: the host's id plus the name. It's the same value on the server and in the browser, and hydration uses it to find the element again.
- **The element proxy only takes ids from `id()`**, through a branded type, so `id: 'search'` is a type error. That's what keeps ids unique without asking developers to be careful.
- The same id serves for `for`, `aria-labelledby` and anchors, so identity, hydration and accessibility share one concept.
- Calling `id()` twice with the same name in one component is an error in dev.

## Updating after load

Nothing re-renders on its own. Changes are plain DOM operations on the references `mount` created, and queries are for content outside the component's own structure, like what's inside a WYSIWYG editor.

Whether there's also a `render()` is open. One version from the conversation: `render` works like `replaceChildren`, except that elements with an id are kept and get their properties updated. See the [open questions in hydration](./hydration.md#open-questions).

## Open questions

- **First argument or an `extends` option?** The conversation suggested `component({ name: 'score-row', extends: 'tr', ... })` instead of an optional first argument. Its reasons: optional leading parameters make TypeScript overloads painful, `component('tr', ...)` and `component({...})` read like two different functions, and `extends` mirrors `customElements.define`. Either way, the element type can come from the tag, so `extends: 'tr'` gives an `HTMLTableRowElement` without a separate props type.
- **Valid names.** If hosts get named after the component (see the [plan](./plan.md#2-the-host-element)), component names have to be valid custom element names. They need a hyphen, and a few hyphenated names are reserved (`annotation-xml`, `font-face` and others). v1 doesn't hit this, because every host is `<r-->`.
- **Validator and editor support.** The build knows every component, so it could generate a `custom-elements.json` for editors and an `html-validate` plugin with element metadata. That's tracked under [later](../later/readme.md).
