import { propertyName, stringValue, unwrap } from './ast.mts'

import type { ESTree } from 'vite'

/** What could be read statically from a `configureLocalization({ ... })` call. */
export type InstanceOptions = {
	/** The `default` locale, when it's a string literal. */
	defaultLocale: string | undefined
	/** Dictionary import specifiers by locale, for entries written as `() => import('...')`. */
	dictionaries: ReadonlyMap<string, string>
	/** `false` when `dictionaries` isn't an object literal or holds an entry of another shape. */
	complete: boolean
}

export function readInstanceOptions(call: ESTree.CallExpression): InstanceOptions {
	const dictionaries = new Map<string, string>()
	const [options] = call.arguments
	if (options?.type !== 'ObjectExpression') return { defaultLocale: undefined, dictionaries, complete: false }

	let defaultLocale: string | undefined
	let complete = true
	for (const property of options.properties) {
		if (property.type !== 'Property') {
			complete = false
			continue
		}
		const name = propertyName(property)
		if (name === 'default') defaultLocale = stringValue(property.value)
		if (name !== 'dictionaries') continue

		const record = unwrap(property.value)
		if (record.type !== 'ObjectExpression') {
			complete = false
			continue
		}
		for (const entry of record.properties) {
			const locale = entry.type === 'Property' ? propertyName(entry) : undefined
			const specifier = entry.type === 'Property' ? importedSpecifier(entry.value) : undefined
			if (locale === undefined || specifier === undefined) {
				complete = false
				continue
			}
			dictionaries.set(locale, specifier)
		}
	}

	return { defaultLocale, dictionaries, complete }
}

// `() => import('./nl-NL.mts')`, or the same with a block body returning it
function importedSpecifier(value: ESTree.Expression): string | undefined {
	const loader = unwrap(value)
	if (loader.type !== 'ArrowFunctionExpression' && loader.type !== 'FunctionExpression') return undefined
	const body = loader.body
	if (!body) return undefined

	let returned: ESTree.Node | null | undefined = body
	if (body.type === 'BlockStatement') {
		const statement = body.body.length === 1 ? body.body[0] : undefined
		returned = statement?.type === 'ReturnStatement' ? statement.argument : undefined
	}
	if (!returned || returned.type !== 'ImportExpression') return undefined
	return stringValue(returned.source)
}
