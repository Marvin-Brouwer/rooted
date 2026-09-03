// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { nodeMiddlewareServer } from '../src/node-middleware-server.mts'

import type { NodeMiddlewareServerOptions } from '../src/node-middleware-server.mts'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, PreviewServer, ResolvedConfig, ViteDevServer } from 'vite'

/** Stands in for the framework instance the adapters would create. */
type TestApplication = { registered: string[] }

let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), 'rooted-middleware-'))
})

afterEach(async () => {
	await rm(root, { recursive: true, force: true })
})

describe('nodeMiddlewareServer()', () => {
	test('is named and only applies while serving', () => {
		// Act
		const plugin = nodeMiddlewareServer(testOptions().options)

		// Assert
		expect(plugin.name).toBe('rooted:test-middleware')
		expect(plugin.apply).toBe('serve')
	})

	test('registers nothing when there is no middlewarePath', () => {
		// Arrange
		const { options, createServer } = testOptions()
		const plugin = nodeMiddlewareServer({ ...options, middlewarePath: undefined })
		const server = createDevelopmentServer()

		// Act
		serve(plugin, server)

		// Assert
		expect(server.handlers).toHaveLength(0)
		expect(createServer).not.toHaveBeenCalled()
	})

	test('applies middleware in lexicographic order and ignores other files', async () => {
		// Arrange
		await writeMiddleware('10-third.mjs', '10')
		await writeMiddleware('02-second.mjs', '02')
		await writeMiddleware('01-first.mjs', '01')
		await writeFile(path.join(root, 'middleware', 'readme.txt'), 'not middleware', 'utf8')
		const { options, applications } = testOptions()
		const server = createDevelopmentServer()

		// Act
		serve(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Assert
		expect(applications[0].registered).toEqual(['01', '02', '10'])
	})

	test('falls through to vite when the framework has no route', async () => {
		// Arrange
		await writeMiddleware('01-first.mjs', '01')
		const server = createDevelopmentServer()

		// Act
		serve(nodeMiddlewareServer(testOptions().options), server)
		const outcome = await request(server, '/index.html')

		// Assert
		expect(outcome).toBe('next')
	})

	test('warns and falls through when the middleware folder is missing', async () => {
		// Arrange
		const { options, config, createServer } = testOptions()
		const server = createDevelopmentServer(config)

		// Act
		serve(nodeMiddlewareServer(options), server)
		const outcome = await request(server, '/api/ping')

		// Assert
		expect(outcome).toBe('next')
		expect(createServer).not.toHaveBeenCalled()
		expect(config.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No middleware folder'))
	})

	test('skips a file without a default export and warns', async () => {
		// Arrange
		await writeMiddleware('01-first.mjs', '01')
		await writeFile(path.join(root, 'middleware', '02-broken.mjs'), 'export const name = 2\n', 'utf8')
		const { options, config, applications } = testOptions()
		const server = createDevelopmentServer(config)

		// Act
		serve(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Assert
		expect(applications[0].registered).toEqual(['01'])
		expect(config.logger.warn).toHaveBeenCalledWith(expect.stringContaining('no default export'))
	})

	test('keeps serving when a middleware throws while registering', async () => {
		// Arrange
		await writeFile(
			path.join(await middlewareDirectory(), '01-throws.mjs'),
			'export default () => { throw new Error("boom") }\n',
			'utf8',
		)
		await writeMiddleware('02-second.mjs', '02')
		const { options, config, applications } = testOptions()
		const server = createDevelopmentServer(config)

		// Act
		serve(nodeMiddlewareServer(options), server)
		const outcome = await request(server, '/api/ping')

		// Assert
		expect(outcome).toBe('handled')
		expect(applications[0].registered).toEqual(['02'])
		expect(config.logger.error).toHaveBeenCalledWith(expect.stringContaining('failed to register'))
	})

	test('rebuilds the instance when a middleware file changes', async () => {
		// Arrange
		await writeMiddleware('01-first.mjs', '01')
		const { options, createServer, close } = testOptions()
		const server = createDevelopmentServer()
		serve(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Act
		for (const listener of server.watchListeners) listener('change', path.join(root, 'middleware', '01-first.mjs'))
		await flush()
		await request(server, '/api/ping')

		// Assert
		expect(createServer).toHaveBeenCalledTimes(2)
		expect(close).toHaveBeenCalledOnce()
	})

	test('leaves the instance alone when a file outside the folder changes', async () => {
		// Arrange
		await writeMiddleware('01-first.mjs', '01')
		const { options, createServer } = testOptions()
		const server = createDevelopmentServer()
		serve(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Act
		for (const listener of server.watchListeners) listener('change', path.join(root, 'src', 'main.mts'))
		await flush()
		await request(server, '/api/ping')

		// Assert
		expect(createServer).toHaveBeenCalledTimes(1)
	})

	test('resolves middlewarePath against the vite project root, not the working directory', async () => {
		// Arrange
		await writeMiddleware('01-first.mjs', '01')
		const { options, applications } = testOptions()
		const server = createDevelopmentServer()

		// Act
		serve(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Assert -- cwd is the repo root during a test run, so finding the file
		// at all proves config.root was used
		expect(path.resolve(process.cwd(), './middleware')).not.toBe(path.join(root, 'middleware'))
		expect(applications[0].registered).toEqual(['01'])
	})

	test('preview runs the built middleware from the output directory', async () => {
		// Arrange
		const built = path.join(root, 'dist', 'middleware')
		await mkdir(built, { recursive: true })
		await writeFile(path.join(built, '01-built.mjs'), registerSource('built'), 'utf8')
		const { options, applications, modes } = testOptions()
		const server = createPreviewServer()

		// Act
		preview(nodeMiddlewareServer(options), server)
		await request(server, '/api/ping')

		// Assert
		expect(applications[0].registered).toEqual(['built'])
		expect(modes).toEqual(['preview'])
	})

	test('preview warns instead of throwing when there is no build yet', async () => {
		// Arrange
		const { options, config, createServer } = testOptions()
		const server = createPreviewServer(config)

		// Act
		preview(nodeMiddlewareServer(options), server)
		const outcome = await request(server, '/api/ping')

		// Assert
		expect(outcome).toBe('next')
		expect(createServer).not.toHaveBeenCalled()
		expect(config.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No middleware folder'))
	})
})

// ---------------------------------------------------------------------------

/** The watcher tears the old instance down off the event loop, not inline. */
async function flush() {
	await new Promise(resolve => setImmediate(resolve))
}

function registerSource(marker: string) {
	return `export default (app) => { app.registered.push('${marker}') }\n`
}

async function middlewareDirectory() {
	const directory = path.join(root, 'middleware')
	await mkdir(directory, { recursive: true })
	return directory
}

async function writeMiddleware(fileName: string, marker: string) {
	await writeFile(path.join(await middlewareDirectory(), fileName), registerSource(marker), 'utf8')
}

/** A fake framework: it answers `/api/*` and hands everything else back. */
function testOptions() {
	const config = createConfig()
	const applications: TestApplication[] = []
	const modes: string[] = []
	const close = vi.fn()

	const createServer = vi.fn<NodeMiddlewareServerOptions<TestApplication>['createServer']>(
		async (middleware, context) => {
			const application: TestApplication = { registered: [] }
			applications.push(application)
			modes.push(context.mode)
			for (const { register } of middleware) await register(application)
			return {
				handle(request, response, next) {
					if (request.url?.startsWith('/api')) {
						response.end()
						return
					}
					next()
				},
				close,
			}
		},
	)

	const options: NodeMiddlewareServerOptions<TestApplication> = {
		name: 'rooted:test-middleware',
		middlewarePath: './middleware',
		createServer,
	}

	return { options, config, createServer, applications, modes, close }
}

function createConfig(): ResolvedConfig {
	return {
		root,
		environments: { client: { build: { outDir: 'dist' } } },
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	} as unknown as ResolvedConfig
}

type ServerStub = {
	config: ResolvedConfig
	handlers: Connect.NextHandleFunction[]
	watchListeners: Array<(event: string, file: string) => void>
	server: ViteDevServer & PreviewServer
}

function createDevelopmentServer(config = createConfig()): ServerStub {
	const handlers: Connect.NextHandleFunction[] = []
	const watchListeners: Array<(event: string, file: string) => void> = []
	const server = {
		config,
		middlewares: { use: (handle: Connect.NextHandleFunction) => { handlers.push(handle) } },
		// A plain object is not a RunnableDevEnvironment, so the loader takes
		// its documented ssrLoadModule fallback -- which this stub implements
		// with a real import, so ordering and default exports are tested for real.
		environments: { ssr: {} },
		watcher: {
			add: vi.fn(),
			on: (_event: string, listener: (event: string, file: string) => void) => { watchListeners.push(listener) },
		},
		httpServer: { once: vi.fn() },
		ssrLoadModule: (url: string) => import(pathToFileURL(url).href),
	}
	return { config, handlers, watchListeners, server: server as unknown as ViteDevServer & PreviewServer }
}

function createPreviewServer(config = createConfig()): ServerStub {
	const handlers: Connect.NextHandleFunction[] = []
	const server = {
		config,
		middlewares: { use: (handle: Connect.NextHandleFunction) => { handlers.push(handle) } },
	}
	return { config, handlers, watchListeners: [], server: server as unknown as ViteDevServer & PreviewServer }
}

function serve(plugin: Plugin, stub: ServerStub) {
	(plugin.configResolved as (config: ResolvedConfig) => void)(stub.config)
	;(plugin.configureServer as (server: ViteDevServer) => void)(stub.server)
}

function preview(plugin: Plugin, stub: ServerStub) {
	(plugin.configResolved as (config: ResolvedConfig) => void)(stub.config)
	;(plugin.configurePreviewServer as (server: PreviewServer) => void)(stub.server)
}

/** Runs a request through the registered chain and reports how it ended. */
async function request(stub: ServerStub, url: string) {
	return await new Promise<'handled' | 'next'>((resolve, reject) => {
		const incoming = { url, method: 'GET' } as IncomingMessage
		const outgoing = { end: () => resolve('handled') } as unknown as ServerResponse
		const handler = stub.handlers[0]
		if (!handler) return reject(new Error('no middleware was registered'))
		handler(incoming, outgoing, error => error ? reject(error as Error) : resolve('next'))
	})
}
