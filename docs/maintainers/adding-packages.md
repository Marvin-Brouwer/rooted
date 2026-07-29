# Adding a new package

Steps to scaffold a new `@rooted/*` package and get it publishing to npm. Read [package design](./package-design.md) first to confirm the package belongs.

## 1. Scaffold

Create the directory under `packages/`. Use `packages/util` as the template; it's the smallest complete package. Nothing needs adding to `pnpm-workspace.yaml`, the root `package.json`, or any workflow. They all work off globs, so a new directory under `packages/` is picked up on its own.

```
packages/<name>/
  src/
    _module/
      <name>.mts        # the public entry
  tests/
    <name>.test.ts
  api/
    <name>.api.md       # generated, but committed
  package.json
  tsconfig.json
  tsconfig.tests.json
  tsdown.config.mts
  api-extractor.json
  readme.md
```

The `_module/` folder is rooted's convention for the public entry points. The exports map in `package.json` points at the dist files generated from this folder. `tsdown.config.mts` globs `src/_module/*.mts`, so adding a subpath later means adding a file there plus a key in `exports`, and nothing else.

Copy `tsconfig.json`, `tsconfig.tests.json`, `tsdown.config.mts` and `api-extractor.json` from `packages/util` and change the entry-point filename in `api-extractor.json`. The six `scripts` are identical in every package, so copy those verbatim too.

### `package.json` checklist

- `"name"`: `@rooted/<name>`
- `"version"`: `"1.0.0-alpha.0"`. semantic-release takes over after the first publish.
- `"publishConfig"`:
  ```json
  {
    "registry": "https://registry.npmjs.org/",
    "access": "public",
    "provenance": true
  }
  ```
  `registry` is not optional. `pnpm lint` runs `.repo/config/oxlint/check-packages.mjs`, which fails for any non-private package whose `publishConfig.registry` doesn't match the one in `.npmrc`.
- `"files"`: at minimum `"dist"` and `"readme.md"`. Add any file you ship unbuilt, such as an ambient `.d.ts`.
- `"sideEffects": false`, plus `engines`, `license`, `repository.directory`, `homepage` and `bugs`.
- An `exports` map that mirrors the `_module/` files. See `packages/util/package.json` for the shape.

### If the package ships a Vite plugin

Put the plugin in a sibling `plugins/` folder rather than in `src/`, and give it its own `_module/` barrel. You then also need:

- `tsconfig.plugin.json` extending `.repo/config/ts/library-plugin.json`, so the Node-side code is typechecked separately from the browser code.
- A second config in `tsdown.config.mts` with `entry: ['plugins/_module/*.mts']`, `platform: 'node'` and `tsconfig: 'tsconfig.plugin.json'`. Only the first config gets `onSuccess`.
- A `"source"` condition in each `exports` entry. `.repo/config/ts/library.json` sets `customConditions: ["source"]`, and without it the workspace resolves to `dist` and you develop against stale types.

Copy the shape from `packages/localization` or `packages/router`, whose tsdown configs are identical. Both entry groups emit into one flat `dist/`, so entry basenames must not collide between `src/_module/` and `plugins/_module/`.

Ambient declarations for the file types a plugin handles (`*.md`, `*.css`) ship unbuilt, with their own export key pointing straight at the `.d.ts`. See `@rooted/components`'s `./css-loader/styles`, which consumers pull in with a triple-slash `reference types` directive.

### API reports

`api-extractor.json` is what opts a package into the API report. `rooted-pipeline api-diff` walks `packages/`, skips any directory without that file, and fails CI when a report drifts from the committed one. So run `pnpm build:dev` and commit whatever lands in `api/`. `api/temp/` is gitignored, and an `api/.npmignore` containing `*` keeps the folder out of the published tarball.

## 2. First publish

OIDC trusted publishing has a chicken-and-egg problem: the trusted publisher is configured per package on npmjs, and the package has to exist on npm first. So the very first publish uses a granular access token instead.

### 2.1 Get a granular access token

1. Sign in to [npmjs.com](https://www.npmjs.com) and open [Access Tokens](https://www.npmjs.com/settings/~/tokens).
2. Generate New Token, choose Granular Access Token.
3. Under Packages and scopes, set Read and write, scope to `@rooted`.
4. Copy the token. You don't get to see it again.

### 2.2 Run the First Publish workflow

In GitHub: Actions, then First Publish, then Run workflow. Inputs:

| Input | Value |
|-------|-------|
| Branch | `main` |
| Workspace-relative path to the package | `packages/<name>` |
| npm automation token | the token from 2.1 |
| Environment | leave blank |

The workflow publishes once under the `alpha` dist-tag, so the new package never claims `latest` before a real release.

## 3. Configure OIDC trusted publishing

Once the package exists on npm, switch to OIDC so we don't need a long-lived secret for future releases.

1. Open `https://www.npmjs.com/package/@rooted/<name>/access`.
2. Scroll to Trusted Publishers, then Add a trusted publisher.
3. Fill in:

   | Field | Value |
   |-------|-------|
   | Publisher | GitHub Actions |
   | Owner | `Marvin-Brouwer` |
   | Repository | `rooted` |
   | Workflow | `release.yml` |
   | Environment | leave blank |

4. Save.

From this point on, the Release workflow publishes the new package via OIDC. No `NPM_TOKEN` secret is needed.

> The First Publish workflow also requests `id-token: write` and sets `NPM_CONFIG_PROVENANCE: true`, so provenance is attached even on the first publish.

## 4. Verify

- `https://www.npmjs.com/package/@rooted/<name>` exists with the `alpha` tag.
- A qualifying commit on `main` (`feat:`, `fix:`, `perf:`, `docs:`) triggers the Release workflow and publishes a new `alpha` pre-release for the package without using the granular token.

## 5. Update the docs

Five hand-maintained lists. Nothing generates these, so all five need doing:

- Add the package to the table in the root [README.md](../../README.md).
- Add it to the table in [packages/readme.md](../../packages/readme.md).
- Add a brief "what it is, what it depends on" entry in [package design](./package-design.md), including a line in the layering block at the top.
- If the package has user-facing API, add a guide page under [docs/guide/](../guide/) or [docs/advanced/](../advanced/), whichever fits, and list it in [docs/guide/readme.md](../guide/readme.md).
- Add that guide to the sidebar in [docs/.vitepress/config.mts](../.vitepress/config.mts). This one is easy to miss and there's no check for it. A guide that isn't in the sidebar is unreachable from the published site even though it builds fine, which is exactly what happened to the localization guide.

Then run `pnpm docs:build` before you push. It isn't part of CI, so a broken docs site gets through everything else. Watch for a double opening brace in an inline code span: VitePress parses it as a Vue interpolation and the build fails on it. Write those as <code v-pre>{{</code> instead.

The new package is not done until it is documented somewhere a user will actually find it.
