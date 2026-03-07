import { dev } from './dev-helper.mjs'
import { create } from './element-helper.mts'
import { pseudoRandom } from './pseudo-random.mts'

/**
 * ## `ComponentContext`
 *
 * Properties for internal component logic
 */
export type ComponentContext<TOptions extends {} = never> = [TOptions] extends [never]
	? BaseComponentContext
	: BaseComponentContext & { options: Readonly<TOptions> }

type BaseComponentContext = {

	/** @inheritdoc {@link ComponentContext.create create} and append to this component immediately */
	append: typeof create,
	/** @inheritdoc */
	create: typeof create,

	/**
	 * Lifetime signal for the component, aborts when unmounted \
	 * automatically aborts when page unloads
	 */
	signal: AbortSignal
}


const componentBrand: unique symbol = Symbol('rooted:component')
export const definedAt: unique symbol = Symbol('rooted:definedAt')
export const scopeId: unique symbol = Symbol('rooted:scopeId')

export function isComponent(value: unknown): value is Component<any> {
	return typeof value === 'object' && value !== null && componentBrand in value
}

export type Component<TOptions extends {} = never> = ComponentConstructor<TOptions> & {
	readonly [componentBrand]: TOptions
}


/**
 * ## `ComponentConstructor`
 *
 * Define a new component
 *
 * @example
 * ```ts
 * export const Example = component({
 * 	name: 'example',
 * 	onMount({ append, create }) {
 * 		append('div', {
 * 			children: create('p', {
 * 				textContent: 'This is just an example'
 * 			})
 * 		})
 * 	}
 * })
 * ```
 */
export type ComponentConstructor<TOptions extends {} = never> = {
	/**
	 * Name of the component.
	 *
	 * Must be
	 * - Html-valid, `[a-z][a-z0-9\-]*`
	 * - Unique across the application. \
	 *   Duplicate names will result in duplicate style injection.
	 */
	name: string,
	/** CSS for this component only, get's wrapped in context */
	styles?: string,
	/** Custom component constructor */
	onMount(this: ComponentContext<TOptions>, context: ComponentContext<TOptions>): void | Promise<void>
	[definedAt]?: string
	[scopeId]?: string
}

/**
 * ## Create a new `component`
 *
 * @example
 * ```ts
 * export const Example = component({
 * 	name: 'example',
 * 	onMount({ append, create }) {
 * 		append('div', {
 * 			children: create('p', {
 * 				textContent: 'This is just an example'
 * 			})
 * 		})
 * 	}
 * })
 * ```
 */
export function component(constructor: ComponentConstructor): Component
export function component<TOptions extends {}>(constructor: ComponentConstructor<TOptions>): Component<TOptions>
export function component<TOptions extends {}>(constructor: ComponentConstructor<TOptions>) {

	// This is opaque by design
	constructor[scopeId] = 'r' + Math.floor(pseudoRandom() * 0xFFFFFF).toString(16)
	constructor[definedAt] = dev.appendSourceLocation?.()
	dev.componentNameCheck?.(constructor)

	return Object.assign(constructor, { [componentBrand]: true }) as unknown as Component<TOptions>
}