# Events

Rooted provides two complementary APIs for event handling:

- **`on: {}`** — typed element event listeners declared inline with `create`/`append`
- **`ctx.on`** — page-scoped listeners (window, document, global errors) tied to the
  component lifecycle

Both are cleaned up automatically when the component unmounts.

---

## Contents

- [Element events — `on: {}`](#element-events--on-)
  - [Handler types](#handler-types)
  - [EventHandler utility type](#eventhandler-utility-type)
  - [TargetedEvent](#targetedevent)
  - [Multiple events](#multiple-events)
  - [Cleanup](#cleanup)
- [Page-level events — `ctx.on`](#page-level-events--ctxon)
  - [Window events](#window-events)
  - [Document events](#document-events)
  - [Global error handler](#global-error-handler)
    - [UnhandledErrorEvent](#unhandlederrorevent)
    - [isApplicationErrorError](#isapplicationerrorerror)

---

## Element events — `on: {}`

Pass an `on` object when creating any HTML element. Keys are event names; values are
handler functions. The component's abort signal is wired automatically:

```ts
onMount({ append }) {
  append('button', {
    textContent: 'Save',
    on: {
      click(e) {
        e.currentTarget.disabled = true  // e.currentTarget: HTMLButtonElement
        save()
      },
    },
  })
}
```

No-arg handlers are valid when you don't need the event object:

```ts
append('button', {
  textContent: 'Reset',
  on: { click() { reset() } },
})
```

### Handler types

Handlers are contextually typed from the element tag and event name — no explicit
annotation is needed in most cases.

Import the utility types when you need them explicitly:

```ts
import type { EventHandler, TargetedEvent } from '@rooted/events'
```

### `EventHandler` utility type

Use `EventHandler<Tag, EventKey>` when declaring component option types. Both tag-name
and element-class forms are equivalent:

```ts
// tag-name form — preferred for component option types
type ButtonOptions = {
  on?: {
    click?: EventHandler<'button', 'click'>
  }
}

// element-class form — equivalent
type ButtonOptions = {
  on?: {
    click?: EventHandler<HTMLButtonElement, 'click'>
  }
}
```

A component that accepts forwarded event callbacks:

```ts
export type SearchOptions = {
  onSubmit?: EventHandler<'form', 'submit'>
  onInput?: EventHandler<'input', 'input'>
}

export const Search = component<SearchOptions>({
  name: 'search',
  onMount({ append, options }) {
    append('form', {
      on: {
        submit: options.onSubmit,
        // ^^^^^^ typed EventHandler<'form', 'submit'> | undefined
      },
      children: append('input', {
        on: { input: options.onInput },
      }),
    })
  },
})
```

### `TargetedEvent`

`TargetedEvent<TEvent, TTarget>` augments a DOM event with a narrowed `currentTarget`
type. The DOM's built-in `currentTarget` is typed as `EventTarget | null`; this type
tightens it to the actual element so you can access element-specific properties without
casting.

Use it when you need to annotate a handler defined outside the `on: {}` call:

```ts
import type { TargetedEvent } from '@rooted/events'

function handleSubmit(e: TargetedEvent<SubmitEvent, HTMLFormElement>) {
  e.preventDefault()
  const data = new FormData(e.currentTarget)  // currentTarget: HTMLFormElement
  const query = data.get('query') as string
  navigate(`/search/${encodeURIComponent(query)}/`)
}

// later, inside onMount:
append('form', { on: { submit: handleSubmit } })
```

### Multiple events

All native event names for a given element are available as keys:

```ts
append('input', {
  on: {
    input(e) { validate(e.currentTarget.value) },
    change() { syncToServer() },
    focus() { showHint() },
    blur() { hideHint() },
  },
})
```

### Cleanup

Listeners registered via `on: {}` are automatically removed when the component unmounts.
No `removeEventListener` or manual cleanup is needed.

If you create an element outside a component (e.g. in a test), you can pass an
`AbortSignal` directly to `createElementFactory`:

```ts
import { createElementFactory } from '@rooted/elements'

const controller = new AbortController()
const element = createElementFactory(document.createElement.bind(document), controller.signal)

const button = element('button', { on: { click: handler } })
// later:
controller.abort()  // listener removed
```

---

## Page-level events — `ctx.on`

Destructure `on` from the `onMount` context to register listeners on `window`,
`document`, or the global error handler. All listeners are removed automatically
when the component unmounts.

```ts
onMount({ on }) {
  on('window', 'popstate', syncNavigation)
  on('document', 'visibilitychange', handleVisibilityChange)
}
```

### Window events

```ts
on('window', eventName, handler)
```

Registers a listener on `globalThis.window`. Use for resize, scroll, popstate, storage,
and other window-scoped events:

```ts
onMount({ on }) {
  on('window', 'resize', () => recalculateLayout())
  on('window', 'popstate', () => syncUrlToState())
}
```

### Document events

```ts
on('document', eventName, handler)
```

Registers a listener on `element.ownerDocument`. Useful for detecting clicks outside
a component (e.g. closing dropdowns), key shortcuts, or drag-and-drop:

```ts
onMount({ append, on }) {
  const menu = append('ul', { classes: 'dropdown' })

  on('document', 'click', e => {
    if (!menu.contains(e.target as Node)) menu.hidden = true
  })
  on('document', 'keydown', e => {
    if (e.key === 'Escape') menu.hidden = true
  })
}
```

### Global error handler

```ts
on('global', 'unhandled-error', handler)
```

Subscribes to both `window.error` and `window.unhandledrejection`, normalises them into
a single `UnhandledErrorEvent`, and filters out noise that cannot be acted on.

```ts
import { UnhandledErrorEvent } from '@rooted/events'

onMount({ on }) {
  on('global', 'unhandled-error', (e: UnhandledErrorEvent) => {
    reportError({
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error,
    })
  })
}
```

#### `UnhandledErrorEvent`

`UnhandledErrorEvent` extends `ErrorEvent` and is the type passed to `'unhandled-error'`
handlers. It is produced by normalising a raw `ErrorEvent` or `PromiseRejectionEvent`.

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Error message text |
| `filename` | `string` | Source file URL where the error originated |
| `lineno` | `number` | Line number |
| `colno` | `number` | Column number |
| `error` | `unknown` | The thrown value (same as `ErrorEvent.error`) |
| `innerEvent` | `ErrorEvent \| PromiseRejectionEvent` | The original browser event |
| `promise` | `Promise<unknown> \| undefined` | The rejected promise (only set for rejections) |

Use `instanceof UnhandledErrorEvent` and the `promise` property to distinguish
synchronous errors from unhandled rejections:

```ts
import { UnhandledErrorEvent } from '@rooted/events'

on('global', 'unhandled-error', e => {
  if (e instanceof UnhandledErrorEvent && e.promise != null) {
    // unhandled promise rejection
    console.error('Unhandled rejection in promise:', e.promise, e.error)
  } else {
    // synchronous uncaught error
    console.error('Uncaught error:', e.error)
  }
})
```

#### `isApplicationErrorError`

The filtering function used internally before calling your handler. Exported from
`@rooted/events` if you need to apply the same rules manually.

```ts
import { isApplicationErrorError } from '@rooted/events'
```

An event passes the filter when **all** of the following are true:

- The `error` / `reason` is not falsy
- For `ErrorEvent`: `message` is not `'Script error.'` and `lineno`/`colno` are not both `0`
  (these are browser signals for cross-origin script errors that cannot be inspected)
- The source filename does not start with a browser extension protocol:
  `chrome-extension://`, `moz-extension://`, `safari-extension://`, or `about:srcdoc`
- The source filename includes `location.origin` (the event originates from this app)
