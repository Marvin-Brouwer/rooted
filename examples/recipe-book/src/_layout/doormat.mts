import { component } from '@rooted/components'
import { href, Link } from '@rooted/router'

import { AccessibilityRoute, ContentNoticeRoute, LicensesRoute, PrivacyRoute } from '../content/_routes.mts'

import styles from './doormat.css'

export const Doormat = component({
	name: 'page-doormat',
	styles,
	onMount({ append, element, create }) {
		append(
			element('div', {
				classes: styles.doormat,
				children: [
					element('div', {
						classes: styles.inner,
						children: [
							element('p', {
								classes: styles.tagline,
								children: [
									'Recipe Book is a demo app built with the ',
									element('a', {
										href: 'https://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted',
										target: '_blank',
										rel: 'noopener noreferrer',
										classes: styles.taglineLink,
										textContent: 'Rooted framework',
										aria: {
											label: 'Rooted framework (opens in new tab)',
										},
									}),
									' \u2014 a minimal TypeScript library for native web components.',
								],
							}),
							element('button', {
								type: 'button',
								classes: styles.scrollTop,
								textContent: 'Back to top',
								on: {
									click: () => globalThis.scrollTo({ top: 0, behavior: 'smooth' }),
								},
							}),
							element('hr', { classes: styles.rule }),
							element('div', {
								classes: styles.columns,
								children: [
									element('h4', {
										classes: [
											styles.label,
											styles.applicationLabel,
										],
										textContent: 'Application',
									}),
									element('h4', {
										classes: [
											styles.label,
											styles.frameworkLabel,
										],
										textContent: 'Framework',
									}),
									element('div', {
										children: [
											element('a', {
												href: 'https://github.com/Marvin-Brouwer/rooted/tree/main/examples/recipe-book#readme',
												target: '_blank',
												rel: 'noopener noreferrer',
												classes: styles.externalLink,
												textContent: 'How it\u2019s made \u2197',
												aria: {
													label: 'How it’s made (opens in new tab)',
												},
											}),
											create(Link, {
												href: href.path('/stats.html'),
												target: '_blank',
												rel: 'noopener noreferrer',
												classes: styles.externalLink,
												children: 'Peek at the bundle \u2197',
												aria: {
													label: 'Peek at the bundle (opens in new tab)',
												},
											}),
											create(Link, {
												href: href.for(ContentNoticeRoute),
												classes: styles.link,
												children: 'Content notice',
											}),
										],
									}),
									element('div', {
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
									element('div', {
										classes: styles.frameworkLinks,
										children: [
											element('a', {
												href: 'https://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted',
												target: '_blank',
												rel: 'noopener noreferrer',
												classes: styles.externalLink,
												textContent: 'View on GitHub \u2197',
												aria: {
													label: 'View on GitHub (opens in new tab)',
												},
											}),
											element('a', {
												href: 'https://github.com/Marvin-Brouwer/rooted/releases',
												target: '_blank',
												rel: 'noopener noreferrer',
												classes: styles.externalLink,
												textContent: 'Releases \u2197',
												aria: {
													label: 'Releases (opens in new tab)',
												},
											}),
											element('a', {
												href: 'https://github.com/Marvin-Brouwer/rooted/issues/new',
												target: '_blank',
												rel: 'noopener noreferrer',
												classes: styles.externalLink,
												textContent: 'Report an issue \u2197',
												aria: {
													label: 'Report an issue (opens in new tab)',
												},
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
