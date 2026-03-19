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
    { "name": "main", "prerelease": "alpha", "channel": "alpha" }
]
```

To:
```json
"branches": ["main"]
```

### 2. Merge a qualifying commit to `main`

A `feat:`, `fix:`, `perf:`, or `docs:` commit is required to trigger a release.
`chore:`, `test:`, and `ci:` commits do not trigger one.

---

After these steps:

| Workflow | Publishes to |
|---|---|
| First Publish | `alpha` dist-tag |
| Release | `latest` dist-tag |
