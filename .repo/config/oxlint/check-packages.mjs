// Validates package.json files in packages/* and packages/adapters/*:
// - Non-private packages must declare publishConfig.registry matching this repo's .npmrc registry.
// - Every path an `exports` entry points at must be covered by `files`, so it actually gets published.

import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const FALLBACK_REGISTRY = 'https://registry.npmjs.org/'

// `source` points at the unbuilt `.mts` entry. It exists so `tsc -p` inside this repo resolves a
// sibling package to its source instead of a stale `dist` (see #310), and only resolvers that opt in
// through customConditions ever pick it. It is not meant to survive into the published tarball, so
// it is the one condition whose target does not have to be in `files`.
const WORKSPACE_ONLY_CONDITIONS = new Set(['source'])

function readRegistry() {
	try {
		const content = readFileSync(path.join(repoRoot, '.npmrc'), 'utf8')
		const match = /^registry\s*=\s*(.+)$/m.exec(content)
		return match?.[1]?.trim() ?? FALLBACK_REGISTRY
	}
	catch {
		return FALLBACK_REGISTRY
	}
}

/** Walks the exports tree and yields every `[subpath, condition, target]` it points at. */
function* exportTargets(exports, subpath = '.', condition = undefined) {
	if (typeof exports === 'string') {
		yield { condition, subpath, target: exports }
		return
	}
	if (exports === null || typeof exports !== 'object') return

	for (const [key, value] of Object.entries(exports)) {
		const isSubpath = key.startsWith('.')
		yield* exportTargets(value, isSubpath ? key : subpath, isSubpath ? condition : key)
	}
}

/**
 * `files` entries are npm-pack patterns. Everything in this repo is a plain path, so this only
 * understands those, plus a trailing `/*` or `/**` on a directory. Anything fancier is treated as
 * covering nothing, which shows up as a failure rather than a silent pass.
 */
function isCovered(target, files) {
	// No `files` at all means npm publishes the whole directory.
	if (files === undefined) return true

	const relativePath = target.replace(/^\.\//, '')
	return files.some((entry) => {
		const normalized = entry.replace(/^\.\//, '').replace(/\/\*{1,2}$/, '').replace(/\/$/, '')
		return relativePath === normalized || relativePath.startsWith(`${normalized}/`)
	})
}

const OFFICIAL_REGISTRY = readRegistry()

const packageFiles = [
	...await Array.fromAsync(glob('packages/*/package.json', { cwd: repoRoot })),
	...await Array.fromAsync(glob('packages/adapters/*/package.json', { cwd: repoRoot })),
]

let failed = false

function report(relativePath, message) {
	process.stderr.write(`${relativePath}: ${message}\n`)
	failed = true
}

for (const relativePath of packageFiles) {
	const absolutePath = path.join(repoRoot, relativePath)
	const packageJson = JSON.parse(readFileSync(absolutePath, 'utf8'))
	if (packageJson.private) continue

	const registry = packageJson.publishConfig?.registry
	if (registry !== OFFICIAL_REGISTRY) {
		report(relativePath, registry === undefined
			? `publishConfig must include "registry": "${OFFICIAL_REGISTRY}"`
			: `publishConfig.registry must be "${OFFICIAL_REGISTRY}", got "${registry}"`)
	}

	for (const { condition, subpath, target } of exportTargets(packageJson.exports ?? {})) {
		if (condition !== undefined && WORKSPACE_ONLY_CONDITIONS.has(condition)) continue
		if (!target.startsWith('.')) continue
		if (isCovered(target, packageJson.files)) continue

		const entry = condition === undefined ? `exports["${subpath}"]` : `exports["${subpath}"].${condition}`
		report(relativePath, `${entry} points at "${target}", which "files" does not publish`)
	}
}

if (failed) process.exit(1)
