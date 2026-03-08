import { component } from '@rooted/components'
import { ExampleGate } from './example/_gates.mts'

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
				append(ExampleGate, { text: 'child text' }),
				append(ExampleGate, { text: 'child text 2' }),
			]
		})
	},
})