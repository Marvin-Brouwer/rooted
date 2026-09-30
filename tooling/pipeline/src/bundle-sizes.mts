/**
 * Writes the bundle sizes table in the root `README.md`, from the bundle report of the recipe-book's production build.
 *
 * Lists every `@rooted` package that survived tree-shaking, and the whole app (all JavaScript and CSS), raw, gzipped and brotli'd.
 * The numbers come from `examples/recipe-book/dist/bundle.json`, which `pnpm build:ci` writes through `bundleReport()`.
 *
 * With `--check` it writes nothing: when the README is out of date it prints a warning, and it exits 0 either way.
 * That's what CI runs, the table is meant to be refreshed by hand every now and then.
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const reportPath = path.join(repoRoot, 'examples/recipe-book/dist/bundle.json')
const readmePath = path.join(repoRoot, 'README.md')

const startMarker = '<!-- bundle-sizes:start -->'
const endMarker = '<!-- bundle-sizes:end -->'
const outOfDate = 'Bundle sizes in README.md are out of date. Run `pnpm bundle-sizes` after `pnpm build:ci` and commit.'

/** The parts of Sonda's JSON report this reads. */
type Report = {
	resources: {
		kind: string
		name: string
		uncompressed: number
		gzip: number
		brotli: number
	}[]
}

type Sizes = { raw: number, gzip: number, brotli: number }

const rootedPackage = /node_modules\/(@rooted\/[^/]+)\//

function add(sizes: Sizes, resource: Report['resources'][number]) {
	sizes.raw += resource.uncompressed
	sizes.gzip += resource.gzip
	sizes.brotli += resource.brotli
}

function kilobytes(bytes: number) {
	return `${(bytes / 1000).toFixed(2)} kB`
}

function row(label: string, sizes: Sizes) {
	return `| ${label} | ${kilobytes(sizes.raw)} | ${kilobytes(sizes.gzip)} | ${kilobytes(sizes.brotli)} |`
}

function measure(report: Report) {
	const packages = new Map<string, Sizes>()
	const app: Sizes = { raw: 0, gzip: 0, brotli: 0 }

	for (const resource of report.resources) {
		// An asset is an output file, measured the way it's served.
		if (resource.kind === 'asset') add(app, resource)
		// A chunk is the part of an output file that came from one source file.
		if (resource.kind !== 'chunk') continue
		const name = rootedPackage.exec(resource.name)?.[1]
		if (!name) continue
		if (!packages.has(name)) packages.set(name, { raw: 0, gzip: 0, brotli: 0 })
		add(packages.get(name)!, resource)
	}

	return { packages: [...packages].toSorted(([, a], [, b]) => b.raw - a.raw), app }
}

function table({ packages, app }: ReturnType<typeof measure>) {
	const rooted: Sizes = { raw: 0, gzip: 0, brotli: 0 }
	for (const [, sizes] of packages) {
		rooted.raw += sizes.raw
		rooted.gzip += sizes.gzip
		rooted.brotli += sizes.brotli
	}

	return [
		'| Package | Raw | Gzip | Brotli |',
		'|---------|----:|-----:|-------:|',
		...packages.map(([name, sizes]) => row(`\`${name}\``, sizes)),
		row('**All of `@rooted`**', rooted),
		row('**The whole app** (JS and CSS)', app),
		'',
		'The gzip and brotli sizes per package are estimates.',
		'Compression works on a whole file, so the share of one package in it can only be approximated.',
		'The whole app\'s numbers are the real compressed sizes of its files, added up.',
	].join('\n')
}

const check = process.argv.includes('--check')

function warn(message: string) {
	console.warn(process.env.GITHUB_ACTIONS ? `::warning file=README.md::${message}` : `Warning: ${message}`)
}

if (!existsSync(reportPath)) {
	const message = `No bundle report at ${path.relative(repoRoot, reportPath)}. Build the recipe-book first, with \`pnpm build:ci\`.`
	if (check) warn(message)
	else console.error(message)
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(check ? 0 : 1)
}

const report = JSON.parse(await readFile(reportPath, 'utf8')) as Report
const readme = await readFile(readmePath, 'utf8')

const start = readme.indexOf(startMarker)
const end = readme.indexOf(endMarker)
if (start === -1 || end < start) {
	console.error(`README.md has no ${startMarker} … ${endMarker} block to write the sizes into.`)
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(1)
}

const updated = `${readme.slice(0, start + startMarker.length)}\n${table(measure(report))}\n${readme.slice(end)}`

if (check) {
	if (updated !== readme) warn(outOfDate)
}
else if (updated === readme) {
	console.log('Bundle sizes in README.md are up to date.')
}
else {
	await writeFile(readmePath, updated)
	console.log('Updated the bundle sizes in README.md.')
}
