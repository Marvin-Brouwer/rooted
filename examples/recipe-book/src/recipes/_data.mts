import pastaData from './content/pasta-carbonara.md'
import tikkaData from './content/chicken-tikka-masala.md'
import lavaData from './content/chocolate-lava-cake.md'
import caesarData from './content/caesar-salad.md'
import tacosData from './content/beef-tacos.md'
import risottoData from './content/risotto-milanese.md'
import enchiladasData from './content/chicken-enchiladas.md'
import cremeBruleeData from './content/creme-brulee.md'
import stickyToffeeData from './content/sticky-toffee-pudding.md'

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
	{ id: 6, ...risottoData },
	{ id: 7, ...enchiladasData },
	{ id: 8, ...cremeBruleeData },
	{ id: 9, ...stickyToffeeData },
]
