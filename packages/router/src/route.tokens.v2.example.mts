import { token, wildcard } from './route.tokens.mts'

// TODO these are just test values, remove file when done
const s = token('string', String)
const n = token('number', Number)
const b = token('boolean', Boolean)
const d = token('date', Date)
const w = wildcard()

console.log(s, n, b, d, w)
//