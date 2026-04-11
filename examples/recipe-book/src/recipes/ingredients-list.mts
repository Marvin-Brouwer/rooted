import { component, ComponentContext } from '@rooted/components'

import { type IngredientGroup } from '../_shared/data/data.mts'

import styles from './ingredients-list.css'

export type IngredientsListOptions = {
	groups: IngredientGroup[]
}

/**
 * Renders a recipe's ingredients as a (possibly grouped) list.
 *
 * Each item gets a `data-ingredient` marker so a future shopping-list feature
 * can attach checkboxes and persistence without changing this component's
 * structure.
 *
 * @example
 * ```ts
 * create(IngredientsList, { groups: recipe.ingredients })
 * ```
 */
export const IngredientsList = component<IngredientsListOptions>({
	name: 'ingredients-list',
	styles,
	onMount({ append, element, options }) {
		append(
			element('div', {
				classes: styles.ingredients,
				children: options.groups.map(group => renderGroup(element, group)),
			}),
		)
	},
})

function renderGroup(element: ComponentContext['element'], group: IngredientGroup) {
	const listItems = group.items.map((item) => {
		const li = element('li', {
			classes: styles.item,
			textContent: item,
		})
		// Marker for the future shopping-list upgrade.
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
