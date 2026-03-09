import { type Recipe, recipes } from '../recipes/_data.mts'

export type Category = {
	slug: string
	label: string
	recipes: Recipe[]
}

function toLabel(slug: string): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export const categories: Category[] = [...new Set(recipes.map(r => r.category))]
	.map(slug => ({
		slug,
		label: toLabel(slug),
		recipes: recipes.filter(r => r.category === slug),
	}))
