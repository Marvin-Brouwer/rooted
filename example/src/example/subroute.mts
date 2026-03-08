import { component } from '@rooted/components'

export const SubRoute = component({
	name: 'example-subroute',
	onMount({ append }) {
		append('p', {
			textContent: `Subrouted`
		})
	},
})
