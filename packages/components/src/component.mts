import { seededId } from '@rooted/util'
import { dev } from './dev-helper.mts'
import { create } from './element-factory.mts'

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

/**
 * Type guard that tests whether `value` is a {@link Component} produced by
 * {@link component}.
 *
 * @param value - Any value to test.
 * @returns `true` if `value` carries the internal component brand symbol.
 */
export function isComponent(value: unknown): value is Component<any> {
	return typeof value === 'object' && value !== null && componentBrand in value
}

/**
 * A rooted component — a {@link ComponentConstructor} enriched with an internal
 * brand symbol so the runtime can identify it and wrap it in a `<r-gc>` custom
 * element.
 *
 * Create components with the {@link component} factory rather than
 * constructing this type directly.
 *
 * @typeParam TOptions - The options type the component expects when mounted.
 *   Use `never` (default) for components that take no external options.
 */
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
 *
 * @remarks
 * The onMount signature has a typed `this` in scope. \
 * This is by design, offering you the option to destructure the context
 * but also using `this` if necessary
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
	onMount(context: ComponentContext<TOptions>): void | Promise<void>
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

	// Stable hash of the component name — safe to cache across page loads and builds
	constructor[scopeId] = 'r' + seededId(constructor.name)
	constructor[definedAt] = dev.appendSourceLocation?.()
	dev.componentNameCheck?.(constructor)

	return Object.assign(constructor, { [componentBrand]: true }) as unknown as Component<TOptions>
}