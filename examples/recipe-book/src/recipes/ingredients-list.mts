import { component, ComponentContext } from '@rooted/components'
import { localStorage } from '@rooted/storage/web'
import { type Store } from '@rooted/store'

import { type IngredientGroup, type RecipeData } from '../_shared/data/data.mts'

import styles from './ingredients-list.css'
import { Measurement, parseSegments } from './measurements.mts'
import { ServingStepper } from './serving-stepper.mts'

type CheckedRecord = Record<string, boolean>

export type IngredientsListOptions = {
	recipe: RecipeData
	servingsStore: Store<number>
}

/**
 * Renders a recipe's ingredients as a checkable shopping list.
 * Checked state is persisted to localStorage and survives page reloads.
 * A serving stepper above the list scales all measurements proportionally.
 * A reset button clears all checks and removes the stored record.
 *
 * @example
 * ```ts
 * create(IngredientsList, { recipe, servingsStore })
 * ```
 */
export const IngredientsList = component<IngredientsListOptions>({
	name: 'ingredients-list',
	styles,
	onMount({ append, element, create, options }) {
		const { recipe, servingsStore } = options
		const storageKey = `ingredients/${recipe.title}`
		const servingsKey = `servings/${recipe.title}`

		append(
			create(ServingStepper, { baseServings: recipe.servings, servingsStore, servingsKey }),
			element('form', {
				classes: styles.ingredients,
				on: { reset: () => localStorage.removeItem(storageKey) },
				children: [
					...recipe.ingredients.map(group =>
						renderGroup(element, create, group, storageKey, recipe.servings, servingsStore),
					),
					element('button', {
						type: 'reset',
						classes: styles.reset,
						textContent: 'Reset shopping list selections',
					}),
				],
			}),
		)
	},
})

function renderGroup(
	element: ComponentContext['element'],
	create: ComponentContext['create'],
	group: IngredientGroup,
	storageKey: string,
	baseServings: number,
	servingsStore: Store<number>,
) {
	const record = localStorage.get<CheckedRecord>(storageKey) ?? {}

	const listItems = group.items.map((item) => {
		const segments = parseSegments(item)
		const children = segments.map(seg => seg.type === 'text'
			? seg.text
			: create(Measurement, {
				value: seg.value,
				unit: seg.unit,
				baseServings,
				servingsStore,
			}),
		)

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
									const input = event.currentTarget
									const current = localStorage.get<CheckedRecord>(storageKey) ?? {}
									if (input.checked) current[input.name] = true
									else delete current[input.name]
									localStorage.set(storageKey, current)
								},
							},
						}),
						element('span', { children }),
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
			element('h2', {
				classes: styles.groupHeading,
				textContent: group.heading,
			}),
			list,
		],
	})
}
