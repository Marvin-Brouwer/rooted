import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'

/**
 * Runs API Extractor against every public-entry `.d.mts` file in `<packageRoot>/dist`.
 * Reads the package's `api-extractor.json` for the base config. Returns
 * a non-zero exit code when any module fails extraction.
 */
export async function extractApi(packageRoot: string) {
	const configFilePath = path.join(packageRoot, 'api-extractor.json')
	const packageJsonPath = path.join(packageRoot, 'package.json')

	// Chunk files produced by rolldown have a hash suffix (e.g. routes-Gxo28CuX.d.mts or generic-component-Da20_kqi.d.mts)
	const chunkPattern = /-\w{8}\.d\.mts$/
	const moduleFiles = await readdir(path.join(packageRoot, 'dist'))
	const modules = moduleFiles
		.filter(f => f.endsWith('.d.mts') && !chunkPattern.test(f))
		.map(f => path.basename(f, '.d.mts'))

	const configFile = await readFile(configFilePath, 'utf8')
	const { $schema: _, ...baseConfig } = JSON.parse(configFile) as Record<string, unknown> & { $schema?: unknown, apiReport?: Record<string, unknown> }

	let allSucceeded = true
	for (const moduleName of modules) {
		console.log(`\nExtracting API: ${moduleName}`)

		const config = ExtractorConfig.prepare({
			configObject: {
				...baseConfig,
				projectFolder: packageRoot,
				mainEntryPointFilePath: `<projectFolder>/dist/${moduleName}.d.mts`,
				compiler: { tsconfigFilePath: `<projectFolder>/tsconfig.json` },
				apiReport: {
					...baseConfig.apiReport,
					enabled: true,
					reportFolder: 'api',
					reportTempFolder: 'api/temp',
					reportFileName: `${moduleName}.api.md`,
				},
			},
			configObjectFullPath: configFilePath,
			packageJsonFullPath: packageJsonPath,
		})

		const result = Extractor.invoke(config, { localBuild: true })
		if (!result.succeeded) allSucceeded = false
	}

	// eslint-disable-next-line unicorn/no-process-exit
	if (!allSucceeded) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await extractApi(process.cwd())
}
