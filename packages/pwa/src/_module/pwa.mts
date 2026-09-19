/**
 * Service worker registration for rooted apps, plus the two functions an app
 * needs to put an update in front of the user.
 *
 * `rootedManifest` wires the registration up for you, so most apps only reach
 * for `onUpdateReady` and `applyUpdate`, or for the components in
 * `@rooted/pwa/components` that use them.
 *
 *
 * - [PWA guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/pwa.md)
 *
 * @module
 */

export { registerWorker, type RegisterWorkerOptions, type UpdateStrategy } from '../register-worker.mts'
export { onUpdateReady, applyUpdate, type UpdateReadyOptions } from '../update-state.mts'
