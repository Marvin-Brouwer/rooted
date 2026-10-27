import { environment } from '@rooted/util'

/**
 * Constructor shape that {@link RootedElement.register} accepts.
 * Any class that extends {@link RootedElement} satisfies this as long as it declares a `static tagName`.
 */
export type RootedElementConstructor = CustomElementConstructor & {
	tagName: string
}

const validTagName = /^[a-z][a-z0-9\\-]*$/

/**
 * Abstract base for low-level custom elements. Reach for this when you want a specific tag name, attribute observation,
 * or shadow DOM. For most components,
 * use {@link Component} instead.
 *
 * `RootedElement` wraps the standard custom-element lifecycle to:
 *
 * - Mount straight away the first time the element connects, so whoever appended it sees its content
 *   as soon as `append` returns. A parent's `onMount` can read what its children put in.
 * - Skip spurious `connectedCallback` / `disconnectedCallback` calls caused by re-parenting.
 *   Every later connect, and every disconnect, is deferred with `queueMicrotask`
 *   and only fires when the element's connection state actually changed.
 * - Validate that the tag name is hyphenated and lowercase before registration.
 *
 * @example
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
 */
export abstract class RootedElement extends HTMLElement {
	static rootedElement = true

	/**
	 * Throws when `name` isn't a legal custom-element tag name.
	 * A legal name matches `[a-z][a-z0-9\-]*` and contains at least one hyphen (a requirement of the custom-elements spec).
	 *
	 * @throws {Error} When the name is invalid.
	 */
	static validateTagName(name: string): void {
		if (!validTagName.test(name)) {
			throw new Error(
				`Invalid tagName "${name}". \n`
				+ `Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`,
			)
		}
		if (!name.includes('-')) {
			throw new Error(
				`Invalid tagName "${name}". \n`
				+ `Custom elements must contain a hyphen (e.g. "my-element").`,
			)
		}
	}

	/**
	 * Validates `element.tagName` and registers it with `customElements.define`.
	 * Call once per element class, at module level after the class definition.
	 *
	 * @throws {Error} When `element.tagName` is not a valid custom-element name.
	 */
	static register<TElement extends RootedElementConstructor>(element: TElement) {
		RootedElement.validateTagName(element.tagName)
		customElements.define(element.tagName, element)
	}

	/**
	 * Called once after the element is connected to the document. Build child nodes, attach listeners, start timers here.
	 *
	 * The first connect runs it right away, inside the `append` (or whatever call) that connected the element.
	 * So mount order is parent first, then each child as the parent appends it.
	 * Pre-rendering always mounts right away too.
	 *
	 * After that it's deferred via `queueMicrotask`, and only fires when the element is truly connected,
	 * not when it's being re-parented.
	 */
	protected abstract onMount(): void

	/**
	 * Called once after the element is disconnected. Override to clean up anything started in {@link onMount}. Defaults to a no-op.
	 *
	 * Deferred via `queueMicrotask` and only fires when the element is truly disconnected, not when it's being re-parented.
	 */
	protected onUnmount(): void {
		// Do nothing by default
	}

	#hasMounted = false

	connectedCallback() {
		// The first mount can't be a re-parent, and pre-rendering has no re-parents to wait for:
		// mount now, so whoever appended this sees its content straight away.
		if (!this.#hasMounted || environment.is('preRenderer')) {
			this.#mount()
			return
		}
		queueMicrotask(() => {
			// Skip re-parenting
			if (!this.isConnected) return
			this.#mount()
		})
	}

	#mount() {
		this.#hasMounted = true
		this.onMount()
	}

	disconnectedCallback() {
		queueMicrotask(() => {
			// Skip re-parenting
			if (this.isConnected) return
			this.onUnmount()
		})
	}
}
