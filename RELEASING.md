# Releasing

## Current setup (alpha)

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `alpha` dist-tag |

## When ready to release v1.0.0

### 1. Delete the old accidental release tags

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

Change:
```json
"branches": [
    { "name": "main", "prerelease": "alpha", "channel": "alpha" }
]
```

To:
```json
"branches": ["main"]
```

### 3. Merge a qualifying commit to `main`

A `feat:`, `fix:`, `perf:`, or `docs:` commit is required to trigger a release.
`chore:`, `test:`, and `ci:` commits do not trigger one.

---

After these steps:

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `latest` dist-tag |
