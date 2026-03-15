import { component, GenericComponent } from '@rooted/components'
import { Route, RouteParameterDictionary } from './route.v2.mts'
import { RouteParameters } from './gate-factory.mts'
import { create } from '@rooted/components/elements'

/**
 * Subscribes a component to a route, producing a {@link BoundGateDefinition}.
 *
 * @todo redoc
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
export function gate<TRoute extends AnyRoute>(
    route: TRoute,
    render: GateRenderFunction<TRoute>
): GenericComponent {

	const renderGate = render as GateRenderFunction<AnyRoute>
	return create(Gate, { routeReference: route, renderGate })
}

type GateOptions<TRoute extends AnyRoute> = {
	routeReference: AnyRoute,
	renderGate: GateRenderFunction<TRoute>
}
const Gate = component<GateOptions<AnyRoute>>({
	name: 'sling:gate',
	onMount({ options, append, signal }) {
		const { routeReference, renderGate } = options
		let innerNodes: Element[] | undefined = undefined

		function clear(newNodes: Element[] = []) {
			if (!innerNodes) return;
			for(const node of innerNodes){
				if (newNodes.includes(node)) continue
				node.remove()
			}

			innerNodes = newNodes.length === 0 ? undefined : newNodes
		}
		async function checkGate() {
			const match = await routeReference.match()

			if (match.success){
				const newComponents = await renderGate(match.tokens)
				innerNodes = Array.isArray(newComponents) ? newComponents : [newComponents]
				append(...innerNodes!)
				clear(innerNodes)
			}
			else {
				clear()
			}
		}

		window.addEventListener('popstate', checkGate, { signal })
		checkGate()
	},
})

export type AnyRoute = Route<any>
export type GateRenderFunction<TRoute extends AnyRoute> = AsyncGateRenderFunction<TRoute> | SyncGateRenderFunction<TRoute>
type SyncGateRenderFunction<TRoute extends AnyRoute> = (tokens: RouteParameterDictionary<TRoute>) => Element | Element[]
type AsyncGateRenderFunction<TRoute extends AnyRoute> = (tokens: RouteParameterDictionary<TRoute>) => Promise<Element | Element[]>