import { exportName } from './ast.mts'

import type { ESTree } from 'vite'

/** An imported binding. `imported` is `'*'` for a namespace import. */
export type ImportBinding = { source: string, imported: string }

/** An export, either of a local binding or passed through from another module (`'*'` for `export * as name`). */
export type ExportBinding = { local: string } | { source: string, imported: string }

/**
 * Reads a module's top-level imports and exports. Type-only ones are skipped, they can't hold an instance or load a module.
 * An anonymous `export default <expression>` is recorded under `defaultBinding`.
 * `dependencies` is every module the statements load, including side-effect imports that bind nothing.
 */
export function moduleBindings(program: ESTree.Program, defaultBinding: string) {
	const imports = new Map<string, ImportBinding>()
	const exports = new Map<string, ExportBinding>()
	const starExports: string[] = []
	const dependencies: string[] = []

	for (const statement of program.body) {
		if (statement.type === 'ExportDefaultDeclaration') {
			const declaration = statement.declaration
			exports.set('default', { local: declaration.type === 'Identifier' ? declaration.name : defaultBinding })
			continue
		}
		if (statement.type !== 'ImportDeclaration' && statement.type !== 'ExportAllDeclaration' && statement.type !== 'ExportNamedDeclaration') continue
		if ((statement.type === 'ImportDeclaration' ? statement.importKind : statement.exportKind) === 'type') continue
		const source = statement.source?.value
		if (source !== undefined) dependencies.push(source)

		if (statement.type === 'ImportDeclaration') {
			for (const specifier of statement.specifiers) {
				if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue
				const imported = specifier.type === 'ImportSpecifier'
					? exportName(specifier.imported)
					: (specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*')
				imports.set(specifier.local.name, { source: statement.source.value, imported })
			}
			continue
		}
		if (statement.type === 'ExportAllDeclaration') {
			if (statement.exported) exports.set(exportName(statement.exported), { source: statement.source.value, imported: '*' })
			else starExports.push(statement.source.value)
			continue
		}

		if (statement.declaration?.type === 'VariableDeclaration') {
			for (const declarator of statement.declaration.declarations) {
				if (declarator.id.type === 'Identifier') exports.set(declarator.id.name, { local: declarator.id.name })
			}
		}
		for (const specifier of statement.specifiers) {
			if (specifier.exportKind === 'type') continue
			const local = exportName(specifier.local)
			exports.set(exportName(specifier.exported), source === undefined ? { local } : { source, imported: local })
		}
	}

	return { imports, exports, starExports, dependencies }
}
