import { Component } from '@rooted/components'
import { route } from './route.v2.mts'
import { token, wildcard } from './route.tokens.v2.mts'

// TODO these are just test values, remove file when done
const FakeComponent: Component = null!
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`({ resolve: ({ create }) => create(FakeComponent) })
const cr = route`/${r}/next/${token('id', String)}/${token('doThing', Boolean)}/example/${wildcard()}/`({ resolve: ({ create }) => create(FakeComponent) })

const m = await r.match({
	target: '/hi/'
})
const m2 = await cr.match({
	target: '/hi/'
})

if (m.success && m2.success) {
	const t = m.tokens
	const t2 = m2.tokens

	console.log(t, t2)
}
//