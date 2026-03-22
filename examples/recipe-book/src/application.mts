import { component } from '@rooted/components'
import { application } from '@rooted/components/application'
import { router } from '@rooted/router/application'

import { ContentBanner } from './_layout/content-banner.mts'
import { appRoutes } from './_routes.g.mts'
import styles from './application.css'
import { HomePage } from './navigation/home.mts'
import { NavigationMenu } from './navigation/navigation-menu.mts'
import { NotFoundPage } from './navigation/not-found.mts'

const Router = router({
	home: HomePage,
	notFound: NotFoundPage,
	...appRoutes,
})

export const Application = component({
	name: 'recipe-application',
	styles,
	onMount({ append, create }) {
		document.title = 'Recipe Book'
		append(create('div', {
			id: 'app',
			children: [
				create('header', {
					classes: styles.stickyHeader,
					children: [
						create(NavigationMenu),
						create(ContentBanner),
					],
				}),
				create('main', {
					children: Router,
				}),
			],
		}))
	},
})

application(Application)
