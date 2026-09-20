import { component } from '@rooted/components'
import { Aria, CssClasses } from '@rooted/components/elements'
import { applyUpdate, onUpdateReady } from '@rooted/pwa'

/** Options for {@link ApplyUpdateButton}. */
export type ApplyUpdateButtonOptions = {
	/** Text on the button. */
	label: string
	/** CSS class name applied to the rendered `<button>` element. */
	classes?: CssClasses
	aria?: Aria
}

/**
 * A `<button>` that takes the waiting version and reloads onto it.
 * Disabled until there is something to take.
 *
 * It ships without styles.
 * Pass `classes` and style it like any other button in your app.
 *
 * Reloading throws away whatever the page holds in memory,
 * which is why this is a button and not something rooted does on its own.
 *
 * @example
 * ```ts
 * create(ApplyUpdateButton, {
 *   label: 'Reload',
 *   classes: styles.reload,
 * })
 * ```
 *
 * @see {@link UpdateNotification} to render it only when there's an update
 */
export const ApplyUpdateButton = component<ApplyUpdateButtonOptions>({
	name: '@rooted/apply-update-button',
	onMount({ options, append, element, signal }) {
		const { label, classes, aria } = options

		const button = element('button', {
			aria,
			type: 'button',
			classes,
			disabled: true,
			textContent: label,
			on: {
				click: () => {
					button.disabled = true
					void applyUpdate()
				},
			},
		})

		onUpdateReady(signal, () => {
			button.disabled = false
		})

		append(button)
	},
})
