// Tombstone for the service worker of the example app that used to be hosted here.
// Visitors who opened it still have that worker, and it keeps serving the old app from its cache.
// The browser fetches this file when it checks the worker for updates, installs it in its place,
// and this one clears the caches, unregisters itself and reloads the open tabs onto the docs.
// See docs/guide/pwa.md, "Migrating an app that already has a service worker".
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
