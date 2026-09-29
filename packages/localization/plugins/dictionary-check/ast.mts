import type { ESTree } from 'vite'

/** A binding plus the member names read off it: `ns.localization` is `{ binding: 'ns', members: ['localization'] }`. */
export type BindingPath = {
	binding: string
	members: readonly string[]
}

// Type-only wrappers don't change which value an expression refers to
export function unwrap(expression: ESTree.Expression): ESTree.Expression {
	switch (expression.type) {
		case 'ParenthesizedExpression':
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSNonNullExpression':
		case 'TSTypeAssertion': {
			return unwrap(expression.expression)
		}
		default: {
			return expression
		}
	}
}

/** The value of a string literal, or of a template literal without substitutions. */
export function stringValue(node: ESTree.Node | null | undefined): string | undefined {
	if (!node) return undefined
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked ?? undefined
	return undefined
}

export function exportName(node: ESTree.ModuleExportName): string {
	return node.type === 'Identifier' ? node.name : node.value
}

export function propertyName(property: ESTree.ObjectProperty | ESTree.BindingProperty): string | undefined {
	if (property.computed) return stringValue(property.key)
	return property.key.type === 'Identifier' ? property.key.name : stringValue(property.key)
}

/** Reads `a.b.c` into a binding path. Anything else (calls, computed access, `this`) isn't one. */
export function bindingPath(expression: ESTree.Expression): BindingPath | undefined {
	const node = unwrap(expression)
	if (node.type === 'Identifier') return { binding: node.name, members: [] }
	if (node.type !== 'MemberExpression' || node.computed || node.property.type !== 'Identifier') return undefined
	const parent = bindingPath(node.object)
	if (!parent) return undefined
	return { binding: parent.binding, members: [...parent.members, node.property.name] }
}
