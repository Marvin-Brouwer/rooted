// Wrapper around eslint-plugin-unicorn, loaded via jsPlugins in oxlint.config.json.
//
// oxlint validates every rule's `meta.defaultOptions` against that rule's own
// `meta.schema` when it registers a JS plugin. eslint-plugin-unicorn 72.0.0 ships
// `defaultOptions: [undefined]` on `logical-assignment-operators`, and its schema
// only accepts "always" or "never", so the check fails and oxlint refuses to load
// the whole plugin. ESLint itself never notices, because it reads an empty slot as
// "no option given". (oxlint reports the value as `null`, that's just how JSON
// prints an undefined array entry.)
//
// Dropping those empty slots gets us back to the ESLint behaviour. Once upstream
// fixes the metadata this file can go and oxlint.config.json can point at the
// package again.

import unicorn from 'eslint-plugin-unicorn'

/** Strip empty `defaultOptions` entries, and the key itself if nothing is left. */
function withoutEmptyDefaults(rule) {
	const defaults = rule.meta?.defaultOptions
	if (!defaults?.some((option) => option === null || option === undefined)) return rule

	const kept = defaults.filter((option) => option !== null && option !== undefined)
	const meta = { ...rule.meta }
	if (kept.length === 0) delete meta.defaultOptions
	else meta.defaultOptions = kept

	return { ...rule, meta }
}

export default {
	...unicorn,
	rules: Object.fromEntries(
		Object.entries(unicorn.rules).map(([name, rule]) => [name, withoutEmptyDefaults(rule)]),
	),
}
