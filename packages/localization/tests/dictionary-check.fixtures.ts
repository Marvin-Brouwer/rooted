/** A module configuring `en-GB` as the default, with an `nl-NL` dictionary next to it. */
export const configModule = `
import { configureLocalization } from '@rooted/localization'
export const localization = configureLocalization({
	default: 'en-GB',
	dictionaries: {
		'nl-NL': () => import('./nl-NL.mts')
	},
})
`

/** A dictionary module with the given keys, each translated to the same placeholder text. */
export function dictionaryModule(...keys: string[]): string {
	const entries = keys.map(key => `translation(${JSON.stringify(key)}, 'vertaald'),`)
	return `import { dictionary, translation } from '@rooted/localization'\nexport default dictionary(\n${entries.join('\n')}\n)\n`
}
