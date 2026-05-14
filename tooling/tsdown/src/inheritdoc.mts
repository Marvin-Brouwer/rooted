import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import * as ts from 'typescript'

import type { Plugin } from './tsdown-plugin.mts'

// Matches any of:
//   {@inheritdoc ClassName['member']}  → m[1]=cls, m[2]=member
//   {@inheritdoc typeof identifier}    → m[3]=identifier
//   {@inheritdoc TypeName}             → m[4]=typeName
const INHERITDOC_RE = /\{@inheritdoc\s+(?:([\w$]+)\[['"]([^'"]+)['"]\]|typeof\s+([\w$]+)|([\w$]+))\}/

// ── TypeScript program ──────────────────────────────────────────────────────

type State = {
	checker: ts.TypeChecker
	program: ts.Program
}

const stateCache = new Map<string, State>()

function getState(tsconfigPath: string): State {
	const key = path.resolve(tsconfigPath)
	const cached = stateCache.get(key)
	if (cached) return cached

	const configFile = ts.readConfigFile(key, ts.sys.readFile.bind(ts))
	if (configFile.error) throw new Error(
		ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'),
	)

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(key),
	)

	const options: ts.CompilerOptions = { ...parsed.options, noEmit: true, skipLibCheck: true }
	const host = ts.createCompilerHost(options)
	const program = ts.createProgram(parsed.fileNames, options, host)

	const state: State = { checker: program.getTypeChecker(), program }
	stateCache.set(key, state)
	return state
}

// ── Type lookup ─────────────────────────────────────────────────────────────

// Keyed as `${resolvedTsconfig}:${className}['${memberName}']`
const jsDocumentCache = new Map<string, string | undefined>()

function resolveJsDocument(tsconfigPath: string, className: string, memberName: string): string | undefined {
	const key = `${path.resolve(tsconfigPath)}:${className}['${memberName}']`
	if (jsDocumentCache.has(key)) return jsDocumentCache.get(key)!

	const result = _resolveJsDocument(tsconfigPath, className, memberName)
	jsDocumentCache.set(key, result)
	return result
}

function _resolveJsDocument(tsconfigPath: string, className: string, memberName: string): string | undefined {
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

	if (!classSym) return undefined

	// getProperty follows the full type hierarchy (inheritance + mixins)
	const type = checker.getDeclaredTypeOfSymbol(classSym)
	const memberSym = type.getProperty(memberName)
	if (!memberSym) return undefined

	for (const decl of memberSym.getDeclarations() ?? []) {
		const document = extractJsDocument(decl)
		if (document) return document
	}

	return undefined
}

function resolveTopLevelJsDocument(tsconfigPath: string, name: string): string | undefined {
	const key = `${path.resolve(tsconfigPath)}:typeof ${name}`
	if (jsDocumentCache.has(key)) return jsDocumentCache.get(key)!

	const { program } = getState(tsconfigPath)
	let result: string | undefined = undefined

	outer: for (const sf of program.getSourceFiles()) {
		for (const stmt of sf.statements) {
			if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) {
				// Try each overload. JSDoc is usually on the first, but check all.
				const document = extractJsDocument(stmt)
				if (document) {
					result = document
					break outer
				}
				// No `break`: continue scanning for the next overload.
			}
			else if (ts.isVariableStatement(stmt)) {
				for (const decl of stmt.declarationList.declarations) {
					if (ts.isIdentifier(decl.name) && decl.name.text === name) {
						const document = extractJsDocument(stmt)
						if (document) {
							result = document
							break outer
						}
					}
				}
			}
		}
	}

	jsDocumentCache.set(key, result)
	return result
}

function resolveTopLevelTypeDocument(tsconfigPath: string, name: string): string | undefined {
	const key = `${path.resolve(tsconfigPath)}:${name}`
	if (jsDocumentCache.has(key)) return jsDocumentCache.get(key)!

	const { checker, program } = getState(tsconfigPath)
	let result: string | undefined = undefined

	outer: for (const sf of program.getSourceFiles()) {
		for (const stmt of sf.statements) {
			if (
				(ts.isInterfaceDeclaration(stmt) || ts.isClassDeclaration(stmt))
				&& stmt.name?.text === name
			) {
				result = extractJsDocument(stmt)
				if (result) break outer
			}
			else if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === name) {
				result = extractJsDocument(stmt)
				if (result) break outer
				// No JSDoc on the alias itself: follow a simple type reference to find docs on the target.
				if (ts.isTypeReferenceNode(stmt.type)) {
					const sym = checker.getSymbolAtLocation(stmt.type.typeName)
					for (const decl of sym?.getDeclarations() ?? []) {
						result = extractJsDocument(decl)
						if (result) break outer
					}
				}
			}
		}
	}

	jsDocumentCache.set(key, result)
	return result
}

function extractJsDocument(node: ts.Node): string | undefined {
	const sf = node.getSourceFile()
	const text = sf.getFullText()
	// getStart(sf, true) includes JSDoc; getStart(sf, false) excludes it
	const withDocument = node.getStart(sf, true)
	const withoutDocument = node.getStart(sf, false)
	const leading = text.slice(withDocument, withoutDocument).trim()
	if (!leading.startsWith('/**')) return undefined
	return leading
}

// ── d.ts post-processing ────────────────────────────────────────────────────

// tsdown sometimes places the closing */ and the next property on the same line,
// and similarly puts the opening /** of the next comment on the same line as the
// preceding property. Fix both before running any further replacements.
function normalizeInlineComments(content: string): string {
	// Fix: */ immediately followed by non-whitespace (property on same line as closing */)
	// "   */create: foo;" → "   */\n  create: foo;"  (indent = closing indent minus one space)
	content = content.replace(/^( +)\*\/([^\n\s])/gm, (_m, indent: string, ch: string) =>
		`${indent}*/\n${indent.slice(0, -1)}${ch}`,
	)
	// Fix: property ; followed by /** (or a complete /** ... */) on the same line
	// "  foo: Bar; /**" → "  foo: Bar;\n\n  /**"
	content = content.replace(/^( *)(.*); (\/\*\*[^\n]*)$/gm, (_m, indent: string, declaration: string, open: string) =>
		`${indent}${declaration};\n\n${indent}${open}`,
	)
	// Fix: inline single-line JSDoc immediately followed by a property on the same line
	// "  /** foo */bar: baz;" → "  /** foo */\n  bar: baz;"
	content = content.replace(/^(( *)\/\*\*.*?\*\/)([^\n\s])/gm, (_m, comment: string, indent: string, ch: string) =>
		`${comment}\n${indent}${ch}`,
	)
	return content
}

function applyIndent(jsDocument: string, indent: string): string {
	return jsDocument
		.split('\n')
		.map((line, index) => {
			const trimmed = line.trimStart()
			// First line is `/**`; subsequent `*` lines get one extra space to align
			return index === 0 ? indent + trimmed : indent + ' ' + trimmed
		})
		.join('\n')
}

function jsDocumentInner(raw: string): string {
	return raw
		.replace(/^\/\*\*\s*\n?/, '')
		.replace(/\s*\*\/$/, '')
		.replaceAll(/^\s*\*\s?/gm, '')
		.trim()
}

async function processFile(tsconfigPath: string, filePath: string): Promise<void> {
	let content = await readFile(filePath, 'utf8')
	let changed = false

	const normalized = normalizeInlineComments(content)
	if (normalized !== content) {
		content = normalized
		changed = true
	}

	content = content.replaceAll(/( *)\/\*\*([\s\S]*?)\*\//g, (block, indent: string, inner: string) => {
		const m = inner.match(INHERITDOC_RE)
		if (!m) return block

		const [tag, cls, member, identifier, typeName] = m
		const resolved = identifier
			? resolveTopLevelJsDocument(tsconfigPath, identifier)
			: typeName
				? resolveTopLevelTypeDocument(tsconfigPath, typeName)
				: resolveJsDocument(tsconfigPath, cls, member)
		if (!resolved) {
			const reference = identifier ? `typeof ${identifier}` : typeName ?? `${cls}['${member}']`
			process.stderr.write(`[tsdown:inheritdoc] warn: could not resolve {@inheritdoc ${reference}}\n`)
			return block
		}

		changed = true

		// If the comment only contains the inheritdoc tag, replace the whole block
		if (!inner.replace(tag, '').replaceAll(/[\s*]/g, '')) {
			return applyIndent(resolved, indent)
		}

		// Otherwise inline just the JSDoc content text in place of the tag
		return block.replace(tag, jsDocumentInner(resolved))
	})

	if (changed) {
		await writeFile(filePath, content, 'utf8')
		process.stdout.write(`[tsdown:inheritdoc] resolved ${filePath}\n`)
	}
}

// ── DTS file discovery ───────────────────────────────────────────────────────

const DTS_RE = /\.d\.[mc]?ts$/

async function findDtsFiles(outDirectory: string): Promise<string[]> {
	const entries = await readdir(outDirectory, { recursive: true }).catch(() => [] as string[])
	return entries
		.filter(f => DTS_RE.test(f))
		.map(f => path.join(outDirectory, f))
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * tsdown plugin that resolves `{@inheritdoc Type['member']}` tags in generated
 * declaration files by inlining the referenced JSDoc.
 *
 * Looks up `Type` by building a TypeScript program from the package's own
 * tsconfig, so any type visible in the project (including project-local types,
 * dependencies, and whatever libs the tsconfig includes) can be referenced.
 *
 * @example `tsdown.config.mts`
 * ```ts
 * import { inheritdocPlugin } from '@rooted/tsdown'
 *
 * export default defineConfig({
 *   plugins: [inheritdocPlugin()],
 * })
 * ```
 */
export function inheritdocPlugin(): Plugin {
	return {
		name: 'tsdown:inheritdoc',
		tsdownConfig(_config) {
			return {
				hooks: {
					'build:done': async (context) => {
						if (context.options.dts === false) return

						const tsconfig = typeof context.options.tsconfig === 'string'
							? context.options.tsconfig
							: 'tsconfig.json'
						const outDirectory = context.options.outDir ?? 'dist'

						const files = await findDtsFiles(outDirectory)
						await Promise.all(files.map(f => processFile(tsconfig, f)))
					},
				},
			}
		},
	}
}
