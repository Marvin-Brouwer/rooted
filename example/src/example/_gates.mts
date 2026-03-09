/** @module gates */

import { gate, junction, token } from '@rooted/router'
import { Example } from './example.mjs'
import { SubRoute } from './subroute.mjs'

export const ExampleGate = junction`/example/${token('id', Number)}/`(Example)
export const PartialGate = gate`${ExampleGate}/subroute/`(SubRoute)
