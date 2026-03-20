import type { Plugin, ResolvedConfig } from 'vite'

export type ImportCycleOptions = {
	/**
	 * Which build mode triggers the check.
	 * Matches Vite's `mode` (e.g. `vite build --mode development`).
	 * @default 'development'
	 */
	when?: 'development' | 'production' | 'always' | 'never'
	/**
	 * Whether a detected cycle fails the build or only logs a warning.
	 * @default 'warn'
	 */
	mode?: 'error' | 'warn'
}

/**
 * Detects potential top-level `await` deadlocks caused by bundler code-splitting.
 *
 * A deadlock occurs when chunk A has a top-level `await import('./B')` and chunk B
 * statically imports chunk A (directly or transitively) — both wait on each other
 * indefinitely and the module never evaluates.
 *
 * This is a bundler artifact: the source may not have a cycle at all, but after
 * code-splitting, a dynamic import shim chunk can re-import from its parent chunk.
 *
 * Runs only during builds (`generateBundle` is never called in dev mode).
 * Uses only the in-memory bundle — no filesystem reads.
 */
export function importCycleDetector(options?: ImportCycleOptions): Plugin {
	const when = options?.when ?? 'development'
	const reportMode = options?.mode ?? 'warn'

	let resolvedConfig: ResolvedConfig

	return {
		name: 'rooted:import-cycle-detector',
		configResolved(config) {
			resolvedConfig = config
		},
		generateBundle(_options, bundle) {
			if (when === 'never') return
			if (when === 'development' && resolvedConfig.mode !== 'development') return
			if (when === 'production' && resolvedConfig.mode !== 'production') return

			const report = reportMode === 'error'
				? this.error.bind(this)
				: this.warn.bind(this)

			// Single pass: collect static imports for every chunk (O(chunks × imports))
			const staticImports = new Map<string, readonly string[]>()
			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (chunk.type === 'chunk') staticImports.set(fileName, chunk.imports)
			}

			// For each chunk that has dynamic imports and contains `await`,
			// check whether any dynamic target can reach this chunk via static imports.
			// The `await` pre-filter avoids cycle checks on chunks where no deadlock
			// is possible — dynamic imports inside non-async functions are safe.
			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (chunk.type !== 'chunk') continue
				if (chunk.dynamicImports.length === 0) continue
				if (!chunk.code.includes('await')) continue

				for (const target of chunk.dynamicImports) {
					if (canReachViaStaticImports(target, fileName, staticImports)) {
						report(
							`Possible top-level await deadlock detected:\n`
							+ `  "${fileName}" dynamically imports "${target}"\n`
							+ `  "${target}" statically imports back to "${fileName}" (directly or transitively)\n`
							+ `  If this dynamic import is a top-level await, it will deadlock at runtime.`,
						)
					}
				}
			}
		},
	}
}

function canReachViaStaticImports(
	from: string,
	target: string,
	staticImports: Map<string, readonly string[]>,
	visited = new Set<string>(),
): boolean {
	if (from === target) return true
	if (visited.has(from)) return false
	visited.add(from)
	for (const dep of staticImports.get(from) ?? []) {
		if (canReachViaStaticImports(dep, target, staticImports, visited)) return true
	}
	return false
}
