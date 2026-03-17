import { GenericComponent } from './component/generic-component.mts'
import { injectStyles } from './component/styles.mts'
import { devHelper } from './dev-helper.mts'
import { create } from './element-factory.mts'

/**
 * ## `ComponentContext`
 *
 * Properties for internal component logic
 */
export type ComponentContext<TOptions extends {} = never> = [TOptions] extends [never]
	? BaseComponentContext
	: BaseComponentContext & { options: Readonly<TOptions> }

type BaseComponentContext = & {

	/** {@inheritdoc typeof create} */
	create: typeof create

	/** {@inheritdoc HTMLElement['append']} */
	append<T extends Node | string | GenericComponent>(this: void, node: T): T
	append<T extends Node | string | GenericComponent>(this: void, ...node: T[]): T[]
	append(this: void, ...nodes: (Node | string | GenericComponent)[]): Node[]

	/** {@inheritdoc HTMLElement['prepend']} */
	prepend<T extends Node | string | GenericComponent>(this: void, node: T): T
	prepend<T extends Node | string | GenericComponent>(this: void, ...node: T[]): T[]
	prepend(this: void, ...nodes: (Node | string | GenericComponent)[]): Node[]

	/** {@inheritdoc HTMLElement['insertBefore']} */
	insertBefore<T extends Node>(this: void, node: T, child: Node | null | undefined): T

	/** {@inheritdoc HTMLElement['replaceChild']} */
	swap<T extends Node>(this: void, node: Node, child: T): T

	/** {@inheritdoc HTMLElement['replaceChildren']} */
	replace<T extends Node | string | GenericComponent>(this: void, node: T): T
	replace<T extends Node | string | GenericComponent>(this: void, ...node: T[]): T[]
	replace(this: void, ...nodes: (Node | string | GenericComponent)[]): Node[]

	/** {@inheritdoc HTMLElement['removeChild']} */
	remove<T extends Node | string | GenericComponent>(this: void, node: T): T
	remove<T extends Node | string | GenericComponent>(this: void, ...node: T[]): T[]
	remove(this: void, ...nodes: (Node | string | GenericComponent)[]): Node[]

	/**
	 * Lifetime signal for the component, aborts when unmounted \
	 * automatically aborts when page unloads
	 */

	signal: AbortSignal
}

const componentBrand: unique symbol = Symbol('@rooted/component')
export const definedAt: unique symbol = Symbol('@rooted/definedAt')

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
 * brand symbol so the runtime can identify it and wrap it in a `<r-->` custom
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
 * import styles from './example.css'
 *
 * export const Example = component({
 * 	name: 'example',
 * 	styles,
 * 	onMount({ append, create }) {
 * 		append(
 * 			create('p', {
 * 				classes: styles.message,
 * 				textContent: 'This is just an example'
 * 			})
 * 		)
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
	name: string
	/**
	 * CSS for this component, provided as a {@link CssModule}
	 * imported from a `.css` file via the rooted CSS loader Vite plugin.
	 */
	styles?: import('./component/css-artifacts.mts').CssModule
	/** Custom component constructor */
	onMount(context: ComponentContext<TOptions>): void | Promise<void>
	[definedAt]?: string
}

/**
 * ## Create a new `component`
 *
 * @example
 * ```ts
 * import styles from './example.css'
 *
 * export const Example = component({
 * 	name: 'example',
 * 	styles,
 * 	onMount({ append, create }) {
 * 		append(
 * 			create('p', {
 * 				classes: styles.message,
 * 				textContent: 'This is just an example'
 * 			})
 * 		)
 * 	}
 * })
 * ```
 */
export function component(constructor: ComponentConstructor): Component
export function component<TOptions extends {}>(constructor: ComponentConstructor<TOptions>): Component<TOptions>
export function component<TOptions extends {}>(constructor: ComponentConstructor<TOptions>) {
	constructor[definedAt] = devHelper.appendSourceLocation?.()
	devHelper.componentNameCheck?.(constructor)
	if (constructor.styles) injectStyles(constructor.styles)

	return Object.assign(constructor, { [componentBrand]: true }) as unknown as Component<TOptions>
}
