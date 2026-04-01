# API's

We can re-use the router pattern we have already to also expose user-facing API endpoints.

## Initial proposal

```typescript
export const CategoryApi = get`/api/categories/${token('slug', String)}/`({
	async resolve({ response, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) response('not-found')

		return response('ok', Categories)
	},
})
export const CategoryApi = post`/api/categories/${token('slug', String)}/`({
	// maybe use zod, or something else?
	body: z.object(),
	async resolve({ response, tokens, body }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) response('not-found')

		return response('ok', Categories)
	},
})
```
