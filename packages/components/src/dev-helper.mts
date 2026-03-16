/// <reference path="../node_modules/vite/types/import-meta.d.ts" />

import { appendSourceLocation, isDevelopment } from '@rooted/util/dev'
import { ComponentConstructor, definedAt } from '../../components/src/component.mts'

function validateComponentName(name: string): void {
	try {
		document.createElement('div').setAttribute("component-name", name)
	} catch (innerError) {
		throw new Error(`Invalid component name '${name}'.`, {
			cause: innerError
		})
	}
}

function componentNameChecker() {

	const names = new Map<string, string[]>()
	// Clear names on vite reload, this is to prevent the reload causing duplicate component name warnings.
	if (import.meta.hot) {
		const clearNames = () => names.clear()
		import.meta.hot.on('vite:beforeUpdate', clearNames)
		import.meta.hot.on('vite:beforeFullReload', clearNames)
	}

	return function checkName(component: ComponentConstructor) {

		validateComponentName(component.name)

		const registeredForName = names.get(component.name) ?? []
		if (registeredForName.length) {
			console.warn(`[@rooted/components] Duplicate component name detected: "${component.name}"`)
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
		Object.defineProperty(element, 'dev', {
			value: Object.freeze({
				name: Object.freeze(component.name),
				options: Object.freeze(options),
				definedAt: Object.freeze(component[definedAt])
			}),
			configurable: false,
			enumerable: false,
		})
	}
}

export const dev = {
	componentNameCheck: isDevelopment() ? componentNameChecker() : void 0,
	appendSourceLocation: isDevelopment() ? appendSourceLocation.bind(undefined) : void 0,
	appendComponentMetaData: isDevelopment() ? appendComponentMetadata.bind(undefined) : void 0
}

if (isDevelopment()) {
	console.info(
		[
			'%cGenerated with rooted',
			'',
			'%cThis application is generated using the rooted framework.',
			'%chttps://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted',
			'',
			'%cYou are currently in dev mode.\nIf this is a production build, please compile using a production build!',
			'',
			'%cSee https://github.com/Marvin-Brouwer/rooted/tree/main/docs for documentation.',
		].join('\n'),
		'font-size:15px;font-weight:bold;',
		'font-size:11px;color:#7b2ff7;',
		'font-size:13px;',
		'font-size:13px;font-weight:bold;color:#d97706;',
		'font-size:12px;color:#888;',
	)
} else {
	console.warn(
		[
			'%cStop!',
			'%cThis is a browser feature intended for developers.',
			'',
			'%cIf someone told you to copy and paste something here, stop what you\'re doing.',
			'Pasting code into this console can give attackers full access to this page and your data.',
			'',
			'%cOnly proceed if you know exactly what you\'re doing.',
		].join('\n'),
		'font-size:48px;font-weight:bold;color:#dc2626;',
		'font-size:14px;font-weight:bold;',
		'font-size:13px;',
		'font-size:13px;font-weight:bold;',
	)
}