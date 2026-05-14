import { spawn } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

import treeKill from 'tree-kill'

/**
 * Runs `pnpm -r build:dev` for the monorepo and returns the total tsdown build
 * time in milliseconds. Used by `pnpm dev` to estimate when the parallel
 * watchers have settled. Respects the abort signal — kills the build and rejects
 * if the signal fires.
 */
export function buildDevelopment(projectPath: string, signal: AbortSignal): Promise<number> {
	return new Promise((resolve, reject) => {
		const build = spawn('pnpm -r --stream run build:dev', {
			stdio: ['ignore', 'pipe', 'inherit'],
			shell: true,
			cwd: projectPath,
			env: { ...process.env, FORCE_COLOR: '1' },
		})

		// We only care about the tsdown build time, the web project is elapsed time we don't need.
		let totalBuildMs = 0
		const errorLines: string[] = []
		const rl = readline.createInterface({ input: build.stdout, crlfDelay: Infinity })
		rl.on('line', (line: string) => {
			// Strip ANSI escape codes before matching — tsdown wraps some text in colour
			// codes that can split "Build complete in" across escape sequences.
			const plain = line.replace(/\[\d+(?:;\d+)*m/g, '')
			// Collect lines that look like hard errors so we can surface them on failure.
			// Don't reject here — let the exit code decide; many lines contain the word
			// "Error" as part of normal output (API extractor warnings, pnpm status, etc).
			if (/\berror\b/i.test(plain) && !/warning/i.test(plain)) errorLines.push(line)
			const match = /Build complete in (\d+)ms/.exec(plain)
			if (match) totalBuildMs += Number(match[1])
		})

		// Forward build output to the terminal
		build.stdout.pipe(process.stdout)

		const onAbort = () => {
			rl.close()
			if (build.pid !== undefined) treeKill(build.pid)
			reject(new Error('Build aborted'))
		}
		signal.addEventListener('abort', onAbort, { once: true })

		build.on('close', (code) => {
			signal.removeEventListener('abort', onAbort)
			rl.close()
			if (signal.aborted) return
			if (code === 0) resolve(totalBuildMs)
			else {
				const context = errorLines.length > 0 ? `\n${errorLines.join('\n')}` : ''
				reject(new Error(`build:dev failed with exit code ${code}${context}`))
			}
		})
	})
}

/**
 * Starts the parallel watchers (`pnpm --parallel run watch`) and the example
 * dev server (`pnpm dev`) in the chosen example folder. Wires up the shared
 * AbortController so any signal (SIGINT, SIGTERM, uncaughtException) flows
 * through a single shutdown path.
 */
export async function runParallelDevelopment(projectPath: string, exampleFilter: string, elapsedBuildTime: number, abortController: AbortController) {
	console.log()
	console.log(`pnpm --parallel --stream run watch`)
	console.log()

	// tsdown watchers. Stdin ignored so they don't compete with the example.
	const watches = spawn('pnpm --parallel --stream run watch', {
		stdio: ['ignore', 'inherit', 'inherit'],
		shell: true,
	})

	// Wait for tsdown to settle, but cancel immediately if aborted.
	await new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, elapsedBuildTime + 200)
		abortController.signal.addEventListener('abort', () => {
			clearTimeout(timer)
			resolve()
		}, { once: true })
	})

	if (abortController.signal.aborted) {
		if (watches.pid !== undefined) treeKill(watches.pid)
		return
	}

	const targetPath = path.resolve(projectPath, exampleFilter)

	console.log()
	console.log(`Running example project, pnpm dev ${path.relative(projectPath, targetPath)}`)

	// Example dev server. Inherits stdin so Vite's h/u/r/q all work.
	const example = spawn(`pnpm dev`, {
		stdio: 'inherit',
		cwd: targetPath,
		shell: true,
	})

	let isShuttingDown = false

	const shutdown = (exitCode: number) => {
		if (isShuttingDown) return
		isShuttingDown = true

		if (!abortController.signal.aborted) abortController.abort()

		console.log('Killing process...')
		example.kill('SIGINT')

		if (exitCode !== 0) {
			// Dev server errored: force-kill immediately and exit.
			if (watches.pid !== undefined) treeKill(watches.pid)
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(exitCode)
			return
		}

		// Clean exit (Vite's q/r handlers): send SIGINT directly to the pnpm process
		// so it can propagate cleanly to tsdown, then treeKill after 2 s if still running.
		if (watches.pid !== undefined) watches.kill('SIGINT')
		const forceKill = setTimeout(() => {
			if (watches.pid !== undefined) treeKill(watches.pid)
		}, 2000)
		watches.once('close', () => {
			clearTimeout(forceKill)
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(exitCode)
		})
	}

	// External abort (SIGINT/SIGTERM/uncaughtException from the entry point).
	abortController.signal.addEventListener('abort', () => shutdown(process.exitCode ?? 0), { once: true })
	example.on('close', (code: number | null) => shutdown(code ?? 0))
	watches.on('close', (code: number | null) => shutdown(code ?? 0))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const abortController = new AbortController()

	process.on('SIGINT', () => abortController.abort())
	process.on('SIGTERM', () => abortController.abort())
	process.on('uncaughtException', (error: Error) => {
		process.stderr.write(`\nUncaught exception: ${error.message}\n`)
		process.exitCode = 1
		abortController.abort()
	})
	process.on('unhandledRejection', (reason: unknown) => {
		const message = reason instanceof Error ? reason.message : String(reason)
		process.stderr.write(`\nUnhandled rejection: ${message}\n`)
		process.exitCode = 1
		abortController.abort()
	})

	try {
		const exampleFilter = process.argv[2]
		if (!exampleFilter) throw new Error('Usage: dev-runner <example-filter-path>')
		const projectPath = process.cwd()

		const elapsedTime = await buildDevelopment(projectPath, abortController.signal)
		await runParallelDevelopment(projectPath, exampleFilter, elapsedTime, abortController)
	}
	catch (error) {
		if (!abortController.signal.aborted) {
			process.stderr.write(`\nSomething went wrong:\n${(error as Error).message}\n`)
			process.exitCode = 1
		}
	}
}
