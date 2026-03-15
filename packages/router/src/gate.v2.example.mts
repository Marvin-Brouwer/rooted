import { Component } from '@rooted/components'
import { route } from './route.mts'
import { token } from './route.tokens.mts'
import { gate } from './gate.mts'
import { create } from '@rooted/components/elements'

// TODO these are just test values, remove file when done
type FakeComponentType = Component<{

	prop: boolean,
	id: number,
}>
const FakeComponent: FakeComponentType = null!
function append(..._any: any): void {}
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`({
	resolve: ({ create, tokens }) => create(FakeComponent, { id: tokens.id, prop: true })
})

// usage
// This no longer is a part of _routes.mts, you just define a gate inside of the page.
append(
	gate(r, ({ id }) => [
		create(FakeComponent, { id, prop: true }),
		create(FakeComponent, { id, prop: false })
	]),
	gate(r, ({ id }) => create(FakeComponent, { id, prop: true }))
)
//