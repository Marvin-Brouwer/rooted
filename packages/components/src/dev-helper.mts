import { appendSourceLocation, isDevelopment } from '@rooted/util/dev'

import { ComponentConstructor, definedAt } from '../../components/src/component.mts'

function validateComponentName(name: string): void {
	// Component names are used as attribute names on the wrapper element (e.g. data-component="name")
	// and as CSS attribute selectors, so we validate against attribute name rules.
	try {
		document.createElement('div').setAttribute(name, '')
	} catch {
		throw new Error(`Invalid component name "${name}".`)
	}
}

function componentNameChecker() {

	const names = new Map<string, string[]>()

	return function checkName(component: ComponentConstructor) {

		validateComponentName(component.name)


		const registeredForName = names.get(component.name) ?? []
		if (registeredForName.length) {
			console.warn(`[component] Duplicate component name detected: "${component.name}"`)
			console.debug('  ', Object.defineProperty({}, 'listAll', {
				get() {
					return names.get(component.name)
				},
				enumerable: true,
				configurable: false,
			}))
		}
		names.set(component.name,
			[...registeredForName, component[definedAt]!]
		)
	}
}

function appendComponentMetadata(element: HTMLElement, component: ComponentConstructor, options: unknown) {
	if (isDevelopment()) {
		Object.assign(element, {
			component: Object.freeze(component),
			options: Object.freeze(options),
			definedAt: Object.freeze(component[definedAt])
		})
	}
}

export const dev = {
	componentNameCheck: isDevelopment() ? componentNameChecker() : void 0,
	appendSourceLocation: isDevelopment() ? appendSourceLocation.bind(undefined) : void 0,
	appendComponentMetaData: isDevelopment() ? appendComponentMetadata.bind(undefined) : void 0
}