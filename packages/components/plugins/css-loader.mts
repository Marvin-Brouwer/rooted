import { readFileSync } from 'node:fs'
import path from 'node:path'

import { seededId } from '@rooted/util'

import type { Plugin, ResolvedConfig } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:@rooted/css-module'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID
const ROOTED_CSS_PREFIX = '\0rooted-css:'
const ROOTED_CSS_SUFFIX = '.module'
const DEV_PREFIX = '/@rooted-css/'

function toCamelCase(inputString: string): string {
	return inputString.replaceAll(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

function extractClassNames(css: string): Record<string, string> {
	const result: Record<string, string> = {}
	const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g
	let match: RegExpExecArray | null
	while ((match = classRegex.exec(css)) !== null) {
		const kebab = match[1]
		result[toCamelCase(kebab)] = kebab
	}
	return result
}

/**
 * Builds an inline CSS source map that maps the wrapped artifact lines back
 * to the original source file. The wrapper always adds exactly one line before
 * the raw content and one closing brace line after, so the VLQ mappings are
 * trivial: skip 1 line, then shift each source line by +1.
 */
function buildInlineSourceMap(rawCode: string, relativePath: string): string {
	const lineCount = rawCode.split('\n').length
	// ';' = empty line (wrapper), then AAAA for first source line,
	// AACA for each subsequent line (sourceLine delta = +1), then trailing ';' for closing brace
	const contentMappings = ['AAAA', ...Array.from({ length: lineCount - 1 }).fill('AACA')].join(';')
	const map = JSON.stringify({
		version: 3,
		sources: [`/${relativePath}`],
		sourcesContent: [rawCode],
		mappings: `;${contentMappings};`,
	})
	return `data:application/json;base64,${Buffer.from(map).toString('base64')}`
}

function buildModule(
	rawCode: string,
	scopedUrl: string,
	taggedUrl: string,
	scopeId: string,
): string {
	const classes = extractClassNames(rawCode)
	const classesJson = JSON.stringify(
		// Sort for deterministic output
		Object.fromEntries(Object.entries(classes).toSorted(([a], [b]) => a.localeCompare(b))),
	)
	return [
		`const _c = ${classesJson}`,
		`_c[Symbol.for('@rooted/css-artifacts')] = { scoped: ${JSON.stringify(scopedUrl)}, tagged: ${JSON.stringify(taggedUrl)}, scopeId: ${JSON.stringify(scopeId)} }`,
		`export default _c`,
	].join('\n')
}

/** CSS content and tokens for a file pending asset emission and URL resolution. */
type PendingAsset = {
	stem: string
	scopedCss: string
	taggedCss: string
	/** Unique token embedded in JS chunk code to be replaced with the final URL. */
	scopedToken: string
	taggedToken: string
}

/** Options for the {@link cssLoader} Vite plugin. */
export type CssLoaderOptions = {
	/**
	 * Minify emitted CSS artifacts during production builds.
	 * Has no effect in dev mode (`vite serve`).
	 * @default false
	 */
	minify?: boolean
}

/**
 * Vite plugin that transforms plain `.css` imports into `CssModule` objects.
 *
 * For each intercepted CSS file the plugin:
 * - Emits two pre-scoped CSS artifacts: `{stem}.scoped.css` (wrapped in `@scope`)
 *   and `{stem}.tagged.css` (wrapped with an attribute selector).
 * - Returns a JS module whose default export is a `CssModule`:
 *   an object mapping camelCase class names to their kebab-case originals,
 *   with a non-enumerable `[cssArtifacts]` symbol property holding the
 *   public URLs of the two emitted files.
 *
 * Imports with a query suffix (`?inline`, `?raw`, etc.) are passed through
 * unchanged so Vite's built-in handlers continue to work.
 *
 * Returns two plugins — pass the array directly to Vite's `plugins` option;
 * Vite flattens nested plugin arrays automatically.
 *
 * @example `vite.config.ts`
 * ```ts
 * import { cssLoader } from '@rooted/components/plugin'
 * export default defineConfig({ plugins: [cssLoader({ minify: true })] })
 * ```
 */
export function cssLoader(options: CssLoaderOptions = {}): Plugin[] {
	let config: ResolvedConfig
	const developmentArtifacts = new Map<string, string>()
	/** CSS content and tokens for files awaiting asset emission. */
	const pending = new Map<string, PendingAsset>()
	/** Cached Rollup asset refs once emitFile has been called, to avoid duplicate emission. */
	const emittedReferences = new Map<string, { scopedRef: string, taggedRef: string }>()

	/**
	 * Pre-plugin: runs before Vite's built-in CSS pipeline so that bare .css
	 * imports from JS/TS files are resolved to our virtual module IDs instead of
	 * being processed as stylesheets.
	 *
	 * `enforce: 'pre'` is required to win the resolveId race against vite:css.
	 * The trade-off is that Rollup output hooks are NOT called for enforce:'pre'
	 * plugins in Vite — the output plugin below handles those.
	 */
	const inputPlugin: Plugin = {
		name: 'vite-plugin:rooted-css-loader',
		enforce: 'pre',

		configResolved(c) {
			config = c
		},

		/**
		 * In dev mode, serve the virtual CSS artifacts via a Connect middleware
		 * so they behave as ordinary CSS files that can be linked to.
		 */
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				// Strip query string (e.g. ?t=timestamp added by HMR cache-busting)
				const url = (request.url ?? '').split('?')[0]
				if (!url.startsWith(DEV_PREFIX)) return next()
				const css = developmentArtifacts.get(url)
				if (css == undefined) return next()
				response.setHeader('Content-Type', 'text/css; charset=utf-8')
				response.setHeader('Cache-Control', 'no-cache')
				response.end(css)
			})
		},

		/**
		 * When a source CSS file changes, update the in-memory artifacts and
		 * notify the browser via a custom HMR event so it re-fetches the
		 * stylesheet without a full page reload.
		 */
		handleHotUpdate({ file, server }) {
			if (!file.endsWith('.css')) return
			const stem = path.basename(file, '.css')
			const scopedKey = `${DEV_PREFIX}${stem}.scoped.css`
			if (!developmentArtifacts.has(scopedKey)) return

			const rawCode = readFileSync(file, 'utf8')
			const relativePath = path.relative(config.root, file).replaceAll('\\', '/')
			const scopeId = seededId(relativePath)
			const sourceMap = buildInlineSourceMap(rawCode, relativePath)
			developmentArtifacts.set(scopedKey, `@scope ([r="${scopeId}"]) {\n${rawCode}\n}\n/*# sourceMappingURL=${sourceMap} */`)
			developmentArtifacts.set(`${DEV_PREFIX}${stem}.tagged.css`, `[r="${scopeId}"] {\n${rawCode}\n}\n/*# sourceMappingURL=${sourceMap} */`)

			server.hot.send({
				type: 'custom',
				event: '@rooted/components:css-update',
				data: { scoped: scopedKey, tagged: `${DEV_PREFIX}${stem}.tagged.css` },
			})

			return [] // CSS is served via middleware; no JS module reload needed
		},

		/**
		 * Resolve bare `.css` imports (no query string) to our virtual module IDs
		 * so Vite's own CSS pipeline never sees the file and doesn't attempt to
		 * process it as a stylesheet.
		 */
		resolveId(source, importer) {
			if (source === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID

			if (source.includes('?')) return
			if (!source.endsWith('.css')) return
			if (!importer) return

			// Only intercept CSS imported from JS/TS source files, not from HTML
			// <link> elements or other non-JS contexts.
			const importerBase = importer.split('?')[0]
			if (!/\.[cm]?[jt]sx?$/.test(importerBase)) return

			const importerPath = importerBase.includes('\0')
				? importerBase.replace(/\0[^:]*:/, '')
				: importerBase
			const absolutePath = path.isAbsolute(source)
				? source
				: path.resolve(path.dirname(importerPath), source)

			return ROOTED_CSS_PREFIX + absolutePath + ROOTED_CSS_SUFFIX
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				return `export { cssArtifacts } from '@rooted/components'`
			}

			if (!id.startsWith(ROOTED_CSS_PREFIX)) return

			const absolutePath = id.slice(ROOTED_CSS_PREFIX.length, -ROOTED_CSS_SUFFIX.length)
			const rawCode = readFileSync(absolutePath, 'utf8')
			const stem = path.basename(absolutePath, '.css')
			const relativePath = path.relative(config.root, absolutePath).replaceAll('\\', '/')
			const scopeId = seededId(relativePath)
			const sourceMap = buildInlineSourceMap(rawCode, relativePath)
			const scopedCss = `@scope ([r="${scopeId}"]) {\n${rawCode}\n}\n/*# sourceMappingURL=${sourceMap} */`
			const taggedCss = `[r="${scopeId}"] {\n${rawCode}\n}\n/*# sourceMappingURL=${sourceMap} */`

			let scopedUrl: string
			let taggedUrl: string

			if (config.command === 'serve') {
				scopedUrl = `${DEV_PREFIX}${stem}.scoped.css`
				taggedUrl = `${DEV_PREFIX}${stem}.tagged.css`
				developmentArtifacts.set(scopedUrl, scopedCss)
				developmentArtifacts.set(taggedUrl, taggedCss)
				// Watch the source CSS file so HMR fires when it changes
				this.addWatchFile(absolutePath)
			}
			else {
				// Store CSS content and placeholder tokens.
				// The output plugin emits the assets and replaces tokens in renderChunk.
				const key = absolutePath.replaceAll('\\', '/')
				const scopedToken = `__ROOTED_SCOPED_${key}__`
				const taggedToken = `__ROOTED_TAGGED_${key}__`
				pending.set(absolutePath, { stem, scopedCss, taggedCss, scopedToken, taggedToken })
				scopedUrl = scopedToken
				taggedUrl = taggedToken
			}

			return { code: buildModule(rawCode, scopedUrl, taggedUrl, scopeId), map: undefined }
		},
	}

	/**
	 * Output plugin: normal priority so Rollup calls its output hooks.
	 * Replaces the placeholder tokens left by the input plugin with the
	 * content-hashed filenames Rollup assigned to the emitted CSS assets.
	 *
	 * Uses renderChunk (called per JS chunk) rather than generateBundle so
	 * it fires even under Vite 6's environment-aware build pipeline.
	 */
	const outputPlugin: Plugin = {
		name: 'vite-plugin:rooted-css-loader-output',

		async renderChunk(code) {
			if (pending.size === 0) return
			const { transform } = options.minify ? await import('esbuild') : { transform: undefined }
			const minify = async (css: string) => transform
				// eslint-disable-next-line unicorn/no-await-expression-member
				? (await transform(css, { loader: 'css', minify: true })).code
				: css
			// Emit CSS assets on first chunk (Rollup deduplicates by content+name).
			for (const [path, { stem, scopedCss, taggedCss }] of pending) {
				if (!emittedReferences.has(path)) {
					const scoped = await minify(scopedCss)
					const tagged = await minify(taggedCss)
					emittedReferences.set(path, {
						scopedRef: this.emitFile({ type: 'asset', name: `${stem}.scoped.css`, source: scoped }),
						taggedRef: this.emitFile({ type: 'asset', name: `${stem}.tagged.css`, source: tagged }),
					})
				}
			}
			let result = code
			for (const [path, { scopedToken, taggedToken }] of pending) {
				const { scopedRef, taggedRef } = emittedReferences.get(path)!
				result = result
					.replaceAll(scopedToken, config.base + this.getFileName(scopedRef))
					.replaceAll(taggedToken, config.base + this.getFileName(taggedRef))
			}
			return result === code ? undefined : { code: result, map: undefined }
		},
	}

	return [inputPlugin, outputPlugin]
}
