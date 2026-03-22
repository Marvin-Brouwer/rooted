import tacosData from '../content/beef-tacos.md'
import caesarData from '../content/caesar-salad.md'
import enchiladasData from '../content/chicken-enchiladas.md'
import tikkaData from '../content/chicken-tikka-masala.md'
import lavaData from '../content/chocolate-lava-cake.md'
import cremeBruleeData from '../content/creme-brulee.md'
import pastaData from '../content/pasta-carbonara.md'
import risottoData from '../content/risotto-milanese.md'
import stickyToffeeData from '../content/sticky-toffee-pudding.md'

export type RecipeData = {
	id: number
	title: string
	category: string
	tags: string[]
	servings: number
	prepTime: number
	cookTime: number
	difficulty: 'easy' | 'medium' | 'hard'
	featured: boolean
	description: string
	html: string
}

const recipes: RecipeData[] = [
	{ id: 1, ...pastaData },
	{ id: 2, ...tikkaData },
	{ id: 3, ...lavaData },
	{ id: 4, ...caesarData },
	{ id: 5, ...tacosData },
	{ id: 6, ...risottoData },
	{ id: 7, ...enchiladasData },
	{ id: 8, ...cremeBruleeData },
	{ id: 9, ...stickyToffeeData },
]

export type CategoryData = {
	slug: string
	label: string
	recipes: RecipeData[]
}

function toLabel(slug: string): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1)
}

const categories: CategoryData[] = [...new Set(recipes.map(r => r.category))]
	.map(slug => ({
		slug,
		label: toLabel(slug),
		recipes: recipes.filter(r => r.category === slug),
	}))

/** Fake database for demo purposes */
export const recipeData = {
	getRecipeById(id: number) { return Promise.resolve(recipes.find(recipe => recipe.id === id)) },
	listRecipes() { return Promise.resolve(recipes) },
	findCategoryBySlug(slug: string) { return Promise.resolve(categories.find(category => category.slug === slug)) },
	listCategories() { return Promise.resolve(categories) },
}
