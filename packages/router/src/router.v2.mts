import { Component, GenericComponent } from '@rooted/components'
import { Route } from './route.v2.mts'

/**
 * Configuration object passed to {@link router}.
 *
 * @todo write doc
 */
type RouterConfig = {
	home: Component
	notFound: Component
} & {
	[key: string]: RouterCompatibleRoute<any>
}

/**
 * Constrains a route to be **router-compatible**: its component must not require
 * any external options beyond the automatically-injected `gate` parameter.
 *
 * @todo doc
 */
export type RouterCompatibleRoute<G> = G extends Route<infer T>
	? ([T] extends [never] ? Route<T> : never)
	: never

/**
 * The validated version of a {@link RouterConfig}.
 *
 * `home` and `notFound` keys are passed through as-is. Every other key that is
 * a {@link RouteDefinition} must be a {@link RouterCompatibleRoute}; incompatible
 * routes produce `never` and therefore a compile-time error. Non-route values
 * (e.g. {@link BoundGateDefinition}) are passed through as-is.
 */
export type ValidatedRouterConfig<T extends RouterConfig> = {
	[K in keyof T]: K extends 'home' | 'notFound' ? T[K] : RouterCompatibleRoute<T[K]>
}

export function router<const T extends RouterConfig>(config: ValidatedRouterConfig<T>): GenericComponent {
    // 1. collect Route<any> entries (using isRoute from route.v2.mts), deduplicate
    // 2. component onMount:
    //    - on update(): run all route.match() concurrently (Promise.all)
    //    - pick the single successful match (or highest `end` on wildcard tie)
    //    - mount/unmount via append(create(route.component, { path: tokens }))
    //    - handle home (`/`) and notFound as before
    //    - listen to popstate

	throw new Error('not yet implemented')
}