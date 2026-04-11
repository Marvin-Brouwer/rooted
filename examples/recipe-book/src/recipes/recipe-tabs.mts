import { component } from '@rooted/components'
import { TargetedEvent } from '@rooted/components/events'

import styles from './recipe-tabs.css'

/**
 * A tab in a {@link RecipeTabs} group.
 * `panel` is the node that should show when this tab is active. The tabs
 * component takes ownership of the node and moves it into a tabpanel wrapper.
 */
export type RecipeTab = {
	id: string
	label: string
	panel: Node
}

export type RecipeTabsOptions = {
	tabs: RecipeTab[]
	/** Which tab id is visible on first mount. Defaults to the first tab. */
	initial?: string
}

let tabGroupId = 0

/**
 * Tab group for the recipe page, used to split the body into an Ingredients
 * panel and an Instructions panel.
 *
 * The component renders a `role="tablist"` with `role="tab"` buttons and one
 * `role="tabpanel"` per tab. Inactive panels are hidden via the `hidden`
 * attribute. Keyboard nav follows the WAI-ARIA Tabs pattern: Left/Right cycle
 * focus between tabs, Home/End jump to the ends, Space/Enter activate.
 *
 * @example
 * ```ts
 * create(RecipeTabs, {
 *   tabs: [
 *     { id: 'ingredients',  label: 'Ingredients',  panel: ingredientsNode },
 *     { id: 'instructions', label: 'Instructions', panel: instructionsNode },
 *   ],
 * })
 * ```
 */
export const RecipeTabs = component<RecipeTabsOptions>({
	name: 'recipe-tabs',
	styles,
	onMount({ append, element, options }) {
		const { tabs } = options
		if (tabs.length === 0) return

		const groupId = `recipe-tabs-${++tabGroupId}`
		const requestedIndex = options.initial
			? tabs.findIndex(tab => tab.id === options.initial)
			: 0
		let activeIndex = Math.max(0, requestedIndex)

		const buttons: HTMLButtonElement[] = []
		const panels: HTMLDivElement[] = []

		function setActive(nextIndex: number, focus = false) {
			activeIndex = nextIndex
			for (const [index, button] of buttons.entries()) {
				const selected = index === activeIndex
				button.ariaSelected = selected ? 'true' : 'false'
				button.tabIndex = selected ? 0 : -1
				panels[index].hidden = !selected
			}
			if (focus) buttons[activeIndex]?.focus()
		}

		function handleKeydown(event: TargetedEvent<KeyboardEvent, HTMLButtonElement>) {
			switch (event.key) {
				case 'ArrowRight': {
					event.preventDefault()
					setActive((activeIndex + 1) % tabs.length, true)
					break
				}
				case 'ArrowLeft': {
					event.preventDefault()
					setActive((activeIndex - 1 + tabs.length) % tabs.length, true)
					break
				}
				case 'Home': {
					event.preventDefault()
					setActive(0, true)
					break
				}
				case 'End': {
					event.preventDefault()
					setActive(tabs.length - 1, true)
					break
				}
			}
		}

		for (const [index, tab] of tabs.entries()) {
			const tabId = `${groupId}-tab-${tab.id}`
			const panelId = `${groupId}-panel-${tab.id}`
			const selected = index === activeIndex

			const button = element('button', {
				type: 'button',
				id: tabId,
				classes: styles.tab,
				textContent: tab.label,
				role: 'tab',
				tabIndex: selected ? 0 : -1,
				aria: {
					selected: selected ? 'true' : 'false',
					controls: panelId,
				},
				on: {
					click: () => setActive(index),
					keydown: handleKeydown,
				},
			})
			buttons.push(button)

			const panel = element('div', {
				id: panelId,
				classes: styles.panel,
				role: 'tabpanel',
				aria: {
					labelledBy: tabId,
				},
				children: tab.panel,
			})
			panel.hidden = !selected
			panels.push(panel)
		}

		append(
			element('div', {
				classes: styles.tablist,
				role: 'tablist',
				children: buttons,
			}),
			...panels,
		)
	},
})
