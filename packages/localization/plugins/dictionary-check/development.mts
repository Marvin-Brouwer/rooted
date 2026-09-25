import { crawl, entryModules } from './crawl.mts'
import { runCheck } from './run.mts'
import { isScannable, type ModuleScan } from './scan.mts'

import type { CachedResolve } from './link.mts'
import type { HotUpdateOptions, Logger, ResolvedConfig } from 'vite'

export type DevelopmentCheckOptions = {
	config: ResolvedConfig
	logger: Logger
	/** Vite's own resolver, so aliases resolve the way they do in the app. */
	resolve: CachedResolve
	/** Prefixes every logged line. */
	label: string
	display: (id: string) => string
}

// Saves tend to come in bursts (format on save, several files at once)
const settleDelay = 100

export type DevelopmentCheck = {
	/** Runs the check shortly, coalescing with anything else scheduled. */
	run(): void
	/** Takes the plugin's `hotUpdate` events. */
	fileChanged(type: HotUpdateOptions['type'], file: string): void
}

/**
 * The check as it runs in `vite dev`: over the files on disk, reachable from the entries,
 * and again after every save of a file it covers. Reports go to the terminal, and only when they changed since the last run.
 */
export function createDevelopmentCheck(options: DevelopmentCheckOptions): DevelopmentCheck {
	const { logger, resolve } = options
	const scans = new Map<string, ModuleScan>()

	let lastReport: string | undefined
	let running = Promise.resolve()
	let timer: ReturnType<typeof setTimeout> | undefined

	async function check() {
		await crawl(await entryModules(options.config, resolve), scans, resolve)
		const result = await runCheck({ scans, resolve, display: options.display })
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

	return {
		run: schedule,
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
