import { component } from '@rooted/components'

import styles from './accessibility.css'

export const Accessibility = component({
	name: 'accessibility-page',
	styles,
	onMount({ append, element }) {
		append(element('div', {
			classes: styles.page,
			children: [
				element('h1', { textContent: 'Accessibility' }),
				element('p', {
					classes: styles.lead,
					textContent: 'Recipe Book is built with native web components. Because custom elements extend standard HTML elements and use the browser\'s own rendering pipeline, many accessibility behaviours are provided by the platform rather than the framework.',
				}),

				element('h2', { textContent: 'Keyboard navigation' }),
				element('p', {
					textContent: 'All interactive elements — links, buttons, and form inputs — are reachable by Tab key and activatable by Enter or Space. No keyboard traps exist in this application.',
				}),

				element('h2', { textContent: 'Colour contrast' }),
				element('p', {
					textContent: 'Text and interactive elements are styled to meet WCAG 2.1 Level AA minimum contrast ratios. The primary red tone used for links and headings achieves a contrast ratio above 4.5:1 against the light page background.',
				}),

				element('h2', { textContent: 'ARIA and semantics' }),
				element('p', {
					textContent: 'Components use semantic HTML as their foundation — landmark regions, a consistent heading hierarchy, and native form elements. ARIA attributes are added only where native semantics are insufficient, such as the demo-content screen-reader alert in the site header.',
				}),

				element('h2', { textContent: 'Report an issue' }),
				element('p', {
					children: [
						'If you encounter an accessibility barrier, please ',
						element('a', {
							href: 'https://github.com/Marvin-Brouwer/rooted/issues/new',
							target: '_blank',
							rel: 'noopener noreferrer',
							textContent: 'open an issue on GitHub',
						}),
						'.',
					],
				}),
			],
		}))
	},
})
