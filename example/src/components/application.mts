import { component } from '@rooted/components'
import { Example } from './example.mjs'

export const Application = component({
	name: 'application',
	onMount({ append, create }) {
		append('div', {
			children: create(Example, { text: 'child text' })
		})
	},
})