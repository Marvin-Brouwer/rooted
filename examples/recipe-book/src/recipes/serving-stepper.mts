import { component } from '@rooted/components'
import { localStorage } from '@rooted/storage/web'
import { type Store } from '@rooted/store'

import styles from './serving-stepper.css'

export type ServingStepperOptions = {
	/** The recipe's default serving count — used for the reset target and disabled state. */
	baseServings: number
	/** Shared store updated by +/− and reset. */
	servingsStore: Store<number>
	/** localStorage key for persisting the selected serving count. */
	servingsKey: string
}

/**
 * A stepper that lets the user adjust the serving count for a recipe.
 * Changes are persisted to localStorage and restored on next visit.
 * The reset button is disabled when already at the base serving count.
 * The decrease button is disabled at 1 serving.
 *
 * @example
 * ```ts
 * create(ServingStepper, { baseServings: recipe.servings, servingsStore, servingsKey })
 * ```
 */
export const ServingStepper = component<ServingStepperOptions>({
	name: 'serving-stepper',
	styles,
	onMount({ append, element, options, signal }) {
		const { baseServings, servingsStore, servingsKey } = options

		const resetButton = element('button', {
			type: 'button',
			classes: styles.resetBtn,
			textContent: '↺',
			disabled: servingsStore.value === baseServings,
			aria: { label: `Reset to ${servingLabel(baseServings)}` },
			on: {
				click() {
					servingsStore.update(() => baseServings)
				},
			},
		})

		const decreaseButton = element('button', {
			type: 'button',
			classes: styles.btn,
			textContent: '−',
			disabled: servingsStore.value === 1,
			aria: { label: 'Decrease servings' },
			on: {
				click() {
					servingsStore.update(n => Math.max(1, n - 1))
				},
			},
		})

		const countSpan = element('span', {
			classes: styles.count,
			textContent: servingLabel(servingsStore.value),
			aria: { live: 'polite', atomic: 'true' },
		})

		const increaseButton = element('button', {
			type: 'button',
			classes: styles.btn,
			textContent: '+',
			aria: { label: 'Increase servings' },
			on: {
				click() {
					servingsStore.update(n => n + 1)
				},
			},
		})

		append(
			element('div', {
				role: 'group',
				aria: { label: 'Serving size' },
				classes: styles.stepper,
				children: [resetButton, decreaseButton, countSpan, increaseButton],
			}),
		)

		servingsStore.on('change', signal, ({ detail }) => {
			const current = detail.state
			countSpan.textContent = servingLabel(current)
			decreaseButton.disabled = current === 1
			resetButton.disabled = current === baseServings
			if (current === baseServings) {
				localStorage.removeItem(servingsKey)
			} else {
				localStorage.set(servingsKey, current)
			}
		})
	},
})

function servingLabel(n: number): string {
	return `${n} serving${n === 1 ? '' : 's'}`
}
