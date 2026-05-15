import { sourceSet, source, author } from 'https://unsplash.com/photos/cooked-food-R02KgL5Ti3Y'

import { component } from '@rooted/components'

import { SearchBar } from '../search/search-bar.mts'

import styles from './hero.css'

export const Hero = component({
	name: 'page-hero',
	styles,
	onMount({ append, element, create }) {
		const section = append(element('section', { classes: styles.hero, aria: { label: 'Hero' } }))

		section.append(
			element('img', {
				classes: styles.heroBg,
				srcset: sourceSet,
				sizes: '100vw',
				alt: 'Banner picture of ratatouille.',
			}),
			element('div', {
				classes: styles.content,
				children: [
					element('h1', { textContent: 'Recipe Book' }),
					element('p', {
						classes: styles.subtitle,
						textContent: 'Discover, cook, and share your favourite recipes.',
					}),
					create(SearchBar),
				],
			}),
			element('a', {
				classes: styles.photoCredit,
				href: source,
				textContent: `Photo: ${author}`,
			}),
		)
	},
})
