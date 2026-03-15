import type { PathParameterDictionary, Route, RouteParameterDictionary } from './route.v2.mts'
const { buildPathForRoute } = await import('./href.route.v2.mts')

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

/**
 * Represents a path-only URL (pathname, query string, and hash — no host or protocol).
 *
 * Use {@link href.path} to construct one from a string, or {@link href.current} to get
 * the current browser path.
 */
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
}

/**
 * Represents a full URL including protocol, host, pathname, query string, and hash.
 *
 * Use {@link href.url} to construct one from a string.
 */
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

/** Constructs a {@link Url} from a string. @__PURE__ */
export function url(href: string) {
	return Url.fromString(href)
}

/** Constructs a {@link Path} from a pathname string. @__PURE__ */
export function path(href: string) {
	return Path.fromString(href)
}

const multiSlashPattern = /[\/{2,}\\*]/gmis

/**
 * Joins one or more {@link Path} segments onto a {@link Url} or {@link Path} base,
 * normalising duplicate slashes. Query strings and hashes from each segment are
 * merged in order.
 * @__PURE__
 */
export function join(url: Url, ...paths: Path[]): Url
export function join(...paths: Path[]): Path
export function join(urlOrPath: HrefBase, ...paths: Path[]): Url | Path {

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
export function forAny(url: URL): Url
/** @deprecated Use href.url, or href.path to construct paths */
export function forAny(location: Location): Url
export function forAny(href: Url): Url
export function forAny(href: Path): Path
/**
 * Generates a {@link Path} from a {@link Route} and its typed parameter values.
 *
 * @param route - The route whose URL pattern should be filled in.
 * @param parameters - A key-value dictionary of the route's typed path parameters
 *   (including any parent route parameters).
 *
 * @example
 * ```ts
 * create(Link, {
 *   href: href.for(CategoryRoute, { slug: category.slug }),
 * })
 * ```
 *
 * @see {@link RouteParameterDictionary}
 */
export function forAny<TRoute extends Route<any>>(route: TRoute, parameters: RouteParameterDictionary<TRoute>): Path
/** @__PURE__ */
export function forAny(target: Route<any> | URL | Location | Url | Path, dictionary?: NoInfer<PathParameterDictionary<any>>): HrefBase {

	if (target instanceof URL) return Url.fromUrl(target)
	if (target instanceof Location) return Url.fromLocation(target)
	if (target instanceof Url) return target
	if (target instanceof Path) return target

	return Path.fromString(buildPathForRoute(target, dictionary!))
}

/** Returns a {@link Path} representing the current `location.pathname`. @__PURE__ */
export function current() {
	return Path.fromLocation(location)
}
