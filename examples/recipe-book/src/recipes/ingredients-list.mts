import { component, ComponentContext } from '@rooted/components'
import { localStorage } from '@rooted/storage/web'

import { type IngredientGroup, type RecipeData } from '../_shared/data/data.mts'

import styles from './ingredients-list.css'

type CheckedRecord = Record<string, boolean>

export type IngredientsListOptions = {
	recipe: RecipeData
}

/**
 * Renders a recipe's ingredients as a checkable shopping list.
 * Checked state is persisted to localStorage and survives page reloads.
 * A reset button clears all checks and removes the stored record.
 *
 * @example
 * ```ts
 * create(IngredientsList, { recipe })
 * ```
 */
export const IngredientsList = component<IngredientsListOptions>({
	name: 'ingredients-list',
	styles,
	onMount({ append, element, options }) {
		const storageKey = `ingredients/${options.recipe.title}`

		append(
			element('form', {
				classes: styles.ingredients,
				on: { reset: () => localStorage.removeItem(storageKey) },
				children: [
					...options.recipe.ingredients.map(group => renderGroup(element, group, storageKey)),
					element('button', {
						type: 'reset',
						classes: styles.reset,
						textContent: 'Reset list',
					}),
				],
			}),
		)
	},
})

function renderGroup(element: ComponentContext['element'], group: IngredientGroup, storageKey: string) {
	const record = localStorage.get<CheckedRecord>(storageKey) ?? {}

	const listItems = group.items.map((item) => {
		const li = element('li', {
			classes: styles.item,
			children: [
				element('label', {
					classes: styles.label,
					children: [
						element('input', {
							type: 'checkbox',
							name: item,
							checked: record[item] === true,
							classes: styles.checkbox,
							on: {
								change(event) {
									const input = event.currentTarget as HTMLInputElement
									const current = localStorage.get<CheckedRecord>(storageKey) ?? {}
									if (input.checked) current[input.name] = true
									else delete current[input.name]
									localStorage.set(storageKey, current)
								},
							},
						}),
						element('span', {
							textContent: item
						}),
					],
				}),
			],
		})
		li.dataset.ingredient = ''
		return li
	})

	const list = element('ul', {
		classes: styles.items,
		children: listItems,
	})

	if (!group.heading) return list

	return element('section', {
		classes: styles.group,
		children: [
			element('h3', {
				classes: styles.groupHeading,
				textContent: group.heading,
			}),
			list,
		],
	})
}
