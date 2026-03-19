# Adding a new package

This guide walks through everything needed to add a new public npm package to
the monorepo and get it publishing to npm.

---

## 1. Scaffold the package

Create a new directory under `packages/` and add the required files, using an
existing package (e.g. `packages/util`) as a reference:

```
packages/<name>/
├── src/
│   └── index.mts
├── package.json
├── tsconfig.json
├── tsup.config.mts
└── readme.md
```

### `package.json` checklist

- `"name"`: `@rooted/<name>`
- `"version"`: `"1.0.0-alpha.0"` — semantic-release takes over after first publish
- `"publishConfig"`:
  ```json
  {
    "access": "public",
    "provenance": true
  }
  ```
- `"files"`: include `"dist"` and `"readme.md"` at minimum

---

## 2. Wire it into the monorepo

Add the package to the root `pnpm-workspace.yaml` (if not already using a
glob that covers it) and add it as a dependency wherever needed using the
`workspace:^` protocol.

---

## 3. First publish via GitHub Actions

Because OIDC trusted publishing must be configured *after* the package exists
on npm, the very first publish uses a classic npm automation token.

### 3.1 Generate an npm automation token

1. Log in to [npmjs.com](https://www.npmjs.com) and go to **Access Tokens**.
2. Click **Generate New Token → Classic Token**.
3. Select type **Automation** (bypasses 2FA for CI).
4. Copy the token — you will not see it again.

### 3.2 Run the `First Publish` workflow

Go to **Actions → First Publish → Run workflow** and fill in the inputs:

| Input | Value |
|---|---|
| **Branch** | `main` |
| **Workspace-relative path to the package** | e.g. `packages/<name>` |
| **npm automation token** | the token from step 3.1 |
| **Environment** | *(leave blank)* |

The workflow publishes the package once under the `alpha` dist-tag, which
ensures it never accidentally claims `latest` before a proper release.

---

## 4. Configure OIDC trusted publishing on npmjs.com

Once the package exists on npm, switch from token-based auth to OIDC so no
long-lived secret is needed for subsequent releases.

1. Go to:
   ```
   https://www.npmjs.com/package/@rooted/<name>/access
   ```
2. Scroll to **Trusted Publishers** and click **Add a trusted publisher**.
3. Fill in the form:

   | Field | Value |
   |---|---|
   | **Publisher** | GitHub Actions |
   | **Owner** | `Marvin-Brouwer` |
   | **Repository** | `rooted` |
   | **Workflow** | `release.yml` |
   | **Environment** | *(leave blank)* |

4. Save. From this point on, the `Release` workflow publishes via OIDC and no
   `NPM_TOKEN` secret is needed for this package.

> [!NOTE]
> The `First Publish` workflow also requests `id-token: write` and sets
> `NPM_CONFIG_PROVENANCE: true`, so provenance is attached even on the initial
> publish.

---

## 5. Verify

After the first publish and OIDC setup:

- Check `https://www.npmjs.com/package/@rooted/<name>` — the package should
  exist with the `alpha` tag.
- Merge a qualifying commit to `main` (`feat:`, `fix:`, `perf:`, or `docs:`)
  and confirm the `Release` workflow publishes a new `alpha` pre-release
  without using the automation token.
