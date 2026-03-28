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

const progressState: ProgressState = { navigationType: 'idle', spinnerRecommended: false, progressCount: 0 }

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
									progressState.navigationType = event.navigationType
									progressState.spinnerRecommended = event.spinnerRecommended
									if (event.navigationType === 'start') progressState.progressCount = 0
									else if (event.navigationType === 'progress') progressState.progressCount++
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
