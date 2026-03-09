import './style.css'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { router } from '@rooted/router'

import { appRoutes } from './_routes.g.mts'
import { HomePage } from './navigation/home.mts'
import { NotFoundPage } from './navigation/not-found.mts'
import { NavigationMenu } from './navigation/navigation-menu.mts'

const Router = router({
	home: HomePage,
	notFound: NotFoundPage,
	...appRoutes,
})

export const Application = component({
	name: 'recipe-application',
	onMount({ append, create }) {
		document.title = 'Recipe Book'
		append('div', {
			id: 'app',
			children: [
				create(NavigationMenu),
				create('main', {
					children: create(Router),
				}),
			],
		})
	},
})

application(Application)
