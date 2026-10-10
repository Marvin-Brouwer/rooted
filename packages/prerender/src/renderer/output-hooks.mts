import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'

/**
 * Makes `import()` load the build output from `root`, an `http:` URL, the way a browser loads it from the site.
 * Only for the current thread, so call it inside the render worker.
 *
 * The point is `import.meta.url`. Vite's preload helper resolves a lazy chunk's dependencies against it,
 * and imported as file URLs those came out as `file:///…` links in every pre-rendered page.
 * Loaded from the page's origin, they resolve to where the files are on the site.
 *
 * Relative imports between chunks resolve on the same origin and load from `outputDirectory` too.
 * A URL on that origin outside `root` isn't part of the build, so it fails to load.
 */
export function serveOutput(root: string, outputDirectory: string): void {
	const { origin, pathname: rootPath } = new URL(root)

	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (!specifier.startsWith(`${origin}/`) && !context.parentURL?.startsWith(`${origin}/`)) {
				return nextResolve(specifier, context)
			}
			return { url: new URL(specifier, context.parentURL).href, shortCircuit: true }
		},
		load(url, context, nextLoad) {
			if (!url.startsWith(`${origin}/`)) return nextLoad(url, context)

			const { pathname } = new URL(url)
			if (!pathname.startsWith(rootPath)) throw new Error(`${url} is outside the app's base ${root}, so it isn't in the build output`)

			const filePath = path.join(outputDirectory, decodeURIComponent(pathname.slice(rootPath.length)))
			return { format: 'module', source: readFileSync(filePath, 'utf8'), shortCircuit: true }
		},
	})
}
