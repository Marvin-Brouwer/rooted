/**
 * Checks the bundles in every package's `dist` folder for imports that cannot work
 * once the package is installed:
 *
 * - a JavaScript chunk importing from a declaration file. Bundlers put runtime
 *   helpers in a shared chunk, and a declaration chunk sometimes gets picked as that
 *   chunk, which leaves an import of a binding that only exists as a type.
 * - a relative import of a file that was never emitted.
 *
 * Only statement-position imports are read, so `import('...')` inside a doc comment
 * is left alone. Run it after `build:ci`; it exits non-zero and lists what it found.
 */

import { existsSync } from 'node:fs'
import { glob, readFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../../..')

/** `import ... from '<specifier>'` and `export ... from '<specifier>'`. */
const fromClause = /^\s*(?:import|export)\b[^'"]*\bfrom\s*['"]([^'"]+)['"]/
/** Bare `import '<specifier>'`, the side-effect only form. */
const bareImport = /^\s*import\s*['"]([^'"]+)['"]/

type Problem = {
	file: string
	line: number
	specifier: string
	reason: string
}

async function checkBundle(relativePath: string): Promise<Problem[]> {
	const absolutePath = path.join(repoRoot, relativePath)
	const source = await readFile(absolutePath, 'utf8')
	const problems: Problem[] = []

	for (const [index, line] of source.split('\n').entries()) {
		const specifier = fromClause.exec(line)?.[1] ?? bareImport.exec(line)?.[1]
		if (specifier === undefined) continue

		const problem = { file: relativePath, line: index + 1, specifier }
		if (/\.d\.[cm]?ts$/.test(specifier)) {
			problems.push({ ...problem, reason: 'imports from a declaration file' })
		}
		else if (specifier.startsWith('.') && !existsSync(path.resolve(path.dirname(absolutePath), specifier))) {
			problems.push({ ...problem, reason: 'imports a file that was not emitted' })
		}
	}

	return problems
}

const bundles = await Array.fromAsync(glob('packages/**/dist/**/*.mjs', { cwd: repoRoot }))
if (bundles.length === 0) {
	console.error('No bundles found. Run `pnpm build:ci` first.')
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(1)
}

const problems = (await Promise.all(bundles.map(bundle => checkBundle(bundle)))).flat()
for (const { file, line, specifier, reason } of problems) {
	console.error(`  ✗ ${file}:${line} ${reason}: "${specifier}"`)
}

if (problems.length > 0) {
	console.error(`\n${problems.length} broken import(s) in the emitted bundles.`)
	console.error('The build wrote JavaScript that cannot run, so the packages would fail on install.')
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(1)
}

console.log(`Checked ${bundles.length} bundles, every import resolves.`)
