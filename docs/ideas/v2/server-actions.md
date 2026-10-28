# Server actions

If v2 gets a backend (see [components in v2](./components.md)), it could also run logic on the server on demand. Not built, just a first idea.

## Sketch

An action is a regular function. Exporting it through `action()` makes it run on the server, a bit like React server components, or rather like Firebase functions.

```typescript
// # feature/actions/example.mts

async function thisCouldBeSomeDatabaseCall(title: string, number: number) {
	await new Promise<void>(resolve => setTimeout(resolve, 3000))
	return `${title}-${number}`
}

export const exampleAction = action(thisCouldBeSomeDatabaseCall)
```

Calling it from a component looks like a normal async call:

```typescript
// # feature/some-component.mts

export const Example = component({
	name: 'example',
	mount({ render, on, element }) {

		on('mounted', async () => {
			// This turns into an internal API call, a websocket message, or something like that
			const newText = await exampleAction('test', 0)
			render(
				element('p', {
					children: newText
				})
			)
		})

		return render(
			element('p', {
				children: 'loading...'
			})
		)
	}
})
```

## Open questions

- What carries the call: a plain HTTP endpoint, a websocket, something else?
- Today, server code only exists through the Fastify and Express adapters' [server middleware](../../advanced/server-middleware.md). Actions would need one of those adapters too, so they can't work on a static host.
