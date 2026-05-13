// Validates package.json files in packages/*:
// - Non-private packages must declare publishConfig.registry matching this repo's .npmrc registry.

import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FALLBACK_REGISTRY = 'https://registry.npmjs.org/'

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

const OFFICIAL_REGISTRY = readRegistry()

const packageFiles = await Array.fromAsync(glob('packages/*/package.json', { cwd: repoRoot }))

let failed = false

for (const relFile of packageFiles) {
	const file = path.join(repoRoot, relFile)
	const pkg = JSON.parse(readFileSync(file, 'utf8'))
	if (pkg.private) continue

	const registry = pkg.publishConfig?.registry
	if (registry !== OFFICIAL_REGISTRY) {
		const msg = registry === undefined
			? `publishConfig must include "registry": "${OFFICIAL_REGISTRY}"`
			: `publishConfig.registry must be "${OFFICIAL_REGISTRY}", got "${registry}"`
		process.stderr.write(`${relFile}: ${msg}\n`)
		failed = true
	}
}

if (failed) process.exit(1)
