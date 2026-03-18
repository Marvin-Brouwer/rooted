import type { Options } from 'tsup'

/*
 * This file contains a re-export of the tsup Plugin type, as it's not exported directly
 */

export type Plugin = Required<Options>['plugins'][number]
