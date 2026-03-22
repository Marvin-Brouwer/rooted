import { component } from '@rooted/components'
import { sourceSet, source, author } from 'https://unsplash.com/photos/cooked-food-R02KgL5Ti3Y'

import { SearchBar } from '../search/search-bar.mts'

import styles from './hero.css'

export const Hero = component({
	name: 'page-hero',
	styles,
	onMount({ append, create }) {
		const section = append(create('section', { classes: styles.hero }))

		section.append(
			create('img', {
				classes: styles.heroBg,
				srcset: sourceSet,
				sizes: '100vw',
				alt: 'Banner picture of ratatouille.',
			}),
			create('div', {
				classes: styles.content,
				children: [
					create('h1', { textContent: 'Recipe Book' }),
					create('p', {
						classes: styles.subtitle,
						textContent: 'Discover, cook, and share your favourite recipes.',
					}),
					create(SearchBar),
				],
			}),
			create('a', {
				classes: styles.photoCredit,
				href: source,
				textContent: `Photo: ${author}`,
			}),
		)
	},
})
