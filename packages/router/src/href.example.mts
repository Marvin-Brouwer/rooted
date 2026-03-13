import { Component } from '@rooted/components'
import { route } from './route.v2.mts'
import { token } from './route.tokens.v2.mts'
import { href } from './href.export.mts'

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
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`(FakeComponent)

// usage

href.for(r, {
	id: 0,
	time: new Date(),
})
//