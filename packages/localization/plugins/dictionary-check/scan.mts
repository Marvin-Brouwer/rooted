import { parseAst, Visitor } from 'vite'

import { lookupKey } from '../../src/dictionary.mts'

import { bindingPath, propertyName, unwrap, type BindingPath } from './ast.mts'
import { readInstanceOptions, type InstanceOptions } from './instances.mts'
import { readDictionaryCall, type StaticDictionary } from './literals.mts'
import { exportBindings, importBindings, type ExportBinding, type ImportBinding } from './module-bindings.mts'

import type { ESTree } from 'vite'

/** The local name given to `export default configureLocalization(...)`, which has none of its own. */
export const defaultExportBinding = '*default*'

export type SourcePosition = { line: number, column: number }

/** A tagged template that may be a `text` call, pending whether its tag leads to a localization instance. */
export type TextSite = SourcePosition & {
	/** The value `text` was read from: `localization` for `localization.text\`...\``. */
	instance: BindingPath
	/** The lookup key, built the same way `text` builds it at runtime. */
	key: string
	/** The template as written, with `{}` where the substitutions go. */
	text: string
}

/** Everything the dictionary check needs from one module, read from its source. */
export type ModuleScan = {
	imports: ReadonlyMap<string, ImportBinding>
	exports: ReadonlyMap<string, ExportBinding>
	starExports: readonly string[]
	/** `configureLocalization` calls, by the local name they're assigned to. */
	instances: ReadonlyMap<string, InstanceOptions & SourcePosition>
	sites: readonly TextSite[]
	/** The `dictionary(...)` entries in this module, if it has any. */
	dictionary: StaticDictionary | undefined
}

const packageName = '@rooted/localization'

export function scanModule(code: string, id: string): ModuleScan {
	const program = parseAst(code, { lang: languageOf(id) }, id)
	const position = positionReader(code)

	const imports = importBindings(program)
	const { exports, starExports } = exportBindings(program, defaultExportBinding)
	const packageFunction = packageFunctionReader(imports)

	const instances = new Map<string, InstanceOptions & SourcePosition>()
	const textAliases = new Map<string, BindingPath>()
	const pending: Array<Omit<TextSite, 'instance'> & { tag: BindingPath }> = []
	let dictionary: StaticDictionary | undefined

	function readInstance(local: string, expression: ESTree.Expression | null | undefined) {
		const call = expression ? unwrap(expression) : undefined
		if (call?.type !== 'CallExpression' || packageFunction(call) !== 'configureLocalization') return
		instances.set(local, { ...readInstanceOptions(call), ...position(call.start) })
	}

	new Visitor({
		ExportDefaultDeclaration(node) {
			if (node.declaration.type.endsWith('Expression')) readInstance(defaultExportBinding, node.declaration as ESTree.Expression)
		},
		VariableDeclarator(node) {
			if (node.id.type === 'Identifier') readInstance(node.id.name, node.init)
			if (node.id.type !== 'ObjectPattern' || !node.init) return
			const source = bindingPath(node.init)
			if (!source) return
			for (const property of node.id.properties) {
				if (property.type !== 'Property' || propertyName(property) !== 'text' || property.value.type !== 'Identifier') continue
				textAliases.set(property.value.name, source)
			}
		},
		CallExpression(node) {
			if (packageFunction(node) !== 'dictionary') return
			dictionary ??= { keys: new Map(), unreadable: 0 }
			readDictionaryCall(node, call => packageFunction(call) === 'translation', dictionary)
		},
		TaggedTemplateExpression(node) {
			const tag = bindingPath(node.tag)
			if (!tag) return
			const parts = node.quasi.quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw)
			pending.push({ tag, key: lookupKey(parts), text: parts.join('{}'), ...position(node.start) })
		},
	}).visit(program)

	// Aliases are only complete after the walk, so tags are matched afterwards
	const sites: TextSite[] = []
	for (const { tag, ...site } of pending) {
		const instance = tag.members.at(-1) === 'text'
			? { binding: tag.binding, members: tag.members.slice(0, -1) }
			: (tag.members.length === 0 ? textAliases.get(tag.binding) : undefined)
		if (instance) sites.push({ instance, ...site })
	}

	return { imports, exports, starExports, instances, sites, dictionary }
}

// Names the package function a call goes to, whatever it was imported as
function packageFunctionReader(imports: ReadonlyMap<string, ImportBinding>) {
	return (call: ESTree.CallExpression): string | undefined => {
		const callee = bindingPath(call.callee)
		if (!callee) return undefined
		const imported = imports.get(callee.binding)
		if (imported?.source !== packageName) return undefined
		if (imported.imported === '*') return callee.members.length === 1 ? callee.members[0] : undefined
		return callee.members.length === 0 ? imported.imported : undefined
	}
}

function languageOf(id: string): 'js' | 'jsx' | 'ts' | 'tsx' {
	if (id.endsWith('.tsx')) return 'tsx'
	if (id.endsWith('.jsx')) return 'jsx'
	return /\.[cm]?ts$/.test(id) ? 'ts' : 'js'
}

function positionReader(code: string) {
	const lineStarts = [0]
	for (let index = code.indexOf('\n'); index !== -1; index = code.indexOf('\n', index + 1)) lineStarts.push(index + 1)

	return (offset: number): SourcePosition => {
		// Binary search for the last line starting at or before the offset
		let low = 0
		let high = lineStarts.length - 1
		while (low < high) {
			const middle = Math.ceil((low + high) / 2)
			if (lineStarts[middle] <= offset) low = middle
			else high = middle - 1
		}
		return { line: low + 1, column: offset - lineStarts[low] + 1 }
	}
}
