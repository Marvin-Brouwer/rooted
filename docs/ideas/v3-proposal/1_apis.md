# API's

We can re-use the router pattern we have already to also expose user-facing API endpoints.

## Initial proposal

```typescript
export const CategoryGet = get`/api/categories/${token('slug', String)}/`({
	async resolve({ response, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) response('not-found')

		return response('ok', Categories)
	},
})

export const CategoryPost = post`/api/categories/${token('slug', String)}/`({
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

Not yet sure if we want the `_routes.mts` approach for this, it would be consistent though. \
On the other hand, this has nothing to do with a page router, and, doesn't require an app frame.

Perhaps `_apis/categories.mts`?

Or perhaps move all the api logic out of the routes. \
This may look like a useless abstraction, but we can use the `_apis.mts` to include (or require) openApi spec. \
Which has nothing to do with the functionality, and may grow the file quickly.

```typescript
export const CategoryGet = get`/api/categories/${token('slug', String)}/`({
	resolve: categories.query,
	openApi: {
		tag: 'categories'
	}
})
export const CategoryPost = post`/api/categories/${token('slug', String)}/`({
	// maybe use zod, or something else?
	body: z.object(),
	resolve: categories.create,
	openApi: {
		tag: 'categories'
	}
})
```

```typescript

export async function query({ tokens, response }: Request) {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) response('not-found')

	return response('ok', Categories)
}

export async function create({ tokens, response, body }: Request<CategoryBody>) {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) response('not-found')

	return response('ok', Categories)
}
```

I am not sure about the name of `resolve` though.

Alternatively we can wrap the api and route differently:

```typescript
export const CategoryGet = categories.query`/api/categories/${token('slug', String)}/`({
	openApi: {
		tag: 'categories'
	}
)
export const CategoryPost = categories.create`/api/categories/${token('slug', String)}/`({
	// maybe use zod, or something else?
	body: z.object(),
	openApi: {
		tag: 'categories'
	}
})
```

```typescript

export const query = getHandler(async ({ tokens, response }) => {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) response('not-found')

	return response('ok', Categories)
})

export const query = putHandler<CategoryBody>(async ({ tokens, response, body }) => {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) response('not-found')

	return response('ok', Categories)
})
```

But this doesn't seem very well put together.

Perhaps a hybrid of all of the above would fit best.

Or, we go full builder pattern.

```typescript

export const CategoryQuery = api
	.get`/api/categories/${token('slug', String)}/`
	.doc({
		tag: 'categories'
	})
	.handle(async ({ tokens, response }) => {
		
	})

export const CategoryCreate = api
	.post`/api/categories/${token('slug', String)}/`
	.body(z.object())
	.doc({
		tag: 'categories'
	})
	.handle(async ({ tokens, response, body }) => {
		
	})
```

At the end, it's not 100% clear if we want full API functionality in a rooted front-end app anyway.
Perhaps we make 2 flavours, API app and Web app.
