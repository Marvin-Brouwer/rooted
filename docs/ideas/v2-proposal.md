# Version 2 Proposal

These are just some ideas based on what didn't work for V1.

## Proxies

Both elements and components will be wrapped in a proxy; \
e.g: 

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
// partial and destructive, other events are untouched, click event is cleared and overridden
elementExample.on({
	click(event) => {
		// a consistent way to add events later
	}
})
```

Components are similar:
```typescript
export const Example = component({
	name: 'example',
	mount({ render, on, element }){
		//
	}
})
export const ExampleWithProps = component({
	name: 'example',
	someValue: property<number>(0),
	mount({ render, on, element }){
		//
	}
})

const exampleComponent = Example() // returns RootedComponent<{ }>
const exampleComponent2 = ExampleWithProps() // returns RootedComponent<{ someValue: number }>
```

This ensures the api remains consistent, and because we can re-wrap it, we can use regular element selectors on components too.

## Components

The state management of V1 is clunky, it should be built in. \
The event management is good but can be more consistent. \
There is no support for SSR, SSG or any kind of server logic, we solve this by changing onMount to mount, and adding a mounted event for the browser.

The `generic-component` and `r-` solution is nice, but it's not semantic in any way. \
We're probably better off using `{componentName}-{filepathId}`, using it as a real component instead of a wrapper. \
Since we use postCSS anyway we can just use the full component name to scope the styles. 

New functionality:

- Server side HTML rendering (or SSG for github pages etc.)
- Streaming HTML by using generator function
- State accessible from outside the component
  - still not reactive, but a first class solution
- a single `render` function with diffing instead of the old append, replace, swap, etc.
  - possibly they should still be available via `this` or `inner` or something.
  - smart diffing algorythm without shadow dom, perhaps use references, or innerHTML or anything other than JSON dom.
    use as much of the apis the browser has to offer.
- extendable eventing, offer a type to extend the `on` function
- better default functions
  - `after(miliseconds, callback)` = setTimeOut with auto cleanup based on abortSignal
  - `every(miliseconds, callback)` = setInterval with auto cleanup based on abortSignal
  - `query<keyof HTMLTagList>(queryString)` = document.querySelector + rooted()

What remains:

- No data accessible in the dom
- More ergonomic api than default elements
- abortSignal on unmount
- async support in everything
- css imports as `.css` files in the head
- prebuilt pwa from manifest


```typescript
// Default component
export const Example = component({
	name: 'example',
	someValue: option<boolean>(), // readonly option for constructor
	mount({ render, on, element }){

		on('component', 'mounted', (event) => {
			// this happens on the client
		})

		on('component', 'umounted', (event) => {
			// still the same abortSignal
		})

		// this generates HTML
		return render(
			element('div',{
				classes: styles.example
			})
		)
	}
})
export const ExampleWithState = component({
	name: 'example',
	someValue: property<boolean>(), // returns a proxy to which can be attached using on
	mount({ render, on, element, someValue }){

		on(someValue, 'updated', ({ value, event }) =>{
			// this happens when someValue changes
			render(
				element('div',{
					classes: styles.example,
					children: `is it true?, ${value ? 'yes' : 'no'}`,
				})
			)
		})

		// this generates HTML
		return render(
			element('div',{
				classes: styles.example,
				children: `is it true?, ${someValue ? 'yes' : 'no'}`,
			})
		)
	}
})
export const ExampleWithStreaming = component({
	name: 'example',
	* mount({ render, on, element, someValue }){

		on(someValue, 'updated', ({ value, event }) =>{
			// this happens when someValue changes
			render(
				element('div',{
					classes: styles.example,
					children: `is it true?, ${value ? 'yes' : 'no'}`,
				})
			)
		})

		// this generates HTML
		yield return render(
			element('div',{
				classes: styles.first,
				children: 'first',
			})
		)
		yield return render(
			element('div',{
				classes: styles.second,
				children: `second`,
			})
		)
		return render(
			element('div',{
				classes: styles.second,
				children: `last, closes stream`,
			})
		)
	}
})
```

And the usage would be:

```typescript
export const UsageExample = component({
	name: 'example',
	someValue: boolean,
	mount({ render, on, element, after }){

		const example = Example({
			someValue: true
		})
		const exampleWithState = ExampleWithState({
			someValue: false
		})
		const exampleWithStreaming = ExampleWithStreaming()

		on('component', 'mounted', () =>{
			after(200, () => {
				exampleWithState.someValue = true
			})
		})

		return render(
			element('div',{
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

Not yet sure about the `option` and `property` helpers. \
Eventually we need:

- constructor options
  - required
  - optional
- settable properties

## Other things to improve

- aria types are string only
