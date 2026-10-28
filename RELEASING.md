# Releasing

## Current setup (beta)

| Branch | Workflow | Publishes to |
|---|---|---|
| any | First Publish | `alpha` dist-tag |
| `main` | Release | `beta` dist-tag, as `1.0.0-beta.N` |
| `v2` | Release | `alpha` dist-tag, as alpha pre-releases |

`latest` isn't moved during the beta, so a plain `pnpm add @rooted/<name>` still installs an old alpha. Install commands in the docs and package readmes say `@beta` for that reason.

### After the first beta release

Deprecate the alphas on the `main` line, so anyone who installs without `@beta` gets pointed at it. Run this once per published package, with an npm login that owns the scope:

```sh
npm deprecate "@rooted/<name>@<1.0.0-beta.0" "Use @rooted/<name>@beta"
npm deprecate "@rooted-adapters/<name>@<1.0.0-beta.0" "Use @rooted-adapters/<name>@beta"
```

Deprecating a range only touches versions that exist now, so later alphas from `v2` aren't affected.

## When ready to release v1.0.0

> [!WARNING]
> `1.0.0` can't be published for `@rooted/components`, `@rooted/router` and `@rooted/util` (1.0.0 and 1.0.1 were unpublished, and npm never allows reuse), or for `@rooted/application` and `@rooted/store` (a deprecated 1.0.0 exists). Decide how to number the first stable release before running these steps.

### 1. Update `.releaserc.json`

Change:
```json
"branches": [
    "latest",
    { "name": "main", "prerelease": "beta", "channel": "beta" },
    { "name": "v2", "prerelease": "alpha", "channel": "alpha" }
]
```

To:
```json
"branches": [
    "main",
    { "name": "v2", "prerelease": "alpha", "channel": "alpha" }
]
```

### 2. Delete the `latest` branch

The `latest` branch was only needed as a fake base branch to satisfy semantic-release's branch validation during the prerelease phase. It can be deleted:

```sh
git push origin --delete latest
```

### 3. Remove the `semantic-release` patch

The patch in `patches/semantic-release@25.patch` works around a tag conflict that only arises during the prerelease phase (squash-merging prerelease branches orphans git notes, causing semantic-release to miscalculate the next version and attempt to recreate an existing tag). Once on a stable release branch this cannot happen, so the patch is no longer needed.

It's keyed to a version range (`semantic-release@^25.0.8`) rather than one exact version, so patch and minor updates of semantic-release keep it applied instead of failing the install with `ERR_PNPM_UNUSED_PATCH`. A new major still fails that way, on purpose: check whether the patch is still needed, and whether it still applies, before moving the range.

Remove it:
```sh
pnpm patch-remove "semantic-release@^25.0.8"
```

Then remove the `patchedDependencies` entry from `pnpm-workspace.yaml` if it remains, and commit the result.

### 4. Merge a qualifying commit to `main`

A `feat:`, `fix:`, or `perf:` commit is required to trigger a release.
`docs:`, `chore:`, `test:`, and `ci:` commits do not trigger one.

---

After these steps:

| Branch | Workflow | Publishes to |
|---|---|---|
| any | First Publish | `alpha` dist-tag |
| `main` | Release | `latest` dist-tag |
| `v2` | Release | `alpha` dist-tag |
