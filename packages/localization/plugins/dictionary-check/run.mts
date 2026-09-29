import { readEntries, type EntrySources } from './entries.mts'
import { linkSites } from './link.mts'
import { compareEntries, formatMissing, formatUnused } from './report.mts'

/** The check's messages by kind, so build and dev can each decide what warns and what fails. */
export type CheckResult = {
	/** Things the check couldn't read, so it couldn't check them either. */
	notes: string[]
	unused: string[]
	missing: string[]
}

/** Links the scanned call sites to their instances and compares them against every dictionary. */
export async function runCheck(sources: EntrySources): Promise<CheckResult> {
	const result: CheckResult = { notes: [], unused: [], missing: [] }
	const instances = await linkSites(sources.scans, sources.resolve)

	for (const instance of instances) {
		const { entries, notes } = await readEntries(instance, sources)
		result.notes.push(...notes)

		for (const localeEntries of entries) {
			const report = compareEntries(instance.sites, localeEntries)
			if (report.missing.length > 0) result.missing.push(formatMissing(report, sources.display))
			if (report.unused.length > 0) result.unused.push(formatUnused(report, sources.display))
		}
	}

	return result
}
