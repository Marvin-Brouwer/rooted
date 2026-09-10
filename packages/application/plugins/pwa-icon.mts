import { existsSync } from 'node:fs'
import path from 'node:path'

import type { UserConfig } from 'vite'

/** Where the PWA icon is looked for when the manifest doesn't name one, relative to the Vite root. */
export const DEFAULT_ICON_PATH = 'public/icon.svg'

/**
 * The directory Vite will treat as the project root.
 *
 * This repeats Vite's own rule (`config.root` when set, the working directory
 * otherwise) because plugins need the answer in the `config` hook, which runs
 * before Vite resolves it.
 */
export function resolveProjectRoot(config: UserConfig): string {
	return config.root ? path.resolve(config.root) : process.cwd()
}

/**
 * Absolute path to `public/icon.svg` under `root`, or `undefined` when it isn't there.
 *
 * Always resolve against the Vite root, never `process.cwd()`. The two differ
 * whenever the build is started from somewhere else, for example
 * `vite build packages/app` from a monorepo root.
 */
export function findDefaultIcon(root: string): string | undefined {
	const iconPath = path.resolve(root, DEFAULT_ICON_PATH)
	return existsSync(iconPath) ? iconPath : undefined
}
