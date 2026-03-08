import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'

import { type ExampleGate, PartialGate } from './_gates.mts'

export type ExampleOptions = {
	gate: GateParameters<typeof ExampleGate>
}
export const Example = component<ExampleOptions>({
	name: 'example',
	onMount({ append, options }) {
		append('p', {
			textContent: `this is a route "${options.gate.id}"`
		})
		append(PartialGate)
	},
})
