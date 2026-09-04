import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
// @vitest-environment node
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { expressDevelopmentServer } from '../src/development-server.mts'

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Connect, Plugin, ResolvedConfig, ViteDevServer } from 'vite'

let root: string
let httpServer: Server | undefined

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-express-'))
})

afterEach(async () => {
	await new Promise<void>(resolve => httpServer ? httpServer.close(() => resolve()) : resolve())
	httpServer = undefined
	await rm(root, { recursive: true, force: true })
})

describe('expressDevelopmentServer()', () => {
	test('serves a route a middleware registered', async () => {
		// Arrange
		await writeMiddleware('01-api.mjs', `
			export default (app) => {
				app.get('/api/ping', (_request, response) => response.json({ pong: true }))
			}
		`)
		const url = await listen()

		// Act
		const response = await fetch(`${url}/api/ping`)

		// Assert
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ pong: true })
	})

	test('falls through to vite for anything express has no route for', async () => {
		// Arrange
		await writeMiddleware('01-api.mjs', `
			export default (app) => {
				app.get('/api/ping', (_request, response) => response.json({ pong: true }))
			}
		`)
		const url = await listen()

		// Act
		const response = await fetch(`${url}/src/main.mts`)

		// Assert -- 418 is what the stand-in for vite's own chain answers
		expect(response.status).toBe(418)
	})

	test('applies middleware in lexicographic order', async () => {
		// Arrange
		await writeMiddleware('02-second.mjs', `
			export default (app) => {
				app.get('/api/order', (_request, response) => response.json({ order: app.locals.order }))
			}
		`)
		await writeMiddleware('01-first.mjs', `
			export default (app) => {
				app.locals.order = 'first'
			}
		`)
		const url = await listen()

		// Act
		const response = await fetch(`${url}/api/order`)

		// Assert
		expect(await response.json()).toEqual({ order: 'first' })
	})
})

// ---------------------------------------------------------------------------

async function writeMiddleware(fileName: string, source: string) {
	const directory = path.join(root, 'middleware')
	await mkdir(directory, { recursive: true })
	// The heredoc indentation is only for readability here.
	await writeFile(path.join(directory, fileName), source.replaceAll('\t\t\t', ''), 'utf8')
}

/**
 * Boots the plugin against a stub dev server, then puts the connect handler it
 * registered behind a real http server so requests exercise the real thing.
 */
async function listen() {
	const config = {
		root,
		environments: { client: { build: { outDir: 'dist' } } },
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	} as unknown as ResolvedConfig

	let handle: Connect.NextHandleFunction | undefined
	const server = {
		config,
		middlewares: { use: (used: Connect.NextHandleFunction) => { handle = used } },
		environments: { ssr: {} },
		watcher: { add: vi.fn(), on: vi.fn() },
		httpServer: { once: vi.fn() },
		ssrLoadModule: (url: string) => import(pathToFileURL(url).href),
	} as unknown as ViteDevServer

	const plugin = expressDevelopmentServer('./middleware') as Plugin
	;(plugin.configResolved as (resolved: ResolvedConfig) => void)(config)
	;(plugin.configureServer as (target: ViteDevServer) => void)(server)
	if (!handle) throw new Error('the plugin registered no middleware')

	const registered = handle
	httpServer = createServer((request, response) => {
		registered(request, response, () => {
			response.statusCode = 418
			response.end()
		})
	})
	await new Promise<void>(resolve => httpServer?.listen(0, '127.0.0.1', resolve))
	const { port } = httpServer.address() as AddressInfo
	return `http://127.0.0.1:${port}`
}
