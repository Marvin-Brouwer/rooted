# Observers

`IntersectionObserver`, `MutationObserver` and `ResizeObserver` are the three browser APIs that rooted's `AbortSignal` cleanup does not reach on its own.
`addEventListener` takes a `{ signal }` option; the observer constructors don't.
So every use of one is four separate things, and one of them leaks silently when you forget it:

```ts
const observer = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return
  observer.disconnect()
  reroll()
}, { rootMargin: '0px 0px -10% 0px' })
observer.observe(table)
signal.addEventListener('abort', () => observer.disconnect())
```

`@rooted/observers` is three thin wrappers around those constructors, in the shape the rest of the framework uses:

```sh
pnpm add @rooted/observers
```

```ts
import { intersectionObserver } from '@rooted/observers'

intersectionObserver({
  targets: table,
  rootMargin: '0px 0px -10% 0px',
  signal,
  on: {
    intersect({ entries, observer }) {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      reroll()
    },
  },
})
```

It's a separate package because it has nothing to do with the rest of rooted.
There's no dependency on `@rooted/components` and no component involved, so it works in any app that has an `AbortSignal` to hand.
Inside a rooted component that signal is the mount context's `signal`, and the observer disconnects on unmount.

## What the three have in common

Every wrapper takes the same three keys, plus whatever its own observer's options are:

- **`targets`.** One element, or any iterable of them. A `NodeList` from `querySelectorAll` works as-is. Each target is observed, so there's no separate `observe()` call.
- **`signal`.** Required. The observer disconnects when it aborts, and a signal that has already aborted observes nothing at all.
- **`on`.** A map of handlers, the same shape as the mount context's `on` and the `on:` prop on `element(...)`.

Each one returns the real observer, so `disconnect()` and `unobserve()` still work, including from inside a handler.

Handlers get `{ entries, observer }`, or no arguments at all if you don't need either. They may be `async`, and the promise is not awaited: the browser doesn't wait for an observer callback, so neither do we. Catch your own rejections.

## `intersectionObserver`

`root`, `rootMargin` and `threshold` go to the constructor, which is where `IntersectionObserver` wants them.

```ts
import { intersectionObserver } from '@rooted/observers'

onMount({ signal, element, append }) {
  const sentinel = append(element('div', { className: 'sentinel' }))

  intersectionObserver({
    targets: sentinel,
    threshold: 0,
    signal,
    on: {
      intersect({ entries }) {
        if (entries.some(entry => entry.isIntersecting)) loadNextPage()
      },
    },
  })
}
```

## `mutationObserver`

`MutationObserver` takes its options on `observe()` rather than on the constructor, so every target in one call is observed with the same options. If you need different options per node, call it once per set.

```ts
import { mutationObserver } from '@rooted/observers'

onMount({ signal }) {
  mutationObserver({
    targets: document.documentElement,
    attributes: true,
    attributeFilter: ['data-theme'],
    signal,
    on: {
      mutate() {
        repaint(document.documentElement.dataset.theme)
      },
    },
  })
}
```

The batch is called `entries` here too, even though the DOM calls them `MutationRecord`. They are still `MutationRecord` objects; one name across the three wrappers was worth more than matching the platform on one of them.

## `resizeObserver`

`box` goes to `observe()`, same as with mutations.

```ts
import { resizeObserver } from '@rooted/observers'

onMount({ signal }) {
  resizeObserver({
    targets: row,
    box: 'border-box',
    signal,
    on: {
      resize({ entries }) {
        for (const entry of entries) reposition(entry.target, entry.contentRect)
      },
    },
  })
}
```

## Typing a handler

`ObserverHandler<TEntry, TObserver>` is exported for when you accept one as part of your own options, the way `EventHandler` is in [events](./events.md):

```ts
import type { ObserverHandler } from '@rooted/observers'

type LazyImageOptions = {
  source: string
  on?: { intersect?: ObserverHandler<IntersectionObserverEntry, IntersectionObserver> }
}
```

## What this does not do

- **No `PerformanceObserver`.** It takes an entry-type list rather than targets, so it doesn't fit the same shape. Wire it up by hand for now.
- **No signal-free form.** `Store.on` has an overload that falls back to the page lifetime; this doesn't. An observer with no signal never disconnects, which is the bug being fixed here.
- **No polyfills or feature detection.** If a browser doesn't have the constructor, this throws the same way `new IntersectionObserver()` would. Static rendering is covered: `@rooted/adapter` stubs all three.
