import { spawn } from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

import treeKill from 'tree-kill'

export function buildDevelopment(projectPath: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const build = spawn('pnpm -r --stream run build:dev', {
			stdio: ['ignore', 'pipe', 'inherit'],
			shell: true,
			cwd: projectPath,
			env: { ...process.env, FORCE_COLOR: '1' },
		})

		// We only care about the tsup build time, the web project is elapsed time we don't need.
		let totalBuildMs = 0
		const rl = readline.createInterface({ input: build.stdout, crlfDelay: Infinity })
		rl.on('line', (line: string) => {
			const match = /Build success in (\d+)ms/.exec(line)
			if (match) totalBuildMs += Number(match[1])
		})

		// Forward build output to the terminal
		build.stdout.pipe(process.stdout)

		build.on('close', (code) => {
			rl.close()
			if (code === 0) resolve(totalBuildMs)
			else reject(new Error(`build:dev failed with exit code ${code}`))
		})
	})
}

export async function runParallelDevelopment(projectPath: string, exampleFilter: string, elapsedBuildTime: number) {
	console.log()
	console.log(`pnpm --parallel --stream run watch`)
	console.log()

	// Tsup watchers — stdin ignored so they don't compete with the example
	const watches = spawn('pnpm --parallel --stream run watch', {
		stdio: ['ignore', 'inherit', 'inherit'],
		shell: true,
	})

	// Wait for tsup to settle
	await new Promise(resolve => setTimeout(resolve, elapsedBuildTime))

	const targetPath = path.resolve(projectPath, exampleFilter)

	console.log()
	console.log(`Running example project, pnpm dev ${path.relative(projectPath, targetPath)}`)

	// Example dev server — inherits stdin so Vite's h/u/r/q all work
	const example = spawn(`pnpm dev`, {
		stdio: 'inherit',
		cwd: targetPath,
		shell: true,
	})

	let shuttingDown = false

	const kill = () => {
		console.log('Killing process...')
		if (watches.pid !== undefined) treeKill(watches.pid)
		if (example.pid !== undefined) treeKill(example.pid)
	}

	process.on('SIGINT', () => {
		shuttingDown = true
		kill()
	})

	// When the example exits (including Vite's own q handler), kill the watchers
	example.on('close', (code: number | null) => {
		if (!shuttingDown) {
			shuttingDown = true
			kill()
		}
		// Exit once the watch processes have also closed
		watches.on('close', () => {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(code ?? 0)
		})
		// Fallback: exit after 3s if watches don't acknowledge the kill
		setTimeout(() => {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(code ?? 0)
		}, 3000)
	})

	// If the watchers crash on their own, propagate the exit
	watches.on('close', (code: number | null) => {
		if (!shuttingDown) {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(code ?? 0)
		}
	})
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const exampleFilter = process.argv[2]
	if (!exampleFilter) throw new Error('Usage: dev-runner <example-filter-path>')
	const projectPath = path.resolve(process.cwd(), '../../')

	const elapsedTime = await buildDevelopment(projectPath)
	await runParallelDevelopment(projectPath, exampleFilter, elapsedTime)
}
