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
			title: `Reset to ${servingLabel(baseServings)}`,
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
			title: 'Decrease servings',
		})
		addHoldRepeat(decreaseButton, () => servingsStore.update(n => Math.max(1, n - 1)), signal)

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
			title: 'Increase servings',
		})
		addHoldRepeat(increaseButton, () => servingsStore.update(n => n + 1), signal)

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
			}
			else {
				localStorage.set(servingsKey, current)
			}
		})
	},
})

function servingLabel(n: number): string {
	return `${n} serving${n === 1 ? '' : 's'}`
}

/**
 * Adds hold-to-repeat behavior to a button.
 *
 * - Pointer (mouse / touch): fires action immediately on pointerdown, then
 *   repeats every 80 ms after a 500 ms hold delay.
 * - Keyboard (Enter / Space): fires action once on click (detail === 0).
 *
 * Pointer capture keeps the repeat running even if the pointer drifts off
 * the button. All listeners are removed when signal aborts.
 */
function addHoldRepeat(button: HTMLButtonElement, action: () => void, signal: AbortSignal): void {
	let holdTimeout: ReturnType<typeof setTimeout> | undefined
	let holdInterval: ReturnType<typeof setInterval> | undefined

	function stop() {
		clearTimeout(holdTimeout)
		clearInterval(holdInterval)
		holdTimeout = undefined
		holdInterval = undefined
	}

	// Keyboard-initiated clicks (Enter / Space) have detail === 0.
	button.addEventListener('click', (event) => {
		if (event.detail === 0) action()
	}, { signal })

	button.addEventListener('pointerdown', (event) => {
		button.setPointerCapture(event.pointerId)
		action()
		holdTimeout = setTimeout(() => {
			holdInterval = setInterval(action, 80)
		}, 500)
	}, { signal })

	button.addEventListener('pointerup', stop, { signal })
	button.addEventListener('pointercancel', stop, { signal })
	button.addEventListener('contextmenu', (event) => { event.preventDefault() }, { signal })
}
