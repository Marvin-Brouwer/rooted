import { existsSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'

type OwningPackage = { name: string, directory: string } | undefined

/** The nearest `package.json` above a file, which is the package the file belongs to. */
function findOwningPackage(file: string, cache: Map<string, OwningPackage>): OwningPackage {
	const visited: string[] = []
	let directory = path.dirname(file)
	let owner: OwningPackage

	for (;;) {
		if (cache.has(directory)) {
			owner = cache.get(directory)
			break
		}
		visited.push(directory)
		const manifest = path.join(directory, 'package.json')
		if (existsSync(manifest)) {
			const { name } = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string }
			owner = name ? { name, directory } : undefined
			break
		}
		const parent = path.dirname(directory)
		if (parent === directory) break
		directory = parent
	}

	for (const seen of visited) cache.set(seen, owner)
	return owner
}

/** The first `node_modules` link to the package, looking up from the app. Only a link that really points at the package counts. */
function findLinkIn(owner: NonNullable<OwningPackage>, root: string, folder: string[]): string | undefined {
	const target = realpathSync(owner.directory)

	for (let directory = root; ; directory = path.dirname(directory)) {
		const link = path.join(directory, ...folder, owner.name)
		if (existsSync(link) && realpathSync(link) === target) return link
		if (path.dirname(directory) === directory) return undefined
	}
}

/**
 * Where a package is linked into `node_modules`.
 * pnpm keeps a link to every workspace package in `node_modules/.pnpm/node_modules`, dependencies of dependencies included,
 * so that's tried first to keep them all in one place. Other package managers link them straight into `node_modules`.
 */
function findLink(owner: NonNullable<OwningPackage>, root: string): string | undefined {
	return findLinkIn(owner, root, ['node_modules', '.pnpm', 'node_modules'])
		?? findLinkIn(owner, root, ['node_modules'])
}

/**
 * Rewrites sourcemap sources that live in a linked workspace package to their `node_modules` path.
 *
 * Vite follows the links, so code from a workspace package shows up as `../../packages/router/dist/…`.
 * Sonda only recognizes packages by a `node_modules/<name>` path, so without this the code isn't grouped by package.
 * An app that installs its packages from a registry already gets `node_modules` paths, this only changes anything in a workspace.
 * The app's own files, and anything without a link, stay where they are.
 */
export function workspacePaths(root: string): (source: string, sourceRoot: string) => string {
	const owners = new Map<string, OwningPackage>()
	const links = new Map<string, string | undefined>()

	return (source, sourceRoot) => {
		const file = path.isAbsolute(source) ? source : path.resolve(sourceRoot, source)
		if (file.split(path.sep).includes('node_modules')) return file

		const owner = findOwningPackage(file, owners)
		if (!owner || path.resolve(owner.directory) === path.resolve(root)) return file

		if (!links.has(owner.directory)) links.set(owner.directory, findLink(owner, root))
		const link = links.get(owner.directory)

		return link ? path.join(link, path.relative(owner.directory, file)) : file
	}
}
