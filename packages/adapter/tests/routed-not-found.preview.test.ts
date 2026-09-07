// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { routedNotFound } from '../src/routed-not-found.mts'

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, PreviewServer, ResolvedConfig } from 'vite'

type Outcome = { handled: 'next' | 'responded', status?: number, body?: string, location?: string }

let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-preview-'))
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

describe('routedNotFound() in preview', () => {
	test('leaves a prerendered static route to vite', async () => {
		// Arrange
		await buildOutput({ staticRoutes: ['/categories/'], dynamicRoutes: [] })

		// Act
		const outcome = await request(await preview(), '/categories/')

		// Assert -- the real file is on disk, so vite's static handler owns it
		expect(outcome).toEqual({ handled: 'next' })
	})

	test('serves the fallback shell for a dynamic route, as the generated server does', async () => {
		// Arrange
		await buildOutput({ staticRoutes: [], dynamicRoutes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(await preview(), '/recipe/42/')

		// Assert
		expect(outcome.status).toBe(200)
		expect(outcome.body).toContain('the fallback shell')
	})

	test('answers an unknown navigation with 404 and the shell', async () => {
		// Arrange
		await buildOutput({ staticRoutes: [], dynamicRoutes: ['/recipe/:id/'] })

		// Act
		const outcome = await request(await preview(), '/nope/')

		// Assert
		expect(outcome.status).toBe(404)
		expect(outcome.body).toContain('the fallback shell')
	})

	test('answers an unknown non-navigation with an empty 404', async () => {
		// Arrange
		await buildOutput({ staticRoutes: [], dynamicRoutes: [] })

		// Act
		const outcome = await request(await preview(), '/missing.png', 'image/*')

		// Assert
		expect(outcome.status).toBe(404)
		expect(outcome.body).toBe('')
	})

	test('redirects a route written without its trailing slash', async () => {
		// Arrange
		await buildOutput({ staticRoutes: ['/categories/'], dynamicRoutes: ['/recipe/:id/'] })
		const server = await preview()

		// Act
		const staticRoute = await request(server, '/categories')
		const dynamicRoute = await request(server, '/recipe/42?sort=name')

		// Assert
		expect(staticRoute).toMatchObject({ status: 301, location: '/categories/' })
		expect(dynamicRoute).toMatchObject({ status: 301, location: '/recipe/42/?sort=name' })
	})

	test('leaves the server alone when there is no build to preview', async () => {
		// Arrange -- no routes.json written
		const config = createConfig()
		const server = await preview(config)

		// Act
		const outcome = await request(server, '/nope/')

		// Assert
		expect(outcome).toEqual({ handled: 'next' })
		expect(config.logger.warn).toHaveBeenCalledWith(expect.stringContaining('no routes.json'))
	})

	test('honours a fallback file the adapter renamed', async () => {
		// Arrange
		await buildOutput({ staticRoutes: [], dynamicRoutes: [] }, 'error.html')

		// Act
		const outcome = await request(await preview(), '/nope/')

		// Assert
		expect(outcome.status).toBe(404)
		expect(outcome.body).toContain('the fallback shell')
	})

	describe('on a host that only serves files (dynamicStatus 404)', () => {
		test('serves the shell for a dynamic route, with the 404 the host would send', async () => {
			// Arrange
			await buildOutput({ staticRoutes: [], dynamicRoutes: ['/recipe/:id/'], dynamicStatus: 404 })

			// Act
			const outcome = await request(await preview(), '/recipe/42/')

			// Assert
			expect(outcome.status).toBe(404)
			expect(outcome.body).toContain('the fallback shell')
		})

		test('does not redirect a dynamic route written without its slash', async () => {
			// Arrange -- there is no directory to redirect to on such a host
			await buildOutput({ staticRoutes: [], dynamicRoutes: ['/recipe/:id/'], dynamicStatus: 404 })

			// Act
			const outcome = await request(await preview(), '/recipe/42')

			// Assert
			expect(outcome.status).toBe(404)
			expect(outcome.location).toBeUndefined()
		})

		test('still redirects a static path written without its slash', async () => {
			// Arrange
			await buildOutput({ staticRoutes: ['/categories/'], dynamicRoutes: [], dynamicStatus: 404 })

			// Act
			const outcome = await request(await preview(), '/categories')

			// Assert
			expect(outcome.status).toBe(301)
			expect(outcome.location).toBe('/categories/')
		})
	})
})

// ---------------------------------------------------------------------------

async function buildOutput(
	routes: { staticRoutes: string[], dynamicRoutes: string[], dynamicStatus?: 200 | 404 },
	fallback = '404.html',
) {
	const outputDirectory = path.join(root, 'dist')
	await mkdir(outputDirectory, { recursive: true })
	await writeFile(
		path.join(outputDirectory, 'routes.json'),
		JSON.stringify({ base: '/', ...routes, fallback }),
		'utf8',
	)
	await writeFile(path.join(outputDirectory, fallback), '<html><body>the fallback shell</body></html>', 'utf8')
}

function createConfig(): ResolvedConfig {
	return {
		root,
		base: '/',
		plugins: [],
		environments: { client: { build: { outDir: 'dist' } } },
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	} as unknown as ResolvedConfig
}

/** Drives the preview hook the way vite does, including its post hook. */
async function preview(config = createConfig()) {
	const handlers: Connect.NextHandleFunction[] = []
	const server = {
		config,
		middlewares: { use: (used: Connect.NextHandleFunction) => { handlers.push(used) } },
	} as unknown as PreviewServer

	const plugin = routedNotFound({ name: 'rooted:test-not-found' }) as Plugin
	;(plugin.configResolved as (resolved: ResolvedConfig) => void)(config)
	const postHook = (plugin.configurePreviewServer as (target: PreviewServer) => (() => void))(server)
	postHook()
	return handlers
}

async function request(
	handlers: Connect.NextHandleFunction[],
	url: string,
	accept = 'text/html',
): Promise<Outcome> {
	if (handlers.length === 0) return { handled: 'next' }
	return await new Promise<Outcome>((resolve, reject) => {
		let body = ''
		const headers = new Map<string, string>()
		const incoming = { url, method: 'GET', headers: { accept } } as unknown as IncomingMessage
		const outgoing = {
			statusCode: 200,
			setHeader: (name: string, value: string) => { headers.set(name.toLowerCase(), value) },
			end: (chunk?: string) => {
				body += chunk ?? ''
				resolve({
					handled: 'responded',
					status: outgoing.statusCode,
					body,
					...headers.has('location') ? { location: headers.get('location') } : {},
				})
			},
		} as unknown as ServerResponse & { statusCode: number }
		handlers[0](incoming, outgoing, error => error ? reject(error as Error) : resolve({ handled: 'next' }))
	})
}
