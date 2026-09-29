import type { LocaleEntries } from './entries.mts'
import type { LocatedSite } from './link.mts'

/** What one locale's dictionary lacks, and what it has that nothing uses. */
export type LocaleReport = {
	locale: string
	file: string
	missing: Array<{ text: string, sites: LocatedSite[] }>
	unused: string[]
}

export function compareEntries(sites: readonly LocatedSite[], entries: LocaleEntries): LocaleReport {
	const missing = new Map<string, { text: string, sites: LocatedSite[] }>()
	const used = new Set<string>()

	for (const site of sites) {
		used.add(site.key)
		if (entries.keys.has(site.key)) continue
		const group = missing.get(site.key) ?? { text: site.text, sites: [] }
		group.sites.push(site)
		missing.set(site.key, group)
	}

	const unused = [...entries.keys].filter(([key]) => !used.has(key)).map(([, written]) => written)
	return { locale: entries.locale, file: entries.file, missing: [...missing.values()], unused }
}

export function formatMissing(report: LocaleReport, display: (id: string) => string): string {
	const rows = report.missing.map(({ text, sites }) => [
		JSON.stringify(text),
		sites.map(site => `${display(site.id)}:${site.line}:${site.column}`).join(', '),
	] as const)
	return `${report.locale} is missing ${count(rows.length)}:\n${table(rows)}`
}

export function formatUnused(report: LocaleReport, display: (id: string) => string): string {
	const file = display(report.file)
	const rows = report.unused.map(text => [JSON.stringify(text), file] as const)
	return `${report.locale} has ${count(rows.length, 'unused ')}:\n${table(rows)}`
}

function count(amount: number, adjective = ''): string {
	return `${amount} ${adjective}${amount === 1 ? 'entry' : 'entries'}`
}

function table(rows: ReadonlyArray<readonly [string, string]>): string {
	const width = Math.max(...rows.map(([text]) => text.length))
	return rows.map(([text, where]) => `  ${text.padEnd(width)}  ${where}`.trimEnd()).join('\n')
}
