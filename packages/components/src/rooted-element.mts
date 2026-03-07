
export type RootedElementConstructor = CustomElementConstructor & {
	tagName: string
}

const validTagName = /^[a-z][a-z0-9-]*$/

export abstract class RootedElement extends HTMLElement {
	static rootedElement = true;

	static validateTagName(name: string): void {
		if (!validTagName.test(name)) {
			throw new Error(
				`Invalid tagName "${name}". ` +
				`Must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens.`
			)
		}
	}

	static register<TElement extends RootedElementConstructor>(element: TElement) {
		customElements.define(element.tagName, element)
	}

	constructor() {
		super()
	}

	protected abstract onMount(): void
	protected onUnmount(): void {
		// Do nothing by default
	}

	connectedCallback() {
		requestAnimationFrame(() => {
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
