// @vitest-environment node
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { workspacePaths } from '../plugins/bundle-report/workspace-paths.mts'

let workspace: string
let app: string

async function createPackage(directory: string, name: string, files: string[]) {
	await mkdir(directory, { recursive: true })
	await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name }))
	for (const file of files) {
		await mkdir(path.dirname(path.join(directory, file)), { recursive: true })
		await writeFile(path.join(directory, file), '')
	}
}

async function link(from: string, to: string) {
	await mkdir(path.dirname(from), { recursive: true })
	await symlink(to, from, 'dir')
}

/**
 * A pnpm-style workspace: the app, a package linked the pnpm way (`@x/linked`),
 * one linked only into the app's `node_modules` (`@x/plain`), and one that isn't linked at all.
 */
beforeEach(async () => {
	workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'rooted-workspace-paths-')))
	app = path.join(workspace, 'app')

	await createPackage(workspace, 'monorepo', [])
	await createPackage(app, 'app', ['src/main.mts'])
	await createPackage(path.join(workspace, 'packages/linked'), '@x/linked', ['dist/linked.mjs'])
	await createPackage(path.join(workspace, 'packages/plain'), '@x/plain', ['dist/plain.mjs'])
	await createPackage(path.join(workspace, 'packages/unlinked'), '@x/unlinked', ['dist/unlinked.mjs'])

	await link(path.join(workspace, 'node_modules/.pnpm/node_modules/@x/linked'), path.join(workspace, 'packages/linked'))
	await link(path.join(app, 'node_modules/@x/linked'), path.join(workspace, 'packages/linked'))
	await link(path.join(app, 'node_modules/@x/plain'), path.join(workspace, 'packages/plain'))
})

afterEach(async () => {
	await rm(workspace, { recursive: true, force: true })
})

describe('workspacePaths()', () => {
	test('moves a linked package\'s file to pnpm\'s link, where every workspace package is', () => {
		// Arrange
		const normalize = workspacePaths(app)

		// Act
		const result = normalize('../../packages/linked/dist/linked.mjs', path.join(app, 'dist'))

		// Assert
		expect(result).toBe(path.join(workspace, 'node_modules/.pnpm/node_modules/@x/linked/dist/linked.mjs'))
	})

	test('falls back to a plain node_modules link', () => {
		// Arrange
		const normalize = workspacePaths(app)

		// Act
		const result = normalize(path.join(workspace, 'packages/plain/dist/plain.mjs'), path.join(app, 'dist'))

		// Assert
		expect(result).toBe(path.join(app, 'node_modules/@x/plain/dist/plain.mjs'))
	})

	test('leaves the app\'s own files alone', () => {
		// Arrange
		const normalize = workspacePaths(app)

		// Act
		const result = normalize('../src/main.mts', path.join(app, 'dist'))

		// Assert
		expect(result).toBe(path.join(app, 'src/main.mts'))
	})

	test('leaves a package without a link alone', () => {
		// Arrange
		const normalize = workspacePaths(app)

		// Act
		const result = normalize(path.join(workspace, 'packages/unlinked/dist/unlinked.mjs'), app)

		// Assert
		expect(result).toBe(path.join(workspace, 'packages/unlinked/dist/unlinked.mjs'))
	})

	test('leaves a file that\'s already in node_modules alone', () => {
		// Arrange
		const normalize = workspacePaths(app)
		const installed = path.join(app, 'node_modules/some-package/index.js')

		// Act
		const result = normalize(installed, app)

		// Assert
		expect(result).toBe(installed)
	})
})
