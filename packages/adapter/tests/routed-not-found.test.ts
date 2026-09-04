// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { routedNotFound } from '../src/routed-not-found.mts'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'

let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-not-found-'))
	await writeFile(path.join(root, 'index.html'), '<html><body><div id="app"></div></body></html>', 'utf8')
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

describe('routedNotFound()', () => {
	test('is named and only applies while serving', () => {
		// Act
		const plugin = routedNotFound({ name: 'rooted:test-not-found' })

		// Assert
		expect(plugin.name).toBe('rooted:test-not-found')
		expect(plugin.apply).toBe('serve')
	})

	test('lets a known static path through', async () => {
		// Arrange
		const server = serve({ routes: ['/categories/'] })

		// Act
		const outcome = await request(server, '/categories/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('lets the root through even with no routes', async () => {
		// Arrange
		const server = serve({})

		// Act
		const outcome = await request(server, '/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('lets a dynamic pattern through', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(server, '/recipe/42/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('answers an unknown navigation with 404 and the shell', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(server, '/nope/')

		// Assert
		expect(outcome.handled).toBe('responded')
		expect(outcome.status).toBe(404)
		expect(outcome.body).toContain('id="app"')
	})

	test('does not let a :param swallow extra segments, matching the server router', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(server, '/recipe/42/extra/')

		// Assert
		expect(outcome.status).toBe(404)
	})

	test('judges a non-navigation on the address the caller asked for', async () => {
		// Arrange -- vite's SPA fallback rewrites url to /index.html before the
		// post hook runs, so a matcher reading `url` would judge the wrong path
		const server = serve({ routes: ['/recipe/:id/'] }, '/', 'post')

		// Act
		const known = await request(server, '/index.html', '*/*', 'GET', '/recipe/42/')
		const unknown = await request(server, '/index.html', '*/*', 'GET', '/nope/')

		// Assert
		expect(known.status).toBe(200)
		expect(unknown.status).toBe(404)
		expect(unknown.body).toBe('')
	})

	test('leaves navigations to vite in the post hook', async () => {
		// Arrange -- vite installs its SPA fallback after this hook, so answering
		// here would 404 the pages the pre hook just allowed through
		const server = serve({ routes: ['/recipe/:id/'] }, '/', 'post')

		// Act
		const outcome = await request(server, '/recipe/42/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('answers a non-navigation with an empty 404', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(server, '/missing.png', 'image/*')

		// Assert -- vite serves what it can; anything it cannot is not ours to
		// answer with HTML, so it falls through and 404s on its own
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('leaves vite internals alone', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const internals = await Promise.all(
			['/@vite/client', '/@id/x', '/node_modules/.vite/deps/x.js', '/@fs/x'].map(url => request(server, url)),
		)

		// Assert
		expect(internals.map(outcome => outcome.handled)).toEqual(['next', 'next', 'next', 'next'])
	})

	test('ignores non-GET requests', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(server, '/nope/', 'text/html', 'POST')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('matches paths under a configured base', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] }, '/my-app/')

		// Act
		const known = await request(server, '/my-app/recipe/42/')
		const unknown = await request(server, '/my-app/nope/')

		// Assert
		expect(known.handled).toBe('next')
		expect(unknown.status).toBe(404)
	})

	test('leaves anything outside the base to vite', async () => {
		// Arrange
		const server = serve({ routes: ['/recipe/:id/'] }, '/my-app/')

		// Act
		const outcome = await request(server, '/elsewhere/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
	})
})

// ---------------------------------------------------------------------------

type Outcome = { handled: 'next' | 'responded', status?: number, body?: string }

function serve(options: { routes?: string[] }, base = '/', which: 'pre' | 'post' = 'pre') {
	const config = {
		root,
		base,
		plugins: [],
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	} as unknown as ResolvedConfig

	const registered: Connect.NextHandleFunction[] = []
	const server = {
		config,
		middlewares: { use: (used: Connect.NextHandleFunction) => { registered.push(used) } },
		transformIndexHtml: (_url: string, html: string) => Promise.resolve(html),
	} as unknown as ViteDevServer

	const plugin = routedNotFound({ name: 'rooted:test-not-found', ...options }) as Plugin
	;(plugin.configResolved as (resolved: ResolvedConfig) => void)(config)
	const postHook = (plugin.configureServer as (target: ViteDevServer) => (() => void) | void)(server)
	if (which === 'post') {
		if (typeof postHook !== 'function') throw new Error('no post hook was returned')
		postHook()
	}
	const handle = which === 'pre' ? registered[0] : registered[1]
	if (!handle) throw new Error('the plugin registered no middleware')
	return handle
}

async function request(
	handle: Connect.NextHandleFunction,
	url: string,
	accept = 'text/html',
	method = 'GET',
	originalUrl?: string,
): Promise<Outcome> {
	return await new Promise<Outcome>((resolve, reject) => {
		let body = ''
		const incoming = { url, originalUrl, method, headers: { accept } } as unknown as IncomingMessage
		const outgoing = {
			statusCode: 200,
			setHeader: () => undefined,
			end: (chunk?: string) => {
				body += chunk ?? ''
				resolve({ handled: 'responded', status: outgoing.statusCode, body })
			},
		} as unknown as ServerResponse & { statusCode: number }
		handle(incoming, outgoing, error => error ? reject(error as Error) : resolve({ handled: 'next' }))
	})
}
