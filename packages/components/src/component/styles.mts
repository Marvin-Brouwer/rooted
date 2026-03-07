import { ComponentConstructor } from '../component.mjs'
import { isDevelopment } from '../dev-helper.mjs'
import { create } from '../element-helper.mjs'
import { GenericComponent } from './generic-component.mts'

const styleSheets = new WeakSet<WeakKey>()

const indent = isDevelopment() ? '\t' : ''
const lineEnding = isDevelopment() ? '\n' : ''

function buildCss(name: string, css: string) {
	const content = [
		`@scope(${GenericComponent.tagName}[name="${name}"]) {`,
		indent + css,
		'}'
	]

	return content.join(lineEnding)
}

export function applyStyles(this: HTMLElement, component: ComponentConstructor) {
	if (!component.styles) return
	if (styleSheets.has(component)) return
	this.ownerDocument.head.append(create('style', {
		id: `style-${component.name}`,
		textContent: buildCss(component.name, component.styles)
	}))
	styleSheets.add(component)
}