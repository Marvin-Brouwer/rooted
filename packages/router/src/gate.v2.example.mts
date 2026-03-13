import { Component } from '@rooted/components'
import { route } from './route.v2.mts'
import { token } from './route.tokens.v2.mts'
import { gate } from './gate.v2.mts'

// TODO these are just test values, remove file when done
type FakeComponentType = Component<{

	prop: boolean,
	path: {
		id: number,
		time: Date,
		rest: string
	}
}>
const FakeComponent: FakeComponentType = null!
function append(..._any: any): void {}
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`(FakeComponent)

// usage
// This no longer is a part of _routes.mts, you just define a gate inside of the page.
append(
	// TODO is this more readable than just calling r.match().success in the component and returning false?
	// TODO apply same fix as element, so this can be used correctly without props
	gate(r, FakeComponent, { prop: true })
)
//