# API's

We can re-use the router pattern we have already to also expose user-facing API endpoints.

## Initial proposal

```typescript
export const CategoryApi = api`/api/categories/${token('slug', String)}/`({
	async resolve({ response, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) response('not-found')

		return response('ok', Categories)
	},
})
```
