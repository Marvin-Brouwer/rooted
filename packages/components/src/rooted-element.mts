
export type RootedElementConstructor = CustomElementConstructor & {
	tagName: string
}

const validTagName = /^[a-z][a-z0-9\-]*$/

export abstract class RootedElement extends HTMLElement {
	static rootedElement = true;

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

	static register<TElement extends RootedElementConstructor>(element: TElement) {
		RootedElement.validateTagName(element.tagName)
		customElements.define(element.tagName, element)
	}

	protected abstract onMount(): void
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
