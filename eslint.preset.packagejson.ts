import { defineConfig } from 'eslint/config'
import { configs as packageJsonConfigs } from 'eslint-plugin-package-json'

import type { Rule } from 'eslint'

const OFFICIAL_REGISTRY = 'https://registry.npmjs.org/'

interface JsonLiteral {
	value: unknown
}
interface JsonProperty {
	key: JsonLiteral
	value: JsonObjectExpression | JsonLiteral
}
interface JsonObjectExpression {
	type: 'JSONObjectExpression'
	properties: JsonProperty[]
}

function isJsonObjectExpression(value: JsonObjectExpression | JsonLiteral): value is JsonObjectExpression {
	return (value as JsonObjectExpression).type === 'JSONObjectExpression'
}

const requirePublishConfigRegistry: Rule.RuleModule = {
	meta: {
		type: 'problem',
		docs: {
			description: `Require publishConfig.registry to be "${OFFICIAL_REGISTRY}" for public packages`,
		},
		schema: [],
		messages: {
			missingRegistry: `publishConfig must include "registry": "${OFFICIAL_REGISTRY}"`,
			wrongRegistry: `publishConfig.registry must be "${OFFICIAL_REGISTRY}", got "{{ value }}"`,
		},
	},
	create(context: Rule.RuleContext): Rule.RuleListener {
		let isPrivate = false
		let publishConfigNode: Rule.Node | undefined
		let registryValue: string | undefined

		return {
			'JSONProperty[key.value="private"]'(node: Rule.Node) {
				const property = node as unknown as JsonProperty
				if (property.value.value === true) isPrivate = true
			},
			'JSONProperty[key.value="publishConfig"]'(node: Rule.Node) {
				publishConfigNode = node
				const property = node as unknown as JsonProperty
				if (!isJsonObjectExpression(property.value)) return
				const registryProperty = property.value.properties
					.find(p => p.key.value === 'registry')
				registryValue = registryProperty?.value?.value as string | undefined
			},
			'Program:exit'() {
				if (isPrivate || publishConfigNode === undefined) return
				if (registryValue === OFFICIAL_REGISTRY) return
				context.report({
					node: publishConfigNode,
					messageId: registryValue === undefined ? 'missingRegistry' : 'wrongRegistry',
					data: { value: registryValue ?? '' },
				})
			},
		} as unknown as Rule.RuleListener
	},
}

export const lintPackageJson = defineConfig([
	{
		// Use the plugin's recommended config solely for the jsonc parser it brings in
		...packageJsonConfigs['recommended'],
		rules: {},
	},
	{
		files: ['packages/*/package.json'],
		plugins: {
			['local']: { rules: { 'require-publish-config-registry': requirePublishConfigRegistry } },
		},
		rules: {
			'local/require-publish-config-registry': 'error',
		},
	},
])
