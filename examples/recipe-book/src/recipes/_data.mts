import pastaData from './content/pasta-carbonara.md'
import tikkaData from './content/chicken-tikka-masala.md'
import lavaData from './content/chocolate-lava-cake.md'
import caesarData from './content/caesar-salad.md'
import tacosData from './content/beef-tacos.md'

export type Recipe = {
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

export const recipes: Recipe[] = [
	{ id: 1, ...pastaData },
	{ id: 2, ...tikkaData },
	{ id: 3, ...lavaData },
	{ id: 4, ...caesarData },
	{ id: 5, ...tacosData },
]
