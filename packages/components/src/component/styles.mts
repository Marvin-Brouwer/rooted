import { ComponentConstructor, scopeId } from '../component.mjs'
import { isDevelopment } from '../dev-helper.mjs'
import { create } from '../element-helper.mjs'
import { GenericComponent } from './generic-component.mts'

const styleSheets = new WeakSet<WeakKey>()

const indent = isDevelopment() ? '\t' : ''
const lineEnding = isDevelopment() ? '\n' : ''

function buildCss(id: string, css: string) {
	const content = [
		`@scope (${GenericComponent.tagName}[${id}]) {`,
		indent + css,
		'}'
	]

	return content.join(lineEnding)
}

export function applyStyles(element: HTMLElement, component: ComponentConstructor) {
	if (!component.styles) return
	if (styleSheets.has(component)) return
	element.ownerDocument.head.append(create('style', {
		id: `style-${component.name}`,
		textContent: buildCss(component[scopeId]!, component.styles)
	}))
	styleSheets.add(component)
}