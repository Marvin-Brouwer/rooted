import { crawl, entryModules } from './crawl.mts'
import { cachedResolve } from './link.mts'
import { runCheck } from './run.mts'
import { isScannable, type ModuleScan } from './scan.mts'

import type { LocaleTokenInfo } from '../../src/locale-token.mts'
import type { HotUpdateOptions, ViteDevServer } from 'vite'

export type DevelopmentCheckOptions = {
	/** Prefixes every logged line. */
	label: string
	/** Locale tokens from the route manifest, read on every run since the manifest loads after the server is created. */
	tokens: () => readonly LocaleTokenInfo[]
	display: (id: string) => string
}

// Saves tend to come in bursts (format on save, several files at once)
const settleDelay = 100

/** Hands the plugin's `hotUpdate` events to the dev check. */
export type DevelopmentCheck = {
	fileChanged(type: HotUpdateOptions['type'], file: string): void
}

/**
 * Runs the check once the dev server is listening, and again after every save of a file it covers.
 * Reports go to the terminal, and only when they changed since the last run.
 */
export function createDevelopmentCheck(server: ViteDevServer, options: DevelopmentCheckOptions): DevelopmentCheck {
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

	if (server.httpServer) server.httpServer.once('listening', schedule)
	else schedule()

	return {
		fileChanged(type, file) {
			if (type === 'update') {
				// The entries live in the html, a scanned file just needs reading again
				if (file.endsWith('.html') || scans.delete(file)) schedule()
				return
			}
			if (!isScannable(file)) return
			// A new or removed file can change what an import resolves to
			scans.delete(file)
			resolve.clear()
			schedule()
		},
	}
}
