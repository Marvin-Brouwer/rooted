import { spawn } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

import treeKill from 'tree-kill'

/**
 * Runs `pnpm -r build:dev` for the monorepo and returns the total tsup build
 * time in milliseconds. Used by `pnpm dev` to estimate when the parallel
 * watchers have settled.
 */
export function buildDevelopment(projectPath: string): Promise<number> {
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
			const plain = line.replace(/\x1b\[\d+(?:;\d+)*m/g, '')
			// Collect lines that look like hard errors so we can surface them on failure.
			// Don't reject here — let the exit code decide; many lines contain the word
			// "Error" as part of normal output (API extractor warnings, pnpm status, etc).
			if (/\berror\b/i.test(plain) && !/warning/i.test(plain)) errorLines.push(line)
			const match = /Build complete in (\d+)ms/.exec(plain)
			if (match) totalBuildMs += Number(match[1])
		})

		// Forward build output to the terminal
		build.stdout.pipe(process.stdout)

		build.on('close', (code) => {
			rl.close()
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
 * dev server (`pnpm dev`) in the chosen example folder. Wires up Ctrl-C so
 * both processes get a chance to clean up.
 */
export async function runParallelDevelopment(projectPath: string, exampleFilter: string, elapsedBuildTime: number) {
	console.log()
	console.log(`pnpm --parallel --stream run watch`)
	console.log()

	// tsdown watchers. Stdin ignored so they don't compete with the example.
	const watches = spawn('pnpm --parallel --stream run watch', {
		stdio: ['ignore', 'inherit', 'inherit'],
		shell: true,
	})

	// Wait for tsup to settle
	await new Promise(resolve => setTimeout(resolve, elapsedBuildTime))
	// Tiny bit of buffer for DTS
	await new Promise(resolve => setTimeout(resolve, 200))

	const targetPath = path.resolve(projectPath, exampleFilter)

	console.log()
	console.log(`Running example project, pnpm dev ${path.relative(projectPath, targetPath)}`)

	// Example dev server. Inherits stdin so Vite's h/u/r/q all work.
	const example = spawn(`pnpm dev`, {
		stdio: 'inherit',
		cwd: targetPath,
		shell: true,
	})

	const abortController = new AbortController()

	const shutdown = (exitCode: number) => {
		if (abortController.signal.aborted) return
		abortController.abort()

		console.log('Killing process...')
		if (watches.pid !== undefined) treeKill(watches.pid)
		if (example.pid !== undefined) treeKill(example.pid)

		if (exitCode !== 0) {
			// Dev server errored: exit immediately — no point waiting for watches.
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(exitCode)
			return
		}

		// Clean exit (Vite's q/r handlers): wait for watches to shut down gracefully.
		const timer = setTimeout(() => {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(exitCode)
		}, 3000)
		watches.once('close', () => {
			clearTimeout(timer)
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(exitCode)
		})
	}

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))
	process.on('uncaughtException', (error: Error) => {
		process.stderr.write(`\nUncaught exception: ${error.message}\n`)
		shutdown(1)
	})
	process.on('unhandledRejection', (reason: unknown) => {
		const message = reason instanceof Error ? reason.message : String(reason)
		process.stderr.write(`\nUnhandled rejection: ${message}\n`)
		shutdown(1)
	})
	example.on('close', (code: number | null) => shutdown(code ?? 0))
	watches.on('close', (code: number | null) => shutdown(code ?? 0))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try{
		const exampleFilter = process.argv[2]
		if (!exampleFilter) throw new Error('Usage: dev-runner <example-filter-path>')
		const projectPath = process.cwd()

		const elapsedTime = await buildDevelopment(projectPath)
		await runParallelDevelopment(projectPath, exampleFilter, elapsedTime)
	}
	catch(error) {
		process.stderr.write(`\nSomething went wrong:\n${(error as Error).message}\n`)
		process.exitCode = 1
	}
}
