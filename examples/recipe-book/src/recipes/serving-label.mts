import { choice } from '@rooted/components'

/** Formats a serving count with the right singular or plural noun, like `1 serving` or `4 servings`. */
export function servingCountLabel(servings: number): string {
	const noun = choice(servings === 1,
		'serving',
		'servings'
	)

	return `${servings} ${noun}`
}
