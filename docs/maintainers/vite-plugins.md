# Shipping a Vite plugin from a package

Some `@rooted/*` packages ship a Vite plugin next to their browser code: `@rooted/router` has the route manifest generator, `@rooted/components` has the CSS loader, `@rooted/localization` has the hreflang plugin, `@rooted/markdown` has the `.md` transform.

`@rooted/seo` is a different shape: it's plugin-only, with no `src/` and no browser build, so both its entry points come out of `plugins/_module/`. A package that ships nothing to the browser doesn't need the two-build split described below.

Those two halves run in different places. The browser half ends up in a user's bundle. The plugin half runs in Node during `vite dev` and `vite build` and must never reach a bundle. That split is the reason for most of what follows.

Read [adding a new package](./adding-packages.md) first if the package doesn't exist yet.

## Layout

The plugin lives in a sibling `plugins/` folder, not under `src/`, with its own `_module/` barrel:

```
packages/<name>/
  src/
    _module/
      <name>.mts        # browser entry
  plugins/
    _module/
      vite.mts          # node entry
    <name>.mts          # the plugin itself
  tsconfig.json
  tsconfig.plugin.json
  tsdown.config.mts
```

`packages/localization` and `packages/router` are the two to copy from. Their `tsdown.config.mts` files are byte-identical.

## The four things you need

### 1. `tsconfig.plugin.json`

```json
{
	"extends": "../../.repo/config/ts/library-plugin.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": ".",
		"lib": ["ES2024", "DOM"],
		"types": ["node", "vite/client"]
	},
	"include": ["plugins", "src"]
}
```

The Node-side code gets typechecked separately from the browser code. Without this the plugin either can't see `node:fs` or the browser entry can see it, and one of those is a bug waiting to happen.

### 2. A second tsdown config

```ts
export default defineConfig([
	{
		entry: ['src/_module/*.mts'],
		platform: 'browser',
		// ...
		onSuccess: 'rooted-development extract-api',
	},
	{
		entry: ['plugins/_module/*.mts'],
		platform: 'node',
		tsconfig: 'tsconfig.plugin.json',
		// ...
	},
])
```

Only the first config gets `onSuccess`. Both emit into one flat `dist/`, so entry basenames must not collide between `src/_module/` and `plugins/_module/`. The router uses `router`, `application`, `routes` against `manifest`; localization uses `localization` against `vite`.

### 3. A `"source"` condition in `exports`

```json
"./vite": {
	"source": "./plugins/_module/vite.mts",
	"import": "./dist/vite.mjs",
	"types": "./dist/vite.d.mts"
}
```

`.repo/config/ts/library.json` sets `customConditions: ["source"]`. Leave the condition out and the workspace resolves to `dist`, so you develop against whatever was built last and edits to the plugin appear to do nothing.

### 4. Dependencies in the right place

A Node-only dependency goes in real `dependencies`, not `devDependencies`, or it won't be there when someone installs the package. `@rooted/router` does this with `jiti`, `tinyglobby` and `happy-dom`; `@rooted/markdown` with `marked`, `gray-matter` and `html-minifier-terser`.

It costs install weight but never bundle weight, since nothing in `src/` imports them. Worth being deliberate about: it's the one place a plugin makes users pay for something they may not use.

`vite` itself is a peer dependency, at `>=8.0.1`.

## Writing the plugin

### Name it consistently

`'vite-plugin:rooted-<what>'`. It shows up in Vite's output and in `config.plugins` lookups, which is how `localizationSeo` finds the manifest plugin's `api`.

The SEO plugins predate that convention and use `rooted:seo` and `rooted:route-seo` instead. Don't rename them; the strings are a cross-package contract. Do export them, the way `@rooted/seo` exports `seoPluginName`, `routeSeoPluginName` and `routeManifestPluginName`. A plugin name that other packages look up should never be a literal in more than one file.

### Strip the query before matching an id

```ts
const [file, query] = id.split('?')
if (query !== undefined || !file.endsWith('.md')) return
```

Vite ids carry queries: `./about.md?raw`, `./about.md?url`. Matching on `id.endsWith('.md')` silently swallows those and hands back the wrong thing for imports the user expected Vite to handle.

### Don't mutate shared singletons

If your plugin configures a library, make a private instance. `marked.use(...)` mutates a module-level singleton, so a library doing that leaks its configuration into anything else in the user's app that also uses `marked`. `new Marked()` doesn't.

### Import heavy or optional things lazily

```ts
const html = shouldMinify
	? await (await import('html-minifier-terser')).minify(rendered, options)
	: rendered
```

The minifier isn't needed in dev, so it isn't loaded in dev. `packages/components/plugins/css-loader.mts` does the same with esbuild.

### Gate on an option, not just the command

Prefer an explicit option with a sensible default over reading `config.command` directly, so a user can override it:

```ts
const shouldMinify = options.minify ?? config.command === 'build'
```

## Ambient types for file imports

A plugin that makes `import x from './thing.md'` work has to tell TypeScript what that import is. Those declarations ship unbuilt, with their own export key pointing straight at the `.d.ts`:

```json
"./vite/types": {
	"types": "./plugins/markdown.d.ts"
}
```

Add the file to `"files"` in `package.json`, since it isn't in `dist`. Consumers pull it in with a triple-slash reference in their env declarations:

```ts
/// <reference types="@rooted/markdown/vite/types" />
```

Keep the declaration thin and let the real type live in the package, the way `@rooted/components`'s `./css-loader/styles` does:

```ts
declare module '*.md' {
	export const frontmatter: Record<string, unknown>
	export const html: string
	const markdown: import('@rooted/markdown').MarkdownModule
	export default markdown
}
```

## Testing

Vite doesn't need to be running. Call the hooks directly: invoke `configResolved` with a stub config, then call `transform` and assert on what comes back. `packages/markdown/tests/plugin.test.ts` and `packages/localization/tests/vite-plugin.test.ts` both do this.

For a transform that emits a module, evaluating the emitted source with a `data:text/javascript` import beats asserting on the source text, since it tests the exports a consumer actually gets rather than how they were spelled.

That covers the hooks. It doesn't prove the plugin works inside a real Vite build, so it's worth running one throwaway build by hand when the plugin lands, and again after a major Vite bump.
