import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { isScannable, scanModule, type ModuleScan } from './scan.mts'

import type { Resolve } from './link.mts'
import type { ResolvedConfig } from 'vite'

/**
 * Brings `scans` in line with everything reachable from `entries`. Modules that aren't in `scans` yet are read from disk and scanned,
 * modules that are stay as they are, and modules nothing reaches anymore are dropped.
 * So after a save, deleting the saved file from `scans` is enough to have it read again.
 */
export async function crawl(entries: Iterable<string>, scans: Map<string, ModuleScan>, resolve: Resolve): Promise<void> {
	const reached = new Set<string>()
	const queue = [...entries]

	for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
		if (reached.has(id) || !isScannable(id)) continue
		reached.add(id)
		const scan = scans.get(id) ?? await scanFile(id)
		if (!scan) continue
		scans.set(id, scan)

		for (const dependency of scan.dependencies) {
			const target = await resolve(dependency, id)
			if (target !== undefined) queue.push(target)
		}
	}

	for (const id of scans.keys()) {
		if (!reached.has(id)) scans.delete(id)
	}
}

/**
 * The modules the app starts from: the module scripts in each html entry, or the entry itself when it's a script.
 * Uses `index.html` in the root unless `build.rolldownOptions.input` says otherwise.
 */
export async function entryModules(config: ResolvedConfig, resolve: Resolve): Promise<string[]> {
	const input = config.build.rolldownOptions.input ?? 'index.html'
	const inputs = typeof input === 'string' ? [input] : Object.values(input)
	const modules: string[] = []

	for (const entry of inputs.map(file => path.resolve(config.root, file))) {
		if (!entry.endsWith('.html')) {
			modules.push(entry)
			continue
		}
		const html = await readFile(entry, 'utf8').catch(() => '')
		for (const source of moduleScripts(html)) {
			const target = await resolve(source, entry)
			if (target !== undefined) modules.push(target)
		}
	}

	return modules
}

async function scanFile(id: string): Promise<ModuleScan | undefined> {
	try {
		return scanModule(await readFile(id, 'utf8'), id)
	}
	catch {
		// Gone or not parseable right now, the next save gets another go
		return undefined
	}
}

function moduleScripts(html: string): string[] {
	const sources: string[] = []
	for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
		if (!/\btype=["']module["']/i.test(tag)) continue
		const source = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1]
		if (source) sources.push(source)
	}
	return sources
}
