/**
 * HTML element helpers. Re-exports `@rooted/elements` and adds `createComponent`
 * (the underlying factory used by the mount context's `create`). Use this when
 * you want to build elements outside of a rooted component.
 *
 *
 * - [Elements](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/elements.md)
 *
 * @module
 */

export * from '@rooted/elements'
export { create as createComponent } from '../component-factory.mts'
