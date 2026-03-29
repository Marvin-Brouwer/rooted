import { component } from '@rooted/components'
import { application } from '@rooted/components/application'
import { router } from '@rooted/router/application'

import { ContentBanner } from './_layout/content-banner.mts'
import { Doormat } from './_layout/doormat.mts'
import { appRoutes } from './_routes.g.mts'
import styles from './application.css'
import { HomePage } from './navigation/home.mts'
import { NavigationMenu } from './navigation/navigation-menu.mts'
import { NotFoundPage } from './navigation/not-found.mts'
import { RouteProgress, type ProgressState } from './navigation/route-progress.mts'

const progressState: ProgressState = {}

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

		append(
			create(RouteProgress, { progressState }),
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
									switch (event.navigationType) {
										case 'start': {
											progressState[event.href] = { progress: 0, done: false }
											break
										}
										case 'progress': {
											const entry = progressState[event.href]
											if (!entry) return
											entry.progress = entry.progress === 0
												? Math.random() * 30
												: entry.progress + Math.random() * (90 - entry.progress)
											break
										}
										case 'end': {
											progressState[event.href] = { progress: 100, done: false }
											progressState[event.href] = { progress: 100, done: true }
											break
										}
									// No default
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
