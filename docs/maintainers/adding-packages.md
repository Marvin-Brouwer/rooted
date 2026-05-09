# Adding a new package

Steps to scaffold a new `@rooted/*` package and get it publishing to npm. Read [package design](./package-design.md) first to confirm the package belongs.

## 1. Scaffold

Create the directory under `packages/`. Use `packages/util` as the template.

```
packages/<name>/
  src/
    _module/
      <name>.mts        # the public entry
  package.json
  tsconfig.json
  tsup.config.mts
  readme.md
```

The `_module/` folder is rooted's convention for the public entry points. The exports map in `package.json` points at the dist files generated from this folder.

### `package.json` checklist

- `"name"`: `@rooted/<name>`
- `"version"`: `"1.0.0-alpha.0"`. semantic-release takes over after the first publish.
- `"publishConfig"`:
  ```json
  {
    "access": "public",
    "provenance": true
  }
  ```
- `"files"`: at minimum `"dist"` and `"readme.md"`.
- An `exports` map that mirrors the `_module/` files. See `packages/util/package.json` for the shape.

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

- Add the package to the table in the root [README.md](../../README.md).
- Add a brief "what it is, what it depends on" entry in [package design](./package-design.md).
- If the package has user-facing API, add a guide page under [docs/guide/](../guide/) or [docs/advanced/](../advanced/) (whichever fits).

The new package is not done until it is documented somewhere a user will actually find it.
