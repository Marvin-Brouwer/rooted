import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'

export async function extractApi(packageRoot: string) {
	const configFilePath = join(packageRoot, 'api-extractor.json')
	const packageJsonPath = join(packageRoot, 'package.json')

	// Chunk files produced by tsup have a hash suffix (e.g. routes-Gxo28CuX.d.mts)
	const chunkPattern = /-[\dA-Za-z]{8}\.d\.mts$/
	const modules = readdirSync(join(packageRoot, 'dist'))
		.filter(f => f.endsWith('.d.mts') && !chunkPattern.test(f))
		.map(f => basename(f, '.d.mts'))

	const { $schema: _, ...baseConfig } = JSON.parse(readFileSync(configFilePath, 'utf8')) as Record<string, unknown> & { $schema?: unknown, apiReport?: Record<string, unknown> }

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
