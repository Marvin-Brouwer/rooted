import { PathParameterDictionary, Route, route, RouteParameterDictionary } from './route.v2.mts'
import { token } from './route.tokens.v2.mts'
import { buildPathForRoute } from './href.route.v2.mts'
import { Component } from '@rooted/components'

/**
 * Unified Url and Path method. \
 * This may seem overkill, but, this ensures consistency between urls and paths
 */

// TODO doc and write tests

class HrefBase {


	constructor(
		protected url: URL
	) {}

	public get query() { return this.url.searchParams }
	public get queryString() { return this.url.search }
	public get hash() { return this.url.hash }
	public get href() { return this.url.href }

	public toString() { return this.href }
	public toJSON() { return this.href }
}

export class Path extends HrefBase {

	private static baseUrl = 'https://rooted.is/awesome'

	static fromUrl(href: URL) {
		return new Path(href)
	}
	static fromLocation(href: Location) {
		return new Path(new URL(href.href))
	}
	static fromString(href: string) {
		return new Path(new URL(href, Path.baseUrl))
	}

	private constructor(href: URL) {
		super(href)
	}

	public get pathOnly() { return this.url.pathname }
	public get href() { return super.href.replace(Path.baseUrl, '') }

	// TODO check if this is necessary
	public toString() { return this.href }
	public toJSON() { return this.href }
}

export class Url extends HrefBase {

	static fromUrl(href: URL) {
		return new Url(href)
	}
	static fromLocation(href: Location) {
		return new Url(new URL(href.href))
	}
	static fromString(href: string) {
		return new Url(new URL(href))
	}

	private constructor(href: URL) {
		super(href)
	}

	public get path() { return Path.fromUrl(this.url) }
	public get host() { return super.url.host }
	public get hostName() { return super.url.hostname }
	public get origin() { return super.url.origin }
	public get protocol() { return super.url.protocol }
	public get port() { return Number(super.url.port) }

	public get user() { return super.url.username.length === 0 ? undefined : super.url.username }
	public get password() { return super.url.password.length === 0 ? undefined : super.url.password }
}

function url(href: string) {
	return Url.fromString(href)
}

function path(href: string) {
	return Path.fromString(href)
}

const multiSlashPattern = /[\/{2,}\\*]/gmis

function join(url: Url, ...paths: Path[]): Url
function join(...paths: Path[]): Path
function join(urlOrPath: HrefBase, ...paths: Path[]): Url | Path {

	let start = new URL(urlOrPath.href)

	for (const path of paths) {
		start.pathname += path.pathOnly
		start.search = start.search + (start.search.length ? '&' : '') + path.queryString
		start.hash = path.hash
	}

	start.pathname = start.pathname.replaceAll(multiSlashPattern, '/')

	return urlOrPath instanceof Url
		? Url.fromUrl(start)
		: Path.fromUrl(start)
}

/** @deprecated Use href.url, or href.path to construct paths */
function for_(url: URL): Url
/** @deprecated Use href.url, or href.path to construct paths */
function for_(url: Location): Url
function for_(href: Url): Url
function for_(href: Path): Path
/**
 * Utility to generate an absolute path back from the route definition
 *
 * @param parameters - A key value dictionary of the expected parameter values, similar to `options.gate`
 * @returns A constructed url with the values from the {@param parameters} interpolated.
 *
 * @example
 * ```ts
 * create(Link, {
 * 	className: 'category-card',
 * 	// actually `href.for(CategoryRoute, { slug: category.slug })` but the shape fits so the shorthand is preferred
 * 	href: href.for(CategoryRoute, category),
 * 	children: [
 * 		create('div', { className: 'category-name', textContent: category.label }),
 * 		create('p', {
 * 			className: 'category-count',
 * 			textContent: `${category.recipes.length} recipe${category.recipes.length !== 1 ? 's' : ''}`,
 * 		}),
 * 	],
 * })
 * ```
 */
function for_<TRoute extends Route<any>>(route: TRoute, parameters: RouteParameterDictionary<TRoute>): Path
function for_(target: Route<any> | URL | Location | HrefBase, dictionary?: NoInfer<PathParameterDictionary<any>>): HrefBase {

	if (target instanceof URL) return Url.fromUrl(target)
	if (target instanceof Location) return Url.fromLocation(target)
	if (target instanceof Url) return target
	if (target instanceof Path) return target

	return Path.fromString(buildPathForRoute(target as Route<any>, dictionary!))
}

function current() {
	return Path.fromLocation(location)
}

export const href = {
	url,
	path,
	join,
	current,
	for: for_
}

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
const r = route`/start/${token('id', Number)}/${token('time', Date)}/example/`(FakeComponent)

// usage

href.for(r, {
	id: 0,
	time: new Date(),
})
//