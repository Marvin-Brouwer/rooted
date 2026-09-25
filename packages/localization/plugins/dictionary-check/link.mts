import type { InstanceOptions } from './instances.mts'
import type { ModuleScan, SourcePosition, TextSite } from './scan.mts'

/** Resolves an import specifier to a module id, `undefined` for externals and anything unresolvable. */
export type Resolve = (source: string, importer: string) => Promise<string | undefined>

/** Wraps a resolver so each specifier is only resolved once per importer. `clear` forgets everything, for when files come and go. */
export function cachedResolve(resolve: Resolve): Resolve & { clear(): void } {
	const cache = new Map<string, Promise<string | undefined>>()
	const cached = (source: string, importer: string) => {
		const key = `${importer}\u0000${source}`
		let result = cache.get(key)
		if (!result) {
			result = resolve(source, importer)
			cache.set(key, result)
		}
		return result
	}
	return Object.assign(cached, { clear: () => cache.clear() })
}

export type LocatedSite = TextSite & { id: string }

/** A `configureLocalization` call with the `text` call sites that lead back to it. */
export type LinkedInstance = InstanceOptions & SourcePosition & {
	id: string
	sites: LocatedSite[]
}

/**
 * Follows every text site's binding through imports and re-exports to the `configureLocalization` call it came from.
 * Sites that don't lead to one are some other `.text` tag and are dropped.
 */
export async function linkSites(scans: ReadonlyMap<string, ModuleScan>, resolve: Resolve): Promise<LinkedInstance[]> {
	const instances = new Map<string, LinkedInstance>()
	for (const [id, scan] of scans) {
		for (const [local, options] of scan.instances) instances.set(instanceKey(id, local), { id, ...options, sites: [] })
	}

	async function fromLocal(id: string, local: string, members: readonly string[], visited: Set<string>): Promise<string | undefined> {
		const scan = scans.get(id)
		if (!scan) return undefined
		if (scan.instances.has(local)) return members.length === 0 ? instanceKey(id, local) : undefined

		const imported = scan.imports.get(local)
		const target = imported && await resolve(imported.source, id)
		if (!imported || !target) return undefined
		if (imported.imported !== '*') return fromExport(target, imported.imported, members, visited)
		const [name, ...rest] = members
		return name === undefined ? undefined : fromExport(target, name, rest, visited)
	}

	async function fromExport(id: string, name: string, members: readonly string[], visited: Set<string>): Promise<string | undefined> {
		const visitKey = instanceKey(id, name)
		const scan = scans.get(id)
		if (!scan || visited.has(visitKey)) return undefined
		visited.add(visitKey)

		const exported = scan.exports.get(name)
		if (exported && 'local' in exported) return fromLocal(id, exported.local, members, visited)
		if (exported) {
			const target = await resolve(exported.source, id)
			if (!target) return undefined
			if (exported.imported !== '*') return fromExport(target, exported.imported, members, visited)
			const [next, ...rest] = members
			return next === undefined ? undefined : fromExport(target, next, rest, visited)
		}

		// `export *` never forwards a default export
		if (name === 'default') return undefined
		for (const source of scan.starExports) {
			const target = await resolve(source, id)
			const found = target && await fromExport(target, name, members, visited)
			if (found) return found
		}
		return undefined
	}

	for (const [id, scan] of scans) {
		for (const site of scan.sites) {
			const key = await fromLocal(id, site.instance.binding, site.instance.members, new Set())
			if (key) instances.get(key)?.sites.push({ ...site, id })
		}
	}

	return [...instances.values()]
}

function instanceKey(id: string, local: string): string {
	return `${id}\u0000${local}`
}
