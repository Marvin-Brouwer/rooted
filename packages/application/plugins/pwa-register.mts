import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import type { UpdateStrategy } from '@rooted/pwa'
import type { Plugin, ResolvedConfig } from 'vite'

export const pwaRegisterPluginName = 'vite-plugin:rooted-pwa-register'

export type PwaRegisterOptions = {
	skip: boolean
	updates: UpdateStrategy
	/** The built `@rooted/pwa` entry. Defaults to the one this package depends on. */
	clientModule?: string
}

/** Resolved through Node, which ignores the `source` export condition, so this lands on `dist/pwa.mjs`. */
function defaultClientModule() {
	return fileURLToPath(import.meta.resolve('@rooted/pwa'))
}

/**
 * Builds the registration script from the built `@rooted/pwa` module plus one
 * generated call. Throws when the module isn't there or isn't the shape the
 * emitted script needs.
 */
export async function buildRegisterScript(clientModule: string, updates: UpdateStrategy): Promise<string> {
	let source: string
	try {
		source = await readFile(clientModule, 'utf8')
	}
	catch {
		throw new Error(
			`@rooted/pwa is not built: no file at ${clientModule}. Run \`pnpm build\` before building the app.`,
		)
	}

	// The script is emitted as a standalone asset, outside the module graph, so it
	// has to stand on its own. Both of these hold today and are cheap to check;
	// without them the page would fail at runtime instead of here.
	if (/\bfrom\s*['"]\.{1,2}\//.test(source)) {
		throw new Error(`${clientModule} imports a sibling file, so it can't be emitted as a standalone script.`)
	}
	if (!source.includes('registerWorker')) {
		throw new Error(`${clientModule} does not export registerWorker, so the registration script can't call it.`)
	}

	// An inline sourcemap would triple the size of a script nobody debugs.
	const withoutSourcemap = source.replace(/\n\/\/# sourceMappingURL=[^\n]*\n?$/, '\n')

	return `${withoutSourcemap}registerWorker(${JSON.stringify({ updates })})\n`
}

/**
 * Emits the service worker registration script and puts it in `index.html`.
 *
 * rooted injects its own rather than vite-plugin-pwa's `registerSW.js`, which
 * registers the worker and nothing else. This one also keeps checking for a new
 * version while the app runs, and under `'automatic'` hands over on `pagehide`.
 *
 * Build only. vite-plugin-pwa doesn't generate a worker in dev, so there'd be
 * nothing to register.
 */
export function pwaRegisterPlugin({ skip, updates, clientModule }: PwaRegisterOptions): Plugin {
	let base = '/'
	let fileName: string | undefined

	return {
		name: pwaRegisterPluginName,
		apply: 'build',
		enforce: 'post',

		configResolved(config: ResolvedConfig) {
			base = config.base
		},

		async buildStart() {
			if (skip) return

			const script = await buildRegisterScript(clientModule ?? defaultClientModule(), updates)
			// Hashed by hand rather than through `assetFileNames`, so `transformIndexHtml`
			// knows the name without having to reach for the emit reference.
			const hash = createHash('sha256').update(script).digest('hex').slice(0, 8)

			fileName = `worker-register.${hash}.js`
			this.emitFile({ type: 'asset', fileName, source: script })
		},

		transformIndexHtml() {
			if (skip || !fileName) return

			return [{
				tag: 'script',
				attrs: { type: 'module', src: `${base}${fileName}` },
				injectTo: 'body',
			}]
		},
	}
}
