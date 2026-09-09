/**
 * The `createMiddleware` helper for files under the adapter's `middlewarePath`.
 *
 * Kept apart from the package root on purpose: the root is the Vite plugin, and
 * your middleware files are run by the server, not by Vite. Nothing in here has
 * a runtime import, so loading it costs nothing at startup.
 *
 * - [Server middleware](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/server-middleware.md)
 *
 * @module
 */

export * from '../middleware.mts'
