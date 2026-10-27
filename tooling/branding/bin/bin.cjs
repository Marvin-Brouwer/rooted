#!/usr/bin/env node
'use strict'

/**
 * Universal script loader.
 *
 * Takes `process.argv[2]` and tries to find a `{command}.mts` file in this project's `src` folder. \
 * If found, the file is run through tsx/esm.
 */

const { spawnSync } = require('node:child_process')
const { join } = require('node:path')
const { existsSync } = require('node:fs')
const { pathToFileURL } = require('node:url')

const command = process.argv[2] + '.mts'
const scriptPath = join(__dirname, '../src', command)
if (!existsSync(scriptPath)) {
	console.error(`Unknown command: ${command ?? '(none)'}.`)
	process.exit(1)
}

const tsxEsm = pathToFileURL(require.resolve('tsx/esm', { paths: [__dirname] })).href
const result = spawnSync(
	process.execPath,
	['--import', tsxEsm, scriptPath, ...process.argv.slice(3)],
	{ stdio: 'inherit', cwd: process.cwd() },
)

process.exit(result.status ?? 1)
