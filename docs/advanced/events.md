# Events

Rooted has two event surfaces:

1. **Element events.** The `on:` prop on `element(...)`. Listeners are typed against the element they're attached to and are removed when the component unmounts.
2. **Page events.** The mount context's `on(target, key, handler)`. Used for `window`, `document`, and `'global'` events. Removed on unmount the same way.

Both surfaces use the same `AbortSignal` under the hood. You don't have to track listeners.

## Element events

```ts
import { component } from '@rooted/components'

export const Counter = component({
  name: 'counter',
  onMount({ append, element }) {
    let count = 0

    const label = append(element('span', { textContent: '0' }))
    append(element('button', {
      textContent: 'Increment',
      on: {
        click() {
          count += 1
          label.textContent = String(count)
        },
      },
    }))
  },
})
```

The `on:` prop is an object keyed by event name. Each handler is typed against the element's event map: `currentTarget` is narrowed to the exact element type, so you don't have to cast.

```ts
element('input', {
  on: {
    input(event) {
      // event.currentTarget is HTMLInputElement
      console.log(event.currentTarget.value)
    },
  },
})
```

Handlers can be `async`. The return value is awaited internally but the event listener does not block.

## Page events

For listeners on `window`, `document`, or rooted's "global" surface, use the mount context's `on`:

```ts
onMount({ on }) {
  on('window',   'popstate',          () => { /* ... */ })
  on('document', 'visibilitychange',  () => { /* ... */ })
  on('global',   'unhandled-error',   (event) => { /* ... */ })
}
```

All three forms are auto-removed on unmount, and the page-level signal makes sure they're also removed if the page itself is torn down.

## Targeting `window` and `document`

`window` and `document` events are typed against `WindowEventMap` and `DocumentEventMap`. The handler's `currentTarget` is narrowed to `Window` or `Document` respectively.

```ts
on('window', 'resize', (event) => {
  // event.currentTarget: Window
  console.log(event.currentTarget.innerWidth)
})
```

## The `'global'` target

`'global'` is a small abstraction over the two ways the browser reports unhandled errors: `window.error` (sync exceptions and resource errors) and `window.unhandledrejection` (async rejections). Rooted folds both into a single `'unhandled-error'` event of type `UnhandledErrorEvent`.

```ts
on('global', 'unhandled-error', (event) => {
  // event is UnhandledErrorEvent. Has innerEvent for the original ErrorEvent or PromiseRejectionEvent.
  reportToTelemetry(event.error)
})
```

### What gets filtered

Rooted does not surface every unhandled error. The `'unhandled-error'` listener filters out two classes of noise:

- **Cross-origin script errors.** `'Script error.'` with `lineno === 0` and `colno === 0` is the browser's signal for an opaque cross-origin failure. There's nothing useful to log.
- **Browser extension errors.** Errors whose stack frame originates from `chrome-extension://`, `moz-extension://`, `safari-extension://`, or `about:srcdoc` are extensions running in the page, not your app.

The filter checks the error's stack frame against the page origin. If you need the unfiltered events, listen on `window` directly:

```ts
on('window', 'error', () => { /* every error, including extensions */ })
on('window', 'unhandledrejection', () => { /* every rejection */ })
```

## Typing handlers in component options

When you accept event handlers as part of a component's options, type them with `EventHandler<Tag, EventKey>`:

```ts
import type { EventHandler } from '@rooted/events'

type ButtonOptions = {
  label: string
  on?: { click?: EventHandler<'button', 'click'> }
}
```

`EventHandler<'button', 'click'>` is a function that takes a `TargetedEvent<MouseEvent, HTMLButtonElement>` and returns `void` or `Promise<void>`. The handler can also take no arguments.

`TargetedEvent` is the same trick that `currentTarget` uses inside `on:` props: it's the standard DOM event type with `currentTarget` narrowed to the element it's attached to.

## Handler cleanup, in one sentence

If you used `on:` on an element factory, `on(...)` on the mount context, or `addEventListener(..., { signal })`, you're already covered. You don't need to call `removeEventListener`.

If you wrote `addEventListener` without a signal, you have to clean up yourself. Don't.
