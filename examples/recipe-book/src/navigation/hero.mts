import styles from './hero.css'

import { component } from '@rooted/components'
import { SearchBar } from '../search/search-bar.mts'

export const Hero = component({
	name: 'page-hero',
	styles,
	onMount({ append, create }) {
		const section = append(create('section', { classes: styles.hero }))

		section.append(
			create('div', {
				classes: styles.content,
				children: [
					create('h1', { textContent: 'Recipe Book' }),
					create('p', { classes: styles.subtitle, textContent: 'Discover, cook, and share your favourite recipes.' }),
					create(SearchBar),
				],
			}),
			create('p', { classes: styles.photoCredit, textContent: 'Photo: amirali mirhashemian / Unsplash' }),
		)
	},
})
