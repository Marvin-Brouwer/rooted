declare module '*/_routes.g.mts' {
	/**
	 * Stand-in for the route manifest, so `./_routes.g.mts` typechecks before the
	 * first build has written it. Once the file exists, the real one wins and this
	 * declaration is ignored.
	 *
	 * Only covers the default export name. If you pass `routeExport` to
	 * `generateRouteManifest`, that export stays unresolved until the file is
	 * generated.
	 */
	export const appRoutes: Record<string, import('@rooted/router').UnknownRoute>
}
