import { ComponentConstructor, scopeId } from '../component.mts'
import { isDevelopment } from '../dev-helper.mts'
import { create } from '../element-helper.mts'
import { GenericComponent } from './generic-component.mts'

const styleSheets = new WeakMap<Document, WeakSet<ComponentConstructor>>()

const scopeSupported = CSS.supports('@scope (a) { }')
const indent = isDevelopment() ? '\t' : ''
const lineEnding = isDevelopment() ? '\n' : ''

function buildCss(id: string, css: string) {
	const selector = `${GenericComponent.tagName}[${id}]`
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