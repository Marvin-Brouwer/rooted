import { exportName } from './ast.mts'

import type { ESTree } from 'vite'

/** An imported binding. `imported` is `'*'` for a namespace import. */
export type ImportBinding = { source: string, imported: string }

/** An export, either of a local binding or passed through from another module (`'*'` for `export * as name`). */
export type ExportBinding = { local: string } | { source: string, imported: string }

/** Value imports by local name. Type-only imports are skipped, they can't hold an instance. */
export function importBindings(program: ESTree.Program): Map<string, ImportBinding> {
	const imports = new Map<string, ImportBinding>()

	for (const statement of program.body) {
		if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue
		const source = statement.source.value
		for (const specifier of statement.specifiers) {
			if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue
			const imported = specifier.type === 'ImportSpecifier'
				? exportName(specifier.imported)
				: (specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*')
			imports.set(specifier.local.name, { source, imported })
		}
	}

	return imports
}

/**
 * Value exports by exported name, plus the sources of `export * from`.
 * An anonymous `export default <expression>` is recorded under `defaultBinding`.
 */
export function exportBindings(program: ESTree.Program, defaultBinding: string) {
	const exports = new Map<string, ExportBinding>()
	const starExports: string[] = []

	for (const statement of program.body) {
		if (statement.type === 'ExportDefaultDeclaration') {
			const declaration = statement.declaration
			exports.set('default', { local: declaration.type === 'Identifier' ? declaration.name : defaultBinding })
			continue
		}
		if (statement.type === 'ExportAllDeclaration') {
			if (statement.exportKind === 'type') continue
			if (statement.exported) exports.set(exportName(statement.exported), { source: statement.source.value, imported: '*' })
			else starExports.push(statement.source.value)
			continue
		}
		if (statement.type !== 'ExportNamedDeclaration' || statement.exportKind === 'type') continue

		if (statement.declaration?.type === 'VariableDeclaration') {
			for (const declarator of statement.declaration.declarations) {
				if (declarator.id.type === 'Identifier') exports.set(declarator.id.name, { local: declarator.id.name })
			}
		}
		for (const specifier of statement.specifiers) {
			if (specifier.exportKind === 'type') continue
			const exported = exportName(specifier.exported)
			const local = exportName(specifier.local)
			exports.set(exported, statement.source ? { source: statement.source.value, imported: local } : { local })
		}
	}

	return { exports, starExports }
}

/** The specifiers of every static import and re-export that loads a module at runtime. */
export function staticDependencies(program: ESTree.Program): string[] {
	const sources: string[] = []
	for (const statement of program.body) {
		if (statement.type === 'ImportDeclaration' && statement.importKind !== 'type') sources.push(statement.source.value)
		if (statement.type === 'ExportAllDeclaration' && statement.exportKind !== 'type') sources.push(statement.source.value)
		if (statement.type === 'ExportNamedDeclaration' && statement.source && statement.exportKind !== 'type') sources.push(statement.source.value)
	}
	return sources
}
