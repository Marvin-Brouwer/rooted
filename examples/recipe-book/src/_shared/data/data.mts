/**
 * A single group of ingredients on a recipe.
 * `heading` holds the sub-section label when the recipe splits its ingredients
 * into groups (like "Marinade" and "Sauce"). Flat recipes produce a single
 * group with `heading` left undefined.
 */
export type IngredientGroup = {
	heading?: string
	items: string[]
}

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
	ingredients: IngredientGroup[]
	instructionsHtml: string
}

export type CategoryData = {
	slug: string
	label: string
	recipes: RecipeData[]
}

// ---------------------------------------------------------------------------
// Registry — one entry per recipe file.
// `featured` is mirrored from frontmatter so the home page can load only
// featured recipes without touching the rest of the files.
// ---------------------------------------------------------------------------

type RawRecipe = Omit<RecipeData, 'id'>

type RegistryEntry = {
	id: number
	featured: boolean
	load: () => Promise<{ default: RawRecipe }>
}

const REGISTRY: RegistryEntry[] = [
	{ id: 1, featured: true, load: () => import('../content/pasta-carbonara.md') },
	{ id: 2, featured: true, load: () => import('../content/chicken-tikka-masala.md') },
	{ id: 3, featured: true, load: () => import('../content/chocolate-lava-cake.md') },
	{ id: 4, featured: false, load: () => import('../content/caesar-salad.md') },
	{ id: 5, featured: false, load: () => import('../content/beef-tacos.md') },
	{ id: 6, featured: false, load: () => import('../content/risotto-milanese.md') },
	{ id: 7, featured: false, load: () => import('../content/chicken-enchiladas.md') },
	{ id: 8, featured: false, load: () => import('../content/creme-brulee.md') },
	{ id: 9, featured: true, load: () => import('../content/sticky-toffee-pudding.md') },
]

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const recipeCache = new Map<number, RecipeData>()
let categoriesCache: CategoryData[] | undefined

async function loadById(id: number): Promise<RecipeData | undefined> {
	if (recipeCache.has(id)) return recipeCache.get(id)
	const entry = REGISTRY.find(r => r.id === id)
	if (!entry) return undefined
	const recipeContentModule = await entry.load()
	const recipe: RecipeData = { id, ...recipeContentModule.default }
	recipeCache.set(id, recipe)
	return recipe
}

async function loadAll(): Promise<RecipeData[]> {
	return Promise.all(REGISTRY.map(entry => loadById(entry.id))) as Promise<RecipeData[]>
}

async function loadCategories(): Promise<CategoryData[]> {
	if (categoriesCache) return categoriesCache
	const recipes = await loadAll()
	categoriesCache = [...new Set(recipes.map(r => r.category))].map(slug => ({
		slug,
		label: slug.charAt(0).toUpperCase() + slug.slice(1),
		recipes: recipes.filter(r => r.category === slug),
	}))
	return categoriesCache
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fake database for demo purposes */
export const recipeData = {
	/** Loads a single recipe by id. Only that file is fetched. */
	getRecipeById(id: number) { return loadById(id) },

	/**
	 * Loads only featured recipes. Non-featured files are not fetched.
	 * Normally, you'd solve this with some kind of querying engine or a generator.
	 * This is just to illustrate only loading what you need. See it as a stored procedure.
	 */
	listFeatured() {
		return Promise.all(
			REGISTRY.filter(e => e.featured).map(e => loadById(e.id)),
		) as Promise<RecipeData[]>
	},

	/** Loads all recipes. Results are cached after the first call. */
	listRecipes() { return loadAll() },

	/** Returns all categories with their recipes. Triggers a full load if not cached. */
	listCategories() { return loadCategories() },

	/** Finds a category by slug. Triggers a full load if not cached. */
	async findCategoryBySlug(slug: string) {
		const cats = await loadCategories()
		return cats.find(c => c.slug === slug)
	},
}
