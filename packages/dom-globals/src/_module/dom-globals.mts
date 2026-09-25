/**
 * Puts a happy-dom window onto `globalThis` in plain Node for as long as a callback runs, and takes it off again.
 *
 * Build-time plumbing shared by `@rooted/router`'s route manifest plugin and `@rooted/prerender`.
 * Node only, and not meant for app code.
 *
 * @module
 */

export * from '../with-dom-globals.mts'
