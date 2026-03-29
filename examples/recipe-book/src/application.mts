import { component } from '@rooted/components'
import { application } from '@rooted/components/application'
import { router } from '@rooted/router/application'

import { ContentBanner } from './_layout/content-banner.mts'
import { Doormat } from './_layout/doormat.mts'
import { appRoutes } from './_routes.g.mts'
import styles from './application.css'
import { HomePage } from './navigation/home.mts'
import { NavigationMenu } from './navigation/navigation-menu.mts'
import { NavigationProgress, NavigationSpinner } from './navigation/navigation-progress.mts'
import { NotFoundPage } from './navigation/not-found.mts'

const Router = router({
	home: HomePage,
	notFound: NotFoundPage,
	...appRoutes,
})

export const Application = component({
	name: 'recipe-application',
	styles,
	onMount({ append, element, create }) {
		document.title = 'Recipe Book'

		const progress: Record<string, { done: boolean }> = {}

		const spinner = create(NavigationSpinner)

		append(
			element('div', {
				id: 'app',
				children: [
					element('header', {
						classes: styles.stickyHeader,
						children: [
							create(NavigationMenu),
							create(ContentBanner),
						],
					}),
					element('main', {
						id: 'main-content',
						children: create(Router, {
							viewTransition: true,
							scrollBehavior: { scrollToTop: 'on:start-and-end' },
							on: {
								navigate(event) {
									if (event.spinnerRecommended) {
										document.documentElement.classList.add('navigating')
										append(spinner)
									}
									else {
										document.documentElement.classList.remove('navigating')
										spinner.remove()
									}

									if (event.navigationType === 'start') {
										if (progress[event.href]) return
										progress[event.href] = { done: false }

										append(create(NavigationProgress, { href: event.href, state: progress[event.href] }))
									}
									if (event.navigationType === 'end') {
										progress[event.href].done = true
										requestAnimationFrame(() => delete progress[event.href])
										document.documentElement.classList.remove('navigating')
										spinner.remove()
									}
								},
							},
						}),
					}),
					element('footer', {
						children: [create(Doormat)],
					}),
				],
			}),
		)
	},
})

application(Application)
