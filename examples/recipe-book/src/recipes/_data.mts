import matter from 'gray-matter'
import { marked } from 'marked'

import pastaRaw from './content/pasta-carbonara.md?raw'
import tikkaRaw from './content/chicken-tikka-masala.md?raw'
import lavaRaw from './content/chocolate-lava-cake.md?raw'
import caesarRaw from './content/caesar-salad.md?raw'
import tacosRaw from './content/beef-tacos.md?raw'

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

function parseRecipe(raw: string, id: number): Recipe {
	const { data, content } = matter(raw)
	return {
		id,
		title: data['title'] as string,
		category: data['category'] as string,
		tags: data['tags'] as string[],
		servings: data['servings'] as number,
		prepTime: data['prepTime'] as number,
		cookTime: data['cookTime'] as number,
		difficulty: data['difficulty'] as Recipe['difficulty'],
		featured: (data['featured'] as boolean | undefined) ?? false,
		description: data['description'] as string,
		html: marked(content) as string,
	}
}

export const recipes: Recipe[] = [
	parseRecipe(pastaRaw, 1),
	parseRecipe(tikkaRaw, 2),
	parseRecipe(lavaRaw, 3),
	parseRecipe(caesarRaw, 4),
	parseRecipe(tacosRaw, 5),
]
