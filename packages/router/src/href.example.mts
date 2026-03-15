import { Component } from '@rooted/components'
import { route } from './route.v2.mts'
import { token, wildcard } from './route.tokens.v2.mts'
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
const cr = route`/${r}/next/${token('id2', String)}/${token('doThing', Boolean)}/example/${wildcard()}/`(FakeComponent)


// usage
const h1 = href.for(r, {
	id: 0,
	time: new Date()
})
console.log(h1) // ?: /start/0/2026-15-03T00:00:00Z/example/

const h2 = href.for(cr, {
	id: 0,
	time: new Date(),
	id2: '9',
	doThing: true,
	rest: '/asdf/asdf/'
 })
console.log(h2) // ?: /start/0/2026-15-03T00:00:00Z/example/next/9/true/example/asdf/asdf/
//