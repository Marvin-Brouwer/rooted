# PWA

Every rooted app is a progressive web app. `rootedManifest` runs [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for you, so a production build already emits a service worker, a web manifest and a set of icons without you configuring anything.

This page is about the part you do have a say in: when a new version of your app reaches the people using it.

## How an update reaches the page

A service worker that finds a new version installs it and then waits. It waits because taking over immediately would be rude: the page on screen was built against the old bundle, and the router resolves route chunks with `await import()` against the precache that page started on. Swap the precache underneath it and a route the visitor has not opened yet fetches a file that isn't there any more.

So rooted never updates a running page. The new version lands in one of two ways:

- **When the app is closed.** Once no window or tab is using the old version any more, the browser switches to the new one by itself, and the next launch is on it. You don't have to do anything for this.
- **When someone asks for it.** `ApplyUpdateButton`, or `applyUpdate()` if you'd rather build your own, hands over to the new version and reloads onto it.

Reloading a tab doesn't count as closing it. The tab is still open while the reload happens, so the old version stays in charge and the page comes back on the old build. Someone who keeps the app open in a pinned tab and only ever reloads stays on the old version until they close it, or until they press the button.

Taking an update in one tab moves every open tab of the app to the new version at once. A browser can't hand over one tab at a time. The registration script rooted emits reloads those other tabs too, because their route chunks are gone from the new precache. Anything they held in memory is lost.

## Showing there's a new version

`@rooted/pwa` has two components for this, and they work under both strategies.

```sh
pnpm add @rooted/pwa
```

```ts
import { component } from '@rooted/components'
import { ApplyUpdateButton, UpdateNotification } from '@rooted/pwa/components'

import styles from './update-banner.css'

export const UpdateBanner = component({
  name: 'update-banner',
  styles,
  onMount({ append, create, element }) {
    append(
      create(UpdateNotification, {
        children: element('div', {
          classes: styles.banner,
          role: 'status',
          children: [
            element('span', {
              textContent: 'A new version is available.',
            }),
            create(ApplyUpdateButton, {
              label: 'Reload',
              classes: styles.reload,
            }),
          ],
        }),
      }),
    )
  },
})
```

`UpdateNotification` renders nothing until a new version is waiting, so you can leave it mounted in a layout. It adds no element of its own, so what you put inside lands straight in the parent's layout.

`ApplyUpdateButton` renders a `<button>` that is disabled until there is something to apply. Pressing it takes the waiting version and reloads onto it. It ships without styles: pass `classes` and style it like any other button in your app.

They're worth having. Without them, a new version sits there until every window of the app is closed, which for an installed PWA that's left running can be a long time.

### Doing it yourself

The two functions behind the components:

```ts
import { applyUpdate, onUpdateReady } from '@rooted/pwa'

// Fires at most once, and straight away if a version is already waiting.
onUpdateReady(() => {
  banner.hidden = false
})

await applyUpdate() // false when there was nothing waiting
```

Inside a component, pass the mount context's `signal` first, the same way `store.on` takes one, and the listener is cleaned up on unmount:

```ts
onUpdateReady(signal, () => {
  button.disabled = false
})
```

`applyUpdate` reloads, so anything the page holds in memory is gone. That's the whole reason rooted doesn't do it on its own.

It only reloads once the new version is actually in control. If the handover doesn't take, the promise never settles and the page stays as it is, because reloading anyway would bring back the old version with the new one taking over underneath it. The update then lands when the app is closed.

## Caching

`runtimeCaching` takes [workbox runtime caching rules](https://developer.chrome.com/docs/workbox/modules/workbox-build#type-RuntimeCaching) for anything outside the precache, like an API you call:

```ts
export default rootedManifest({
  runtimeCaching: [{
    urlPattern: /^https:\/\/api\.example\.com\//,
    handler: 'NetworkFirst',
    options: { cacheName: 'api' },
  }],
})
```

rooted puts a `CacheFirst` rule for images in front of yours, so a rule of your own matching image URLs won't get a look in. Workbox routing is first match wins.

Everything the build emits is precached, so your own assets need no rule.

## Your own worker code

rooted generates the service worker, so there's no file of yours to put worker code in. `workerScripts` is the way in: a list of scripts, relative to the worker, that load at the very top of it, before workbox sets itself up.

```ts
export default rootedManifest({
  workerScripts: ['my-worker-code.js'], // public/my-worker-code.js
})
```

They load with `importScripts`, so they're plain classic scripts: no `import`, no TypeScript, and rooted doesn't bundle or check them. Put them in `public/`. They run before workbox registers its own listeners, so an `install` or `activate` listener of yours sees the event first.

This is the escape hatch for when the update behaviour described above doesn't suit your app, for instance if updates should wait for the user even across a restart. You'd need page code to go with it, and rooted doesn't ship any for that.

## Turning it off during development

The service worker is only generated for a production build, so `pnpm dev` never has one. Generating it is also the slowest part of a build, so there's a flag to skip it:

```sh
vite build -- --no-pwa
```

`--analyze` implies it.

## Migrating an app that already has a service worker

> [!WARNING]
> rooted names the worker `worker.js`. vite-plugin-pwa, and most setups built on it, default to `sw.js`.

If you are moving an existing PWA onto rooted, everyone who already has your app installed has a registration pointing at `sw.js`. After the move that file is gone. The old worker doesn't fail loudly; it keeps serving its own precache, which means those visitors keep getting the old app forever and never reach the HTML that would register `worker.js`.

The way out is a tombstone. Put a `public/sw.js` in the new app that unregisters the old worker and clears its caches:

```js
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
    await self.registration.unregister()
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) client.navigate(client.url)
  })())
})
```

Leave it in place for as long as you think installs linger, which is longer than you'd guess.

A new app has no installed base, so none of this applies. Start on `worker.js` and forget about it.
