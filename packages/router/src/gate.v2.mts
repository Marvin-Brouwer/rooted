import { component, GenericComponent } from '@rooted/components'
import { Route, RouteParameterDictionary } from './route.v2.mts'
import { create } from '@rooted/components/elements'

/**
 * Creates a self-managing gate component that mounts and unmounts its content
 * based on whether a route's URL pattern matches the current path.
 *
 * Unlike the {@link router}, a gate activates solely on its own URL match —
 * it is unaffected by which route the router considers the best match. This
 * makes gates the composition mechanism for shell components: a shell that
 * covers multiple child URLs can use gates to show the correct sub-content at
 * each depth.
 *
 * When the route matches, the `render` function is called with the typed token
 * values and the returned `Element`(s) are appended. When the route no longer
 * matches, the elements are removed. If the tokens change without leaving the
 * route (e.g. navigating from one article to another), the content is replaced
 * with freshly rendered elements.
 *
 * @param route - The route whose URL pattern drives this gate's visibility.
 * @param render - A {@link GateRenderFunction} called with the matched token
 *   values. May return a single `Element` or an array of `Element`s. May be
 *   async to enable lazy loading.
 * @returns A self-managing component ready to be appended to any parent.
 *
 * @example
 * ```ts
 * import { route, gate, token } from '@rooted/router'
 *
 * export const ArticleRoute = route`/articles/${token('id', Number)}/`({
 *   resolve: ({ create }) => create(ArticleShell)
 * })
 * export const ArticleGate = gate(ArticleRoute,
 *   ({ id }) => create(ArticleContent, { id })
 * )
 *
 * // Inside ArticleShell:
 * append(ArticleGate)  // renders ArticleContent while at /articles/:id/
 * ```
 *
 * @see {@link route}
 * @see {@link router}
 * @see {@link GateRenderFunction}
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

/** @internal */
export type AnyRoute = Route<any>

/**
 * A sync or async function passed to {@link gate} that receives the matched route
 * token values and returns one or more `Element` nodes to render.
 *
 * Use an `async` function to lazy-load the content module on first match.
 */
export type GateRenderFunction<TRoute extends AnyRoute> = AsyncGateRenderFunction<TRoute> | SyncGateRenderFunction<TRoute>
type SyncGateRenderFunction<TRoute extends AnyRoute> = (tokens: RouteParameterDictionary<TRoute>) => Element | Element[]
type AsyncGateRenderFunction<TRoute extends AnyRoute> = (tokens: RouteParameterDictionary<TRoute>) => Promise<Element | Element[]>