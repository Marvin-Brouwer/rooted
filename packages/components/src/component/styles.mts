import { ComponentConstructor, scopeId } from '../component.mts'
import { isDevelopment } from '../dev-helper.mts'
import { create } from '../element-factory.mts'

const styleSheets = new WeakMap<Document, WeakSet<ComponentConstructor>>()

const scopeSupported = (() => {
	try {
		new CSSStyleSheet().replaceSync('@scope {}')
		return true
	} catch {
		return false
	}
})()
const indent = isDevelopment() ? '\t' : ''
const lineEnding = isDevelopment() ? '\n' : ''

/**
 * Wraps component CSS in a scope tied to its unique attribute selector.
 *
 * **Primary path — `@scope`** (Chrome 118+, Firefox 128+, Safari 17.4+):
 * ```css
 * @scope ([r1a2b3c]) {
 *   p { color: red }
 * }
 * ```
 * `@scope` limits style application to descendants of the matching element,
 * so component styles never leak out to the rest of the page.
 *
 * **Fallback — CSS nesting** (Chrome 112+, Firefox 117+, Safari 16.5+):
 * ```css
 * [r1a2b3c] {
 *   p { color: red }
 * }
 * ```
 * Browsers that lack `@scope` support CSS nesting, which desugars nested rules
 * to `[r1a2b3c] p { color: red }` — equivalent descendant scoping via the cascade.
 * The browser ranges align such that the fallback is always valid where needed.
 */
function buildCss(id: string, css: string) {
	const selector = `[${id}]`
	const content = scopeSupported
		? [`@scope (${selector}) {`, indent + css, '}']
		: [`${selector} {`, indent + css, '}']

	return content.join(lineEnding)
}

export function applyStyles(element: HTMLElement, component: ComponentConstructor) {
	if (!component.styles) return
	const doc = element.ownerDocument
	const components = styleSheets.get(doc) ?? new WeakSet<ComponentConstructor>()
	if (components.has(component)) return
	components.add(component)
	styleSheets.set(doc, components)
	doc.head.append(create('style', {
		id: isDevelopment()
			? `style-${component.name}`
			: `style-${component[scopeId]}`,
		textContent: buildCss(component[scopeId]!, component.styles)
	}))
}