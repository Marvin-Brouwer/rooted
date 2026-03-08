/** @module gates */

import { gate, token } from '@rooted/router'
import { Example } from './example.mjs'
import { SubRoute } from './subroute.mjs'

export const ExampleGate = gate(Example).exact`/example/${token('id', Number)}/`
export const PartialGate = ExampleGate.append(SubRoute)`/subroute/`
