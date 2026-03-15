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
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`({
	resolve: ({ create, tokens }) => create(FakeComponent, { prop: true, path: { id: tokens.id, time: tokens.time, rest: '' } })
})
const cr = route`/${r}/next/${token('id2', String)}/${token('doThing', Boolean)}/example/${wildcard()}/`({
	resolve: ({ create, tokens }) => create(FakeComponent, { prop: tokens.doThing, path: { id: 0, time: new Date(), rest: tokens.rest } })
})


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