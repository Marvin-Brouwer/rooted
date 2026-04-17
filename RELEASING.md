# Releasing

## Current setup (alpha)

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `alpha` dist-tag |

## When ready to release v1.0.0

### 1. Update `.releaserc.json`

Change:
```json
"branches": [
    "latest",
    { "name": "main", "prerelease": "alpha", "channel": "alpha" }
]
```

To:
```json
"branches": ["main"]
```

### 2. Delete the `latest` branch

The `latest` branch was only needed as a fake base branch to satisfy semantic-release's branch validation during the alpha phase. It can be deleted:

```sh
git push origin --delete latest
```

### 3. Remove the `semantic-release` patch

The patch in `patches/semantic-release@25.0.3.patch` works around a tag conflict
that only arises during the prerelease phase (squash-merging prerelease branches
orphans git notes, causing semantic-release to miscalculate the next version and
attempt to recreate an existing tag). Once on a stable release branch this cannot
happen, so the patch is no longer needed.

Remove it:
```sh
pnpm patch-remove semantic-release@25.0.3
```

Then remove the `patchedDependencies` entry from `package.json` if it remains,
and commit the result.

### 4. Merge a qualifying commit to `main`

A `feat:`, `fix:`, or `perf:` commit is required to trigger a release.
`docs:`, `chore:`, `test:`, and `ci:` commits do not trigger one.

---

After these steps:

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `latest` dist-tag |
