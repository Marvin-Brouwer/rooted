import type { Options } from 'tsup'

/** Tsup's plugin type. Tsup doesn't export this directly, so we derive it. */
export type Plugin = Required<Options>['plugins'][number]
