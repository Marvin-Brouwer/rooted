# API routes

The router's tagged-template pattern could also declare API endpoints. Nothing's built, and it isn't settled that a rooted app should serve an API at all (see [open questions](#open-questions)).

The sketches below use [zod](https://zod.dev) for request bodies as a placeholder. That's not decided either.

## Option 1: handler inline

Closest to how `route` works today:

```typescript
export const CategoryGet = get`/api/categories/${token('slug', String)}/`({
	async resolve({ response, tokens }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) return response('not-found')

		return response('ok', Categories)
	},
})

export const CategoryPost = post`/api/categories/${token('slug', String)}/`({
	body: z.object(),
	async resolve({ response, tokens, body }) {
		const { filterCategory } = await import('./category.mts')
		const { Categories } = await import('./categories.mts')

		const found = await filterCategory(tokens.slug)
		if (!found) return response('not-found')

		return response('ok', Categories)
	},
})
```

Where these live is open. A `_routes.mts` file would be consistent, but an API has nothing to do with a page router and doesn't need an app frame. Something like `_apis/categories.mts` might fit better.

## Option 2: declaration and handler apart

Keep the declarations in an `_apis.mts` file and the logic somewhere else. That looks like a pointless extra layer, but it gives the OpenAPI spec a place to live. The spec has nothing to do with what the endpoint does, and it makes a file grow fast.

```typescript
export const CategoryGet = get`/api/categories/${token('slug', String)}/`({
	resolve: categories.query,
	openApi: {
		tag: 'categories'
	}
})
export const CategoryPost = post`/api/categories/${token('slug', String)}/`({
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
	if (!found) return response('not-found')

	return response('ok', Categories)
}

export async function create({ tokens, response, body }: Request<CategoryBody>) {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) return response('not-found')

	return response('ok', Categories)
}
```

`resolve` may not be the right name here.

## Option 3: the handler declares the route

Turn it around, so the handler is what you put the template on:

```typescript
export const CategoryGet = categories.query`/api/categories/${token('slug', String)}/`({
	openApi: {
		tag: 'categories'
	}
})
export const CategoryPost = categories.create`/api/categories/${token('slug', String)}/`({
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
	if (!found) return response('not-found')

	return response('ok', Categories)
})

export const create = postHandler<CategoryBody>(async ({ tokens, response, body }) => {
	const { filterCategory } = await import('./category.mts')
	const { Categories } = await import('./categories.mts')

	const found = await filterCategory(tokens.slug)
	if (!found) return response('not-found')

	return response('ok', Categories)
})
```

This one doesn't feel well put together.

## Option 4: builder

```typescript
export const CategoryQuery = api
	.get`/api/categories/${token('slug', String)}/`
	.doc({
		tag: 'categories'
	})
	.handle(async ({ tokens, response }) => {
		// ...
	})

export const CategoryCreate = api
	.post`/api/categories/${token('slug', String)}/`
	.body(z.object())
	.doc({
		tag: 'categories'
	})
	.handle(async ({ tokens, response, body }) => {
		// ...
	})
```

A mix of the options above might end up the best fit.

## Open questions

- Does a rooted front-end app want full API support at all? Maybe there should be two flavours: an API app and a web app.
- Today the way to add endpoints is [server middleware](../../advanced/server-middleware.md) on the Fastify or Express adapter. Whatever this becomes has to explain how it relates to that.
- Which validation library, if any, and whether it's pluggable.
