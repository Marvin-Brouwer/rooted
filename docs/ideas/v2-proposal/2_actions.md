# Server actions

Since we may have a backend in v2, we may also think about logic running in the server on-demand.

Initial proposal:

```typescript
// # feature/actions/example.mts

async function thisCouldBeSomeDatabaseCall(title: string, number: number) {
	await new Promise<void>(r => setTimeout(r), 3000)
	return `${title}-${number}`
}

// This is just a regular function, however, the export makes it run server side.
// like react server components, or rather like the FireBase actions.
export const exampleAction = action(thisCouldBeSomeDatabaseCall)
```

Usage:

```typescript
// # feature/some-component.mts

export const Example = component({
	name: 'example',
	mount({ render, on, element }){

		on('mounted', async () => {
			const newText = await exampleAction('test', 0)
			render(
				element('p', {
					// This will trigger an internal api call or websocket call or something
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

