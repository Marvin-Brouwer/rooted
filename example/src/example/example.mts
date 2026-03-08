import { component } from '@rooted/components'
import { GateParameters } from '@rooted/components/routing'

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
