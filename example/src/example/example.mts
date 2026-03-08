import { component } from '@rooted/components'
import { GateParameters } from '@rooted/components/routing'

import { type ExampleGate, PartialGate } from './_gates.mts'

export type ExampleOptions = {
	text: string,
	// Route type is mostly to verify the properties are in the correct order
	// according to the string template in the route
	gate: GateParameters<typeof ExampleGate>
}
export const Example = component<ExampleOptions>({
	name: 'example',
	onMount({ append, options }) {
		append('p', {
			textContent: `this is a test "${options.text}"`
		})
		append('p', {
			textContent: `this is a route "${options.gate.id}"`
		})
		append(PartialGate)
	},
})
