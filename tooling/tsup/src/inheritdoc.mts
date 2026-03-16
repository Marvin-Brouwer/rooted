import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import ts from 'typescript'
import type { Plugin } from './tsup-plugin.mts'

// Matches either:
//   {@inheritdoc ClassName['member']}  → m[1]=cls, m[2]=member
//   {@inheritdoc typeof identifier}    → m[3]=identifier
const INHERITDOC_RE = /\{@inheritdoc\s+(?:([\w$]+)\[['"]([^'"]+)['"]\]|typeof\s+([\w$]+))\}/

// ── TypeScript program ──────────────────────────────────────────────────────

type State = {
	checker: ts.TypeChecker
	program: ts.Program
}

const stateCache = new Map<string, State>()

function getState(tsconfigPath: string): State {
	const key = resolve(tsconfigPath)
	const cached = stateCache.get(key)
	if (cached) return cached

	const configFile = ts.readConfigFile(key, ts.sys.readFile)
	if (configFile.error) throw new Error(
		ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n')
	)

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		dirname(key),
	)

	const opts: ts.CompilerOptions = { ...parsed.options, noEmit: true, skipLibCheck: true }
	const host = ts.createCompilerHost(opts)
	const program = ts.createProgram(parsed.fileNames, opts, host)

	const state: State = { checker: program.getTypeChecker(), program }
	stateCache.set(key, state)
	return state
}

// ── Type lookup ─────────────────────────────────────────────────────────────

// Keyed as `${resolvedTsconfig}:${className}['${memberName}']`
const jsDocCache = new Map<string, string | null>()

function resolveJsDoc(tsconfigPath: string, className: string, memberName: string): string | null {
	const key = `${resolve(tsconfigPath)}:${className}['${memberName}']`
	if (jsDocCache.has(key)) return jsDocCache.get(key)!

	const result = _resolveJsDoc(tsconfigPath, className, memberName)
	jsDocCache.set(key, result)
	return result
}

function _resolveJsDoc(tsconfigPath: string, className: string, memberName: string): string | null {
	const { checker, program } = getState(tsconfigPath)

	// Find the named interface/class declaration across all source files in the program
	// (project files + lib files from the tsconfig's lib setting)
	let classSym: ts.Symbol | undefined
	outer: for (const sf of program.getSourceFiles()) {
		for (const stmt of sf.statements) {
			if (
				(ts.isInterfaceDeclaration(stmt) || ts.isClassDeclaration(stmt))
				&& stmt.name?.text === className
			) {
				classSym = checker.getSymbolAtLocation(stmt.name)
				if (classSym) break outer
			}
		}
	}

	if (!classSym) return null

	// getProperty follows the full type hierarchy (inheritance + mixins)
	const type = checker.getDeclaredTypeOfSymbol(classSym)
	const prop = type.getProperty(memberName)
	if (!prop) return null

	for (const decl of prop.getDeclarations() ?? []) {
		const doc = extractJsDoc(decl)
		if (doc) return doc
	}

	return null
}

function resolveTopLevelJsDoc(tsconfigPath: string, name: string): string | null {
	const key = `${resolve(tsconfigPath)}:typeof ${name}`
	if (jsDocCache.has(key)) return jsDocCache.get(key)!

	const { program } = getState(tsconfigPath)
	let result: string | null = null

	outer: for (const sf of program.getSourceFiles()) {
		for (const stmt of sf.statements) {
			if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) {
				// Try each overload — JSDoc is usually on the first, but check all
				const doc = extractJsDoc(stmt)
				if (doc) { result = doc; break outer }
				// No `break` — continue scanning for the next overload
			} else if (ts.isVariableStatement(stmt)) {
				for (const decl of stmt.declarationList.declarations) {
					if (ts.isIdentifier(decl.name) && decl.name.text === name) {
						const doc = extractJsDoc(stmt)
						if (doc) { result = doc; break outer }
					}
				}
			}
		}
	}

	jsDocCache.set(key, result)
	return result
}

function extractJsDoc(node: ts.Node): string | null {
	const sf = node.getSourceFile()
	const text = sf.getFullText()
	// getStart(sf, true) includes JSDoc; getStart(sf, false) excludes it
	const withDoc = node.getStart(sf, true)
	const withoutDoc = node.getStart(sf, false)
	const leading = text.slice(withDoc, withoutDoc).trim()
	if (!leading.startsWith('/**')) return null
	return leading
}

// ── d.ts post-processing ────────────────────────────────────────────────────

function applyIndent(jsDoc: string, indent: string): string {
	return jsDoc
		.split('\n')
		.map((line, i) => {
			const trimmed = line.trimStart()
			// First line is `/**`; subsequent `*` lines get one extra space to align
			return i === 0 ? indent + trimmed : indent + ' ' + trimmed
		})
		.join('\n')
}

function jsDocInner(raw: string): string {
	return raw
		.replace(/^\/\*\*\s*\n?/, '')
		.replace(/\s*\*\/$/, '')
		.replace(/^\s*\*\s?/gm, '')
		.trim()
}

async function processFile(tsconfigPath: string, filePath: string): Promise<void> {
	let content = await readFile(filePath, 'utf-8')
	let changed = false

	content = content.replace(/( *)\/\*\*([\s\S]*?)\*\//g, (block, indent: string, inner: string) => {
		const m = inner.match(INHERITDOC_RE)
		if (!m) return block

		const [tag, cls, member, identifier] = m
		const resolved = identifier
			? resolveTopLevelJsDoc(tsconfigPath, identifier)
			: resolveJsDoc(tsconfigPath, cls, member)
		if (!resolved) {
			const ref = identifier ? `typeof ${identifier}` : `${cls}['${member}']`
			process.stderr.write(`[tsup:inheritdoc] warn: could not resolve {@inheritdoc ${ref}}\n`)
			return block
		}

		changed = true

		// If the comment only contains the inheritdoc tag, replace the whole block
		if (!inner.replace(tag, '').replace(/[\s*]/g, '')) {
			return applyIndent(resolved, indent)
		}

		// Otherwise inline just the JSDoc content text in place of the tag
		return block.replace(tag, jsDocInner(resolved))
	})

	if (changed) {
		await writeFile(filePath, content, 'utf-8')
		process.stdout.write(`[tsup:inheritdoc] resolved ${filePath}\n`)
	}
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * tsup plugin that resolves `{@inheritdoc Type['member']}` tags in generated
 * declaration files by inlining the referenced JSDoc.
 *
 * Looks up `Type` by building a TypeScript program from the package's own
 * tsconfig, so any type visible in the project (including project-local types,
 * dependencies, and whatever libs the tsconfig includes) can be referenced.
 *
 * @example `tsup.config.mts`
 * ```ts
 * import { inheritdocPlugin } from '@rooted/tsup-plugins/inheritdoc'
 *
 * export default defineConfig({
 *   plugins: [inheritdocPlugin()],
 * })
 * ```
 */
// ── DTS file waiting ─────────────────────────────────────────────────────────

const DTS_RE = /\.d\.[mc]?ts$/
// tsup writes intermediate rollup input files prefixed with `_tsup-`; ignore them
const TEMP_RE = /^_tsup-/

async function findDtsFiles(outDir: string): Promise<string[]> {
	const entries = await readdir(outDir, { recursive: true }).catch(() => [] as string[])
	return (entries as string[])
		.filter(f => DTS_RE.test(f) && !TEMP_RE.test(basename(f)))
		.map(f => join(outDir, f))
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * tsup plugin that resolves `{@inheritdoc Type['member']}` tags in generated
 * declaration files by inlining the referenced JSDoc.
 *
 * Looks up `Type` by building a TypeScript program from the package's own
 * tsconfig, so any type visible in the project (including project-local types,
 * dependencies, and whatever libs the tsconfig includes) can be referenced.
 *
 * @example `tsup.config.mts`
 * ```ts
 * import { inheritdocPlugin } from '@rooted/tsup-plugins/inheritdoc'
 *
 * export default defineConfig({
 *   plugins: [inheritdocPlugin()],
 * })
 * ```
 */
export function inheritdocPlugin(): Plugin {
	return {
		name: 'tsup:inheritdoc',
		buildEnd() {
			if (!this.options.dts && !this.options.experimentalDts) return

			const tsconfig = this.options.tsconfig ?? 'tsconfig.json'
			const outDir = this.options.outDir ?? 'dist'

			// DTS runs in a parallel worker — no plugin hooks fire after it completes.
			// `beforeExit` fires once the event loop drains, which is after both the
			// esbuild task and the DTS worker task have finished.
			process.once('beforeExit', () => {
				void findDtsFiles(outDir).then(files =>
					Promise.all(files.map(f => processFile(tsconfig, f))),
				)
			})
		},
	}
}
