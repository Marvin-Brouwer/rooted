
/**
 * Constructor shape expected by {@link RootedElement.register}.
 *
 * Any class that extends {@link RootedElement} automatically satisfies this
 * type as long as it declares a `static tagName` property.
 */
export type RootedElementConstructor = CustomElementConstructor & {
	tagName: string
}

const validTagName = /^[a-z][a-z0-9\-]*$/

/**
 * Abstract base class for native custom elements in a rooted application.
 *
 * Extend this class when you need to create a reusable, low-level HTML element
 * (rather than a higher-level functional {@link Component}). `RootedElement`
 * wraps the standard custom-element lifecycle to:
 *
 * - Guard against spurious `connectedCallback` / `disconnectedCallback` calls
 *   caused by DOM re-parenting (both callbacks are deferred with `queueMicrotask`
 *   and only fire when the element's connection state has actually changed).
 * - Enforce valid, hyphenated custom-element tag names at registration time.
 *
 * @example Defining and registering a custom element
 * ```ts
 * import { RootedElement } from '@rooted/components/elements'
 *
 * export class MyCounter extends RootedElement {
 *   static tagName = 'my-counter'
 *
 *   protected onMount() {
 *     this.textContent = 'mounted'
 *   }
 *
 *   protected onUnmount() {
 *     this.textContent = ''
 *   }
 * }
 *
 * RootedElement.register(MyCounter)
 * ```
 *
 * @example Using a custom element inside a component
 * ```ts
 * import { component } from '@rooted/components'
 * import { MyCounter } from './my-counter.mts'
 *
 * export const Page = component({
 *   name: 'page',
 *   onMount({ append }) {
 *     append(MyCounter, {})
 *   }
 * })
 * ```
 */
export abstract class RootedElement extends HTMLElement {
	static rootedElement = true;

	/**
	 * Validates that `name` is a legal custom-element tag name.
	 *
	 * Throws if the name:
	 * - Does not match `[a-z][a-z0-9-]*`
	 * - Does not contain at least one hyphen (required by the custom-elements spec)
	 *
	 * @param name - The tag name to validate.
	 * @throws {Error} When the name is invalid.
	 */
	static validateTagName(name: string): void {
		if (!validTagName.test(name)) {
			throw new Error(
				`Invalid tagName "${name}". ` +
				`Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`
			)
		}
		if (!name.includes('-')) {
			throw new Error(
				`Invalid tagName "${name}". ` +
				`Custom elements must contain a hyphen (e.g. "my-element").`
			)
		}
	}

	/**
	 * Validates the element's `tagName` and registers it with
	 * `customElements.define`.
	 *
	 * Call this once per element class, typically at module level after the
	 * class definition.
	 *
	 * @param element - The element class to register.
	 * @throws {Error} When `element.tagName` is not a valid custom-element name.
	 */
	static register<TElement extends RootedElementConstructor>(element: TElement) {
		RootedElement.validateTagName(element.tagName)
		customElements.define(element.tagName, element)
	}

	/**
	 * Called once after the element is connected to the document.
	 *
	 * Implement your DOM setup logic here: create child nodes, attach event
	 * listeners, start timers, etc.
	 *
	 * @remarks
	 * Deferred via `queueMicrotask` and guarded so it only fires when the
	 * element is truly connected — not when it is being re-parented.
	 */
	protected abstract onMount(): void

	/**
	 * Called once after the element is disconnected from the document.
	 *
	 * Override to clean up resources created in {@link onMount} (event
	 * listeners, subscriptions, timers, etc.). The default implementation is
	 * a no-op.
	 *
	 * @remarks
	 * Deferred via `queueMicrotask` and guarded so it only fires when the
	 * element is truly disconnected — not when it is being re-parented.
	 */
	protected onUnmount(): void {
		// Do nothing by default
	}

	connectedCallback() {
		queueMicrotask(() => {
			// Skip re-parenting
			if (!this.isConnected) return
			this.onMount()
		})
	}

	disconnectedCallback() {
		queueMicrotask(() => {
			// Skip re-parenting
			if (this.isConnected) return
			this.onUnmount()
		})
	}
}
