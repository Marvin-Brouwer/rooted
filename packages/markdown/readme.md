# [`@rooted/markdown`](https://www.npmjs.com/package/@rooted/markdown)

Markdown content for the [`@rooted/*`](https://github.com/Marvin-Brouwer/rooted#rooted) framework. A Vite plugin renders `.md` files to HTML at build time, and a component puts that HTML in the DOM. No markdown parser reaches the browser bundle.

> [!IMPORTANT]
> This package is in beta. Breaking changes can still happen between beta releases, so pin the exact version and read the release notes before you update.

```sh
pnpm add @rooted/markdown@beta
```

Register the plugin:

```ts
import { rootedMarkdown } from '@rooted/markdown/vite'

export default rootedManifest({
  plugins: [rootedMarkdown()],
})
```

Add the ambient types to your env declarations so `.md` imports typecheck:

```ts
/// <reference types="@rooted/markdown/types" />
```

Then import a file and render it:

```ts
import * as about from './about.md'

append(create(Markdown, { source: about }))
```

`about.frontmatter` holds the YAML block. The component assigns `html` as-is and does not sanitise it, so only pass content you control.

More in the [markdown guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/markdown.md).
