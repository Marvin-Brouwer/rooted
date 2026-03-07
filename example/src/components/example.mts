import { component } from '@rooted/components'

export const Example = component({
	name: 'example',
	onMount({ append }) {
		append('p', {
			textContent: 'this is a test'
		})
	},
})