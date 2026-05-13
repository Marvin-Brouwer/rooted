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
 * Returns the index of the closing `}` that matches the opening `{` at `start - 1`.
 * Skips comments and strings to avoid false positives.
 */
function findBlockEnd(css: string, start: number): number {
	let depth = 1
	let index = start
	while (index < css.length && depth > 0) {
		const ch = css[index]
		if (ch === '/' && css[index + 1] === '*') {
			const end = css.indexOf('*/', index + 2)
			index = end === -1 ? css.length : end + 2
			continue
		}
		switch (ch) {
			case '"':
			case '\'': {
				const q = ch
				index++
				while (index < css.length && css[index] !== q) {
					if (css[index] === '\\') index++
					index++
				}
				break
			}
			case '{': {
				depth++
				break
			}
			case '}': {
				depth--
				break
			}
		}
		if (depth > 0) index++
	}
	return index
}

/**
 * Splits a CSS selector list on commas, ignoring commas inside pseudo-functions
 * like `:is()`, `:not()`, `:has()`, `:where()`, and attribute selectors `[…]`.
 */
function splitSelectors(selectorList: string): string[] {
	const selectors: string[] = []
	let depth = 0
	let current = ''
	for (const ch of selectorList) {
		if (ch === '(' || ch === '[') depth++
		else if (ch === ')' || ch === ']') depth--
		else if (ch === ',' && depth === 0) {
			selectors.push(current)
			current = ''
			continue
		}
		current += ch
	}
	if (current.trim()) selectors.push(current)
	return selectors
}

/**
 * Transforms a CSS string so that every qualified rule selector is prefixed with
 * `[r="${scopeId}"] `, producing a flat, well-supported stylesheet.
 *
 * - `@keyframes` and `@font-face` blocks are passed through unchanged.
 * - `@media`, `@supports`, `@container`, `@layer` etc. are recurse-processed.
 * - `:global(selector)` strips the wrapper so that selector is left unscoped.
 * - CSS nesting written in source files is left as-is; it still works in all
 *   modern browsers (Chrome 112+, Firefox 117+, Safari 16.5+).
 */
function scopeCSS(css: string, scopeId: string): string {
	const prefix = `[r="${scopeId}"]`
	let result = ''
	let index = 0

	while (index < css.length) {
		// Preserve leading whitespace / newlines
		const wsStart = index
		while (index < css.length && /\s/.test(css[index])) index++
		result += css.slice(wsStart, index)
		if (index >= css.length) break

		// Preserve block comments
		if (css[index] === '/' && css[index + 1] === '*') {
			const end = css.indexOf('*/', index + 2)
			if (end === -1) {
				result += css.slice(index)
				break
			}
			result += css.slice(index, end + 2)
			index = end + 2
			continue
		}

		// Collect prelude (selector or at-rule keyword + params) until `{` or `;`
		let prelude = ''
		while (index < css.length && css[index] !== '{' && css[index] !== '}') {
			// Inline comment inside prelude
			if (css[index] === '/' && css[index + 1] === '*') {
				const end = css.indexOf('*/', index + 2)
				if (end === -1) {
					prelude += css.slice(index)
					index = css.length
					break
				}
				prelude += css.slice(index, end + 2)
				index = end + 2
				continue
			}
			// String inside prelude (e.g. @charset "UTF-8" or content: "…")
			if (css[index] === '"' || css[index] === '\'') {
				const q = css[index]
				prelude += q
				index++
				while (index < css.length && css[index] !== q) {
					if (css[index] === '\\') prelude += css[index++]
					prelude += css[index++]
				}
				prelude += css[index++]
				continue
			}
			// Simple @statements like @import …; @charset …; @layer name;
			if (css[index] === ';') {
				prelude += css[index++]
				break
			}
			prelude += css[index++]
		}

		// Simple statement (no block), emit as-is.
		if (index >= css.length || css[index] === '}' || prelude.trimEnd().endsWith(';')) {
			result += prelude
			continue
		}

		// css[index] === '{', consume and capture block content.
		index++ // skip '{'
		const blockEnd = findBlockEnd(css, index)
		const blockContent = css.slice(index, blockEnd)
		index = blockEnd + 1 // skip '}'

		const trimmedPrelude = prelude.trim()

		if (/^@(-webkit-|-moz-|-ms-)?keyframes\b/.test(trimmedPrelude)
			|| /^@font-face\b/i.test(trimmedPrelude)) {
			// Pass through unchanged. Selectors inside are percentages or from/to.
			result += trimmedPrelude + ' {' + blockContent + '}'
		}
		else if (trimmedPrelude.startsWith('@')) {
			// Conditional group rules (@media, @supports, @container, @layer, …)
			// Recurse into the block so the rules inside get prefixed
			result += trimmedPrelude + ' {' + scopeCSS(blockContent, scopeId) + '}'
		}
		else {
			// Qualified rule. Prefix each selector in the list.
			const selectors = splitSelectors(trimmedPrelude)
			const prefixed = selectors
				.map((s) => {
					const sel = s.trim()
					if (!sel) return ''
					// :global(selector) escape hatch, emit without prefix.
					if (sel.startsWith(':global(') && sel.endsWith(')')) return sel.slice(8, -1)
					return `${prefix} ${sel}`
				})
				.filter(Boolean)
			result += prefixed.join(', ') + ' {' + blockContent + '}'
		}
	}

	return result
}

function buildInlineSourceMap(rawCode: string, relativePath: string): string {
	const lineCount = rawCode.split('\n').length
	const contentMappings = ['AAAA', ...Array.from<string>({ length: lineCount - 1 }).fill('AACA')].join(';')
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
	href: string,
	scopeId: string,
): string {
	const classes = extractClassNames(rawCode)
	const classesJson = JSON.stringify(
		// Sort for deterministic output
		Object.fromEntries(Object.entries(classes).toSorted(([a], [b]) => a.localeCompare(b))),
	)
	return [
		`const _c = ${classesJson}`,
		`_c[Symbol.for('@rooted/css-artifacts')] = { href: ${JSON.stringify(href)}, scopeId: ${JSON.stringify(scopeId)} }`,
		`export default _c`,
	].join('\n')
}

function buildArtifact(rawCode: string, scopeId: string, relativePath: string): string {
	const sourceMap = buildInlineSourceMap(rawCode, relativePath)
	return scopeCSS(rawCode, scopeId) + `\n/*# sourceMappingURL=${sourceMap} */`
}

/** CSS content and token for a file pending asset emission and URL resolution. */
type PendingAsset = {
	stem: string
	css: string
	/** Unique token embedded in JS chunk code to be replaced with the final URL. */
	token: string
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
 * - Scopes every qualified rule selector by prefixing it with `[r="${scopeId}"] `,
 *   producing a single flat CSS artifact (`{stem}.css`) with no `@scope` or
 *   CSS-nesting dependency in the output.
 * - Returns a JS module whose default export is a `CssModule`:
 *   an object mapping camelCase class names to their kebab-case originals,
 *   with a non-enumerable `[cssArtifacts]` symbol property holding the
 *   public URL and scope ID of the emitted file.
 *
 * Imports with a query suffix (`?inline`, `?raw`, etc.) are passed through
 * unchanged so Vite's built-in handlers continue to work.
 *
 * Returns two plugins. Pass the array directly to Vite's `plugins` option;
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
	const emittedReferences = new Map<string, string>()

	/**
	 * Pre-plugin: runs before Vite's built-in CSS pipeline so that bare .css
	 * imports from JS/TS files are resolved to our virtual module IDs instead of
	 * being processed as stylesheets.
	 *
	 * `enforce: 'pre'` is required to win the resolveId race against vite:css.
	 * The trade-off is that Rollup output hooks are NOT called for enforce:'pre'
	 * plugins in Vite, so the output plugin below handles those.
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
		 * When a source CSS file changes, update the in-memory artifact and
		 * notify the browser via a custom HMR event so it re-fetches the
		 * stylesheet without a full page reload.
		 */
		handleHotUpdate({ file, server }) {
			if (!file.endsWith('.css')) return
			const stem = path.basename(file, '.css')
			const key = `${DEV_PREFIX}${stem}.css`
			if (!developmentArtifacts.has(key)) return

			const rawCode = readFileSync(file, 'utf8')
			const relativePath = path.relative(config.root, file).replaceAll('\\', '/')
			const scopeId = seededId(relativePath)
			developmentArtifacts.set(key, buildArtifact(rawCode, scopeId, relativePath))

			server.hot.send({
				type: 'custom',
				event: '@rooted/components:css-update',
				data: { href: key },
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
				// eslint-disable-next-line no-control-regex -- Vite uses null bytes for virtual module IDs
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

			let href: string

			if (config.command === 'serve') {
				href = `${DEV_PREFIX}${stem}.css`
				developmentArtifacts.set(href, buildArtifact(rawCode, scopeId, relativePath))
				// Watch the source CSS file so HMR fires when it changes
				this.addWatchFile(absolutePath)
			}
			else {
				// Store CSS content and placeholder token.
				// The output plugin emits the asset and replaces the token in renderChunk.
				const key = absolutePath.replaceAll('\\', '/')
				const token = `__ROOTED_CSS_${key}__`
				pending.set(absolutePath, { stem, css: buildArtifact(rawCode, scopeId, relativePath), token })
				href = token
			}

			return { code: buildModule(rawCode, href, scopeId), map: undefined }
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
			for (const [filePath, { stem, css }] of pending) {
				if (!emittedReferences.has(filePath)) {
					emittedReferences.set(filePath,
						this.emitFile({ type: 'asset', name: `${stem}.css`, source: await minify(css) }),
					)
				}
			}
			let result = code
			for (const [filePath, { token }] of pending) {
				const reference = emittedReferences.get(filePath)
				if (!reference) continue
				result = result.replaceAll(token, config.base + this.getFileName(reference))
			}
			return result === code ? undefined : { code: result, map: undefined }
		},
	}

	return [inputPlugin, outputPlugin]
}
