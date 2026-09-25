import { normalizePath } from 'vite'

import { crawl, entryModules } from './crawl.mts'
import { cachedResolve } from './link.mts'
import { runCheck } from './run.mts'
import { isScannable, type ModuleScan } from './scan.mts'

import type { LocaleTokenInfo } from '../../src/locale-token.mts'
import type { ViteDevServer } from 'vite'

export type DevelopmentCheckOptions = {
	/** Prefixes every logged line. */
	label: string
	/** Locale tokens from the route manifest, read on every run since the manifest loads after the server is created. */
	tokens: () => readonly LocaleTokenInfo[]
	display: (id: string) => string
}

// Saves tend to come in bursts (format on save, several files at once)
const settleDelay = 100

/**
 * Runs the check once the dev server is listening, and again after every save of a file it covers.
 * Reports go to the terminal, and only when they changed since the last run.
 */
export function watchDictionaries(server: ViteDevServer, options: DevelopmentCheckOptions): void {
	const { logger } = server.config
	const scans = new Map<string, ModuleScan>()
	const resolve = cachedResolve(async (source, importer) => {
		const target = await server.environments.client.pluginContainer.resolveId(source, importer)
		return target && !target.external ? target.id : undefined
	})

	let lastReport: string | undefined
	let running = Promise.resolve()
	let timer: ReturnType<typeof setTimeout> | undefined

	async function check() {
		await crawl(await entryModules(server.config, resolve), scans, resolve)
		const result = await runCheck({ scans, resolve, tokens: options.tokens(), display: options.display })
		const messages = [...result.notes, ...result.missing, ...result.unused]
		const report = messages.join('\n')
		if (report === lastReport) return

		const hadProblems = Boolean(lastReport)
		lastReport = report
		if (messages.length > 0) {
			for (const message of messages) logger.warn(`${options.label} ${message}`, { timestamp: true })
		}
		else if (hadProblems) {
			logger.info(`${options.label} every dictionary matches its text call sites`, { timestamp: true })
		}
	}

	function schedule() {
		clearTimeout(timer)
		timer = setTimeout(() => {
			running = running
				.then(check)
				.catch((error: unknown) => logger.error(`${options.label} the check failed: ${String(error)}`, { timestamp: true }))
		}, settleDelay)
	}

	server.watcher.on('change', (file: string) => {
		const id = normalizePath(file)
		if (id.endsWith('.html')) return schedule()
		if (!scans.delete(id)) return
		schedule()
	})
	// A new or removed file can change what an import resolves to
	for (const event of ['add', 'unlink'] as const) {
		server.watcher.on(event, (file: string) => {
			const id = normalizePath(file)
			if (!isScannable(id)) return
			scans.delete(id)
			resolve.clear()
			schedule()
		})
	}

	if (server.httpServer) server.httpServer.once('listening', schedule)
	else schedule()
}
