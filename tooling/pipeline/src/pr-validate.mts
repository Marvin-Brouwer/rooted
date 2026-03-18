/**
 * Runs the full PR validation suite:
 *   1. lint (no-fix)
 *   2. tests
 *   3. build
 *   4. api-diff
 *
 * Each step prints a header and exits immediately on failure.
 */

import { execSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../..')

function run(label: string, command: string): void {
	console.log(`\n── ${label} ─────────────────────────────`)
	try {
		execSync(command, { stdio: 'inherit', cwd: root })
	}
	catch {
		console.error(`\n✗ ${label} failed`)
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1)
	}
}

run('Lint', 'pnpm lint:nofix')
run('Test', 'pnpm test')
run('Build', 'pnpm build:ci')
run('API diff', 'pnpm --filter @rooted/pipeline api-diff')

console.log('\n✓ All checks passed')
