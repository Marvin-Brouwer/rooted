import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { AccessibilityRoute, ContentNoticeRoute, LicensesRoute, PrivacyRoute } from '../content/_routes.mts'

import styles from './doormat.css'

export const Doormat = component({
	name: 'page-doormat',
	styles,
	onMount({ append, create }) {
		append(create('div', {
			classes: styles.doormat,
			children: [
				create('div', {
					classes: styles.inner,
					children: [
						create('p', {
							classes: styles.tagline,
							children: [
								'Recipe Book is a demo app built with the ',
								create('a', {
									href: 'https://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted',
									target: '_blank',
									rel: 'noopener noreferrer',
									classes: styles.taglineLink,
									textContent: 'Rooted framework',
								}),
								' \u2014 a minimal TypeScript library for native web components.',
							],
						}),
						create('hr', { classes: styles.rule }),
						create('div', {
							classes: styles.columns,
							children: [
								create('p', {
									classes: [
										styles.label,
										styles.applicationLabel,
									],
									textContent: 'Application',
								}),
								create('p', {
									classes: [
										styles.label,
										styles.frameworkLabel,
									],
									textContent: 'Framework',
								}),
								create('div', {
									children: [
										create('a', {
											href: 'https://github.com/Marvin-Brouwer/rooted/tree/main/examples/recipe-book#readme',
											target: '_blank',
											rel: 'noopener noreferrer',
											classes: styles.externalLink,
											textContent: 'How it\u2019s made \u2197',
										}),
										create(Link, {
											href: href.path('/stats.html'),
											target: '_blank',
											rel: 'noopener noreferrer',
											classes: styles.externalLink,
											children: 'Peek at the bundle \u2197',
										}),
										create(Link, {
											href: href.for(ContentNoticeRoute),
											classes: styles.link,
											children: 'Content notice',
										}),
									],
								}),
								create('div', {
									children: [
										create(Link, {
											href: href.for(AccessibilityRoute),
											classes: styles.link,
											children: 'Accessibility',
										}),
										create(Link, {
											href: href.for(PrivacyRoute),
											classes: styles.link,
											children: 'Privacy',
										}),
										create(Link, {
											href: href.for(LicensesRoute),
											classes: styles.link,
											children: 'Licenses',
										}),
									],
								}),
								create('div', {
									classes: styles.frameworkLinks,
									children: [
										create('a', {
											href: 'https://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted',
											target: '_blank',
											rel: 'noopener noreferrer',
											classes: styles.externalLink,
											textContent: 'View on GitHub \u2197',
										}),
										create('a', {
											href: 'https://github.com/Marvin-Brouwer/rooted/releases',
											target: '_blank',
											rel: 'noopener noreferrer',
											classes: styles.externalLink,
											textContent: 'Releases \u2197',
										}),
										create('a', {
											href: 'https://github.com/Marvin-Brouwer/rooted/issues/new',
											target: '_blank',
											rel: 'noopener noreferrer',
											classes: styles.externalLink,
											textContent: 'Report an issue \u2197',
										}),
									],
								}),
							],
						}),
					],
				}),
			],
		}))
	},
})
