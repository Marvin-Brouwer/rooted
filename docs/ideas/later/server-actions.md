# Server actions

Run logic on the server on demand, and call it from a component like a normal async function. Not built, just a first idea.

> [!NOTE]
> This was written before v1 had a server. The Fastify and Express adapters now have [server middleware](../../advanced/server-middleware.md), which covers a lot of what this was for: you can already put an endpoint next to the app and `fetch` it. What's left is the typed call, so the most likely shape for this is an extension of the middleware rather than something new. It's also close to [API routes](./api-routes.md), and the two should probably be designed together.

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
- Actions need a server adapter, so they can't work on a static host. Does a build for a static adapter fail, or warn?
- If this extends the middleware, does an action register a route there, and how does the client know its URL?
