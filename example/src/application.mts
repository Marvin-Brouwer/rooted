import './style.css'

import { application } from '@rooted/components/application'
import { component } from '@rooted/components'
import { router } from '@rooted/components/routing'

import { ExampleGate } from './example/_gates.mts'

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
	ExampleGate,
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