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

### 3. Merge a qualifying commit to `main`

A `feat:`, `fix:`, or `perf:` commit is required to trigger a release.
`docs:`, `chore:`, `test:`, and `ci:` commits do not trigger one.

---

After these steps:

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `latest` dist-tag |
