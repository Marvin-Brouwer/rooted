# Releasing

## Current state: alpha pre-releases

All merges to `main` currently publish pre-release versions (e.g. `1.0.0-alpha.1`)
to the `alpha` dist-tag on npm. This will continue until the steps below are followed
to promote to stable releases.

## How to promote to stable (v1.0.0)

### 1. Delete the accidental release tags from the remote

Before switching to stable, make sure the old accidental `1.0.0` / `1.0.1` git tags
have been removed from the remote, otherwise semantic-release will start from `1.0.2`:

```bash
git push origin --delete \
  @rooted/components@1.0.0 @rooted/components@1.0.1 \
  @rooted/router@1.0.0 @rooted/router@1.0.1 \
  @rooted/util@1.0.0 @rooted/util@1.0.1 \
  @rooted/development@1.0.0 @rooted/development@1.0.1 \
  @rooted/pipeline@1.0.0 @rooted/pipeline@1.0.1 \
  @rooted/tsup@1.0.0 @rooted/tsup@1.0.1 \
  @rooted/example-recipe-book@1.0.0 @rooted/example-recipe-book@1.0.1
```

### 2. Update `.releaserc.json`

Change the `branches` array from:

```json
"branches": [
    { "name": "main", "prerelease": "alpha", "channel": "alpha" }
]
```

to:

```json
"branches": ["main"]
```

### 3. Merge a qualifying commit to `main`

Semantic-release only publishes when there is at least one qualifying commit since the
last release tag. After switching to stable, merge a `feat:`, `fix:`, `perf:`, or
`docs:` commit to trigger the `1.0.0` stable release.

> A `chore:`, `test:`, or `ci:` commit alone will not trigger a release.

---

## First-publish workflow

The [First Publish](.github/workflows/first-publish.yml) workflow is used to register
a brand-new package on npm for the first time (before OIDC trusted publishing is set up
for it). It always publishes with `--tag alpha` so that `latest` is never set
prematurely — semantic-release will promote the package to `latest` on its first
stable release.
