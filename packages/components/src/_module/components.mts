/**
 * The component model for the rooted framework. Exports `component()`,
 * `ComponentContext`, and the supporting types.
 *
 *
 * - [Components guide](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/guide/components.md)
 * - [Internals](https://github.com/Marvin-Brouwer/rooted/blob/main/docs/advanced/internals.md)
 *
 * @module
 */

export { component, type Component, type ComponentConstructor, type ComponentContext } from '../component.mts'
export type { GenericComponent } from '../component/generic-component.mts'
export * from '../component/classes.mts'
export * from '../component/css-artifacts.mts'
