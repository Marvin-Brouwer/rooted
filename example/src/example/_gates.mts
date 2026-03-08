/** @module gates */

import { gate, token } from '@rooted/components/routing'
import { Example } from './example.mts'
import { SubRoute } from './subroute.mts'

export const ExampleGate = gate(Example)`/example/${token('id', Number)}/`
export const PartialGate = ExampleGate.append(SubRoute)`/subroute/`
