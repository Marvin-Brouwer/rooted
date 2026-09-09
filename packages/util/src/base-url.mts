/**
 * The app base Vite was configured with (`import.meta.env.BASE_URL`), always
 * ending in `/`. That is `/` for a root deployment and `/my-repo/` for one
 * served from a sub-path.
 *
 * Falls back to `/` when nothing defines `import.meta.env`, which is what you
 * get under plain Node.
 *
 * @example
 * ```ts
 * // vite.config.mts: { base: '/my-repo/' }
 * baseUrl() // '/my-repo/'
 * ```
 */
export function baseUrl(): string {
	return import.meta.env?.BASE_URL ?? '/'
}
