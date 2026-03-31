import type { CssClass } from './classes.mts'

/**
 * Well-known symbol used as a non-enumerable property key on every
 * {@link CssModule} to store the public URLs of the pre-scoped CSS artifacts.
 */
export const cssArtifacts = Symbol.for('@rooted/css-artifacts')

/** Public URL and scope ID of the CSS artifact emitted by the CSS loader plugin. */
export type CssArtifacts = {
	/** Public URL of the PostCSS-scoped CSS artifact. */
	readonly href: string
	/** The `r` attribute value used to scope CSS to this component's element. */
	readonly scopeId: string
}

/**
 * The type returned when importing a `.css` file through the rooted CSS loader plugin.
 *
 * @example
 * ```ts
 * import styles from './component.css'
 *
 * styles.myClass     // 'my-class' (typed as CssClass)
 * styles['my-class'] // 'my-class' (typed as CssClass)
 * ```
 */
export type CssModule = Record<string, CssClass> & {
	readonly [cssArtifacts]: CssArtifacts
}
