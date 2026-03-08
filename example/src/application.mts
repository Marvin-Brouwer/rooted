import './style.css'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { router } from '@rooted/router'

import * as appRoutes from './_routes.g.mts'

const Router = router({
	home: component({
		name: 'home-route',
		onMount({ append }) {
			append('p', { textContent: 'Home route' })
		}
	}),
	notFound: component({
		name: 'not-found-route',
		onMount({ append }) {
			append('p', { textContent: 'Route not found' })
		}
	}),
	...appRoutes,
})

export const Application = component({
	name: 'application',
	onMount({ append, create }) {
		document.title = "ROOTED: Example app"

		append('div', {
			id: 'app',
			children: [
				create('h1', {
					textContent: 'ROOTED: Example project'
				}),
				create(Router)
			]
		})
	},
})


application(Application)