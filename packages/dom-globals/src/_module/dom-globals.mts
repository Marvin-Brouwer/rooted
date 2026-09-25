/**
 * Puts a happy-dom window onto `globalThis` in plain Node, and takes it off again.
 *
 * Build-time plumbing shared by `@rooted/router`'s route manifest plugin and `@rooted/adapter`'s pre-renderer.
 * Node only, and not meant for app code.
 *
 * @module
 */

export * from '../install.mts'
export * from '../with-dom-globals.mts'
