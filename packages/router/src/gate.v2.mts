import { Component, component, GenericComponent } from '@rooted/components'
import { Route, route } from './route.v2.mts'
import { token } from './route.tokens.v2.mts'
import { RouteParameters } from './gate-factory.mts'
import { create } from '@rooted/components/elements'


// TODO these are just test values, remove when done
type FakeComponentType = Component<{

	prop: boolean,
	path: {
		id: number,
		time: Date,
		rest: string
	}
}>
const FakeComponent: FakeComponentType = null!
function append(..._any: any): void {}
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`(FakeComponent)

// usage
// This no longer is a part of _routes.mts, you just define a gate inside of the page.
append(
	// TODO is this more readable than just calling r.match().success in the component and returning false?
	// TODO apply same fix as element, so this can be used correctly without props
	gate(r, FakeComponent, { prop: true })
)
//

/**
 * Subscribes a component to a route, producing a {@link BoundGateDefinition}.
 *
 * When appended inside a shell component, a gate mounts its component as soon
 * as the subscribed route's URL pattern matches the current URL, and unmounts
 * it when the URL no longer matches. URL parameters parsed from the match are
 * injected automatically as `options.gate`. If the parameters change without
 * leaving the route (e.g. navigating from one article to another), the
 * component is re-mounted with the updated values.
 *
 * A gate activates based solely on its own URL match — it is unaffected by
 * which route the router considers the best match. This is what makes gates the
 * composition mechanism for shell components: a shell bound to multiple child
 * routes uses `append(gate, {})` calls to show the correct sub-content at each
 * URL depth.
 *
 * @param routeReference - The route whose URL pattern drives this gate's visibility.
 * @param component    - The component to show when the route matches.
 * @returns A self-managing {@link Gate} component.
 *
 * @example
 * ```ts
 * import { route, gate, token } from '@rooted/router'
 * import { Categories } from './categories.mts'
 * import { Category } from './category.mts'
 *
 * // Child route binds to the shell component; gate binds to the content component
 * export const CategoryRoute = route`${CategoriesRoute}/${token('slug', String)}/`(Categories)
 * export const CategoryGate  = gate(CategoryRoute, Category)
 *
 * // Inside the Categories shell component:
 * append(CategoryGate)  // mounts Category at /categories/:slug/, unmounts otherwise
 * ```
 *
 * @see {@link route}
 * @see {@link router}
 * @see {@link RouteParameters}
 */
export function gate<TRoute extends AnyRoute, T extends never, TComponent extends Component<T>>(
	routeReference: TRoute,
	component: TComponent,
): GenericComponent
export function gate<TRoute extends AnyRoute, T extends {}, TComponent extends Component<T>>(
	routeReference: TRoute,
	component: TComponent,
	forwardedProps: T
): GenericComponent
export function gate<TRoute extends AnyRoute, T extends { path: Partial<{ bool: boolean }> }, TComponent extends Component<T>>(
	routeReference: TRoute,
	component: TComponent,
	forwardedProps: T
): GenericComponent
export function gate<TRoute extends AnyRoute, T extends { path: Partial<{ bool: boolean }> }, TComponent extends Component<T>>(
	routeReference: TRoute,
	component: TComponent,
	forwardedProps?: T
): GenericComponent {

	return create(Gate, { routeReference, component, forwardedProps })
}

type GateOptions<T extends {}> = {
	routeReference: AnyRoute,
	component: GateComponent<T>,
	forwardedProps: T
}
const Gate = component<GateOptions<any>>({
	name: 'sling:gate',
	onMount({ options, append, create, signal }) {
		const { routeReference, ...componentOptions } = options
		let innerComponent: GenericComponent | undefined = undefined

		function checkGate() {
			const match = options.routeReference.match()

			if (match.success) innerComponent = append(create(options.component, { ...componentOptions, tokens: match.tokens }))
			else innerComponent = innerComponent?.remove() ?? undefined
		}

		window.addEventListener('popstate', checkGate, { signal })
		checkGate()
	},
})

export type AnyRoute = Route<any>
export type GateComponent<T extends {}> = Component<T | { tokens?: any }>