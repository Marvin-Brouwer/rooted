// Validates package.json files in packages/*:
// - Non-private packages must declare publishConfig.registry matching this repo's .npmrc registry.

import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
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

for (const relativePath of packageFiles) {
	const absolutePath = path.join(repoRoot, relativePath)
	const packageJson = JSON.parse(readFileSync(absolutePath, 'utf8'))
	if (packageJson.private) continue

	const registry = packageJson.publishConfig?.registry
	if (registry !== OFFICIAL_REGISTRY) {
		const message = registry === undefined
			? `publishConfig must include "registry": "${OFFICIAL_REGISTRY}"`
			: `publishConfig.registry must be "${OFFICIAL_REGISTRY}", got "${registry}"`
		process.stderr.write(`${relativePath}: ${message}\n`)
		failed = true
	}
}

if (failed) process.exit(1)
