import { ElementFactory } from '@rooted/elements'
import { EventBuilder } from '@rooted/elements/events'

import { GenericComponent } from './component/generic-component.mts'
import { injectStyles } from './component/styles.mts'
import { create } from './component-factory.mts'
import { devHelper } from './dev-helper.mts'

/**
 * The context passed to `onMount`. Has methods for building DOM, plus `signal`,
 * `on`, and (when the component declares options) a typed `options` field.
 *
 * @typeParam TOptions - The component's options type. Use `never` (the default) when
 *   the component takes no options.
 */
export type ComponentContext<TOptions extends object = never> = [TOptions] extends [never]
	? BaseComponentContext
	: BaseComponentContext & { options: Readonly<TOptions> }

type BaseComponentContext = & {

	/** {@inheritdoc typeof create} */
	create: typeof create
	/** {@inheritdoc ElementFactory} */
	element: ElementFactory

	/** {@inheritdoc HTMLElement['append']} */
	append: {
		<T extends GenericComponent>(node: T): T
		<T extends Node>(node: T): T
		<T extends string>(node: T): T
		<T extends Node | string | GenericComponent>(node: T): T
		<T extends [...(Node | string | GenericComponent)[]]>(...nodes: T): T
		<T extends Node | string | GenericComponent>(...nodes: T[]): T[]
		(...nodes: (Node | string | GenericComponent)[]): Node[]
	}

	/** {@inheritdoc HTMLElement['prepend']} */
	prepend: {
		<T extends Node | string | GenericComponent>(node: T): T
		<T extends [...(Node | string | GenericComponent)[]]>(...nodes: T): T
		<T extends Node | string | GenericComponent>(...nodes: T[]): T[]
		(...nodes: (Node | string | GenericComponent)[]): Node[]
	}

	/** {@inheritdoc HTMLElement['insertBefore']} */
	insertBefore: <T extends Node>(node: T, child: Node | null | undefined) => T

	/** {@inheritdoc HTMLElement['replaceChild']} */
	swap: <T extends Node>(node: Node, child: T) => T

	/** {@inheritdoc HTMLElement['replaceChildren']} */
	replace: {
		<T extends GenericComponent>(node: T): T
		<T extends Node>(node: T): T
		<T extends string>(node: T): T
		<T extends Node | string | GenericComponent>(node: T): T
		<T extends [...(Node | string | GenericComponent)[]]>(...nodes: T): T
		<T extends Node | string | GenericComponent>(...nodes: T[]): T[]
		(...nodes: (Node | string | GenericComponent)[]): Node[]
	}

	/** {@inheritdoc HTMLElement['removeChild']} */
	remove: {
		<T extends Node | string | GenericComponent>(node: T): T
		<T extends Node | string | GenericComponent>(...nodes: T[]): T[]
		(...nodes: (Node | string | GenericComponent)[]): Node[]
	}

	/**
	 * Aborts when the component unmounts, or when the page unloads. Pass it to
	 * `addEventListener` (and similar) so listeners clean up automatically.
	 */
	signal: AbortSignal

	/**
	 * Bind page-level event listeners (`window`, `document`, or rooted's `'global'` channel)
	 * tied to the component's lifetime. Listeners added through `on` are removed
	 * automatically when the component unmounts or the page unloads.
	 *
	 * @see {@link EventBuilder} for the full list of call signatures.
	 *
	 * @example
	 * ```ts
	 * on('window', 'popstate', () => { })
	 * on('document', 'visibilitychange', () => { })
	 * ```
	 */
	on: EventBuilder
}

const componentBrand: unique symbol = Symbol('@rooted/component')
export const definedAt: unique symbol = Symbol('@rooted/definedAt')

/**
 * Returns `true` when `value` was produced by {@link component}.
 *
 * @param value - Any value to test.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isComponent(value: unknown): value is Component<any> {
	return typeof value === 'object' && value !== null && componentBrand in value
}

/**
 * A {@link ComponentConstructor} that the runtime can identify and wrap in a
 * `<r-->` custom element. Build these with the {@link component} factory.
 *
 * @typeParam TOptions - The options type the component expects when mounted.
 *   Use `never` (default) for components that take no options.
 */
export type Component<TOptions extends object = never> = ComponentConstructor<TOptions> & {
	readonly [componentBrand]: TOptions
}

/**
 * The shape of a component. Pass one of these to {@link component} to get a
 * mountable {@link Component}.
 *
 * `onMount` is typed with `this` set to the {@link ComponentContext}, so you
 * can either destructure the context argument or use `this`, whichever reads
 * better for the component.
 */
export type ComponentConstructor<TOptions extends object = never> = {
	/**
	 * The component's tag suffix.
	 *
	 * Must be HTML-valid (`[a-z][a-z0-9\-]*`) and unique across the
	 * application. Duplicate names cause duplicate style injection and a
	 * dev-mode warning.
	 */
	name: string
	/**
	 * CSS for this component. Import a `.css` file through the rooted CSS
	 * loader Vite plugin and pass the result here.
	 */
	styles?: import('./component/css-artifacts.mts').CssModule
	/**
	 * Build the component's DOM. Called once when the component mounts.
	 * Receives a {@link ComponentContext}. May be `async`.
	 */
	onMount(context: ComponentContext<TOptions>): void | Promise<void>
	[definedAt]?: string
}

/**
 * Defines a new component. Returns a {@link Component} value you can pass to
 * {@link create} or `append` to mount it.
 *
 * @example
 * ```ts
 * import styles from './example.css'
 *
 * export const Example = component({
 *   name: 'example',
 *   styles,
 *   onMount({ append, element }) {
 *     append(element('p', {
 *       classes: styles.message,
 *       textContent: 'This is just an example',
 *     }))
 *   },
 * })
 * ```
 */
export function component(constructor: ComponentConstructor): Component
export function component<TOptions extends object>(constructor: ComponentConstructor<TOptions>): Component<TOptions>
export function component<TOptions extends object>(constructor: ComponentConstructor<TOptions>) {
	constructor[definedAt] = devHelper.appendSourceLocation?.()
	devHelper.componentNameCheck?.(constructor)
	if (constructor.styles) injectStyles(constructor.styles)

	return Object.assign(constructor, { [componentBrand]: true }) as unknown as Component<TOptions>
}
