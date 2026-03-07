import { ComponentConstructor, definedAt } from './component.mts'

export function isDevelopment() {
	return import.meta.env.DEV
}

function validateComponentName(name: string): void {
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

function formatStackFrame(frame: string | undefined): string | undefined {
	if (!frame) return void 0

	const trimmedFrame = frame
		.trim()
		.replace('at ', '')
		.replace(location.origin + '/', '')

	const queryLocation = trimmedFrame.indexOf('?')
	if (queryLocation === -1) return trimmedFrame

	return trimmedFrame.slice(0, queryLocation) +
		trimmedFrame.slice(trimmedFrame.indexOf(':', queryLocation))
}

function appendSourceLocation() {
	// Stack: Error -> appendSourceLocation -> component() -> call site
	const definitionStackFrame = new Error().stack?.split('\n')[3]
	return formatStackFrame(definitionStackFrame)
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