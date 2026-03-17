/**
 * Runs @microsoft/api-extractor in "local build" mode for every public package
 * that has an api-extractor.json.  Exits non-zero if any package reports API
 * surface changes that haven't been accepted into the baseline.
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const packagesDir = resolve(import.meta.dirname, '../../../packages')
const packages = readdirSync(packagesDir)

let failed = false

for (const packageName of packages) {
	const configPath = join(packagesDir, packageName, 'api-extractor.json')
	if (!existsSync(configPath)) continue

	console.log(`\nChecking API surface: ${packageName}`)
	try {
		execSync(`pnpm exec api-extractor run --local --config ${configPath}`, {
			stdio: 'inherit',
			cwd: join(packagesDir, packageName),
		})
	} catch {
		console.error(`  ✗ API changes detected in ${packageName}`)
		failed = true
	}
}

if (failed) {
	console.error('\nOne or more packages have unaccepted API surface changes.')
	console.error('Run `pnpm api-extractor run --local` inside each package and commit the updated baseline.')
	process.exit(1)
}

console.log('\nAll API surfaces are stable.')
