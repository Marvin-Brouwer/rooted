import { component } from '@rooted/components'
import { type GateParameters } from '@rooted/router'
import { type RecipeGate } from '../categories/_gates.mts'
import { recipes } from './_data.mts'
import { navigate } from '../navigate.mts'

export type RecipeOptions = {
	gate: GateParameters<typeof RecipeGate>
}

export const Recipe = component<RecipeOptions>({
	name: 'recipe-detail',
	styles: `
		.back-link {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			color: var(--color-primary);
			text-decoration: none;
			font-size: 0.9rem;
			margin-bottom: 1.5rem;
		}
		.back-link:hover { text-decoration: underline; }
		.recipe-header { margin-bottom: 1.5rem; }
		.recipe-header h2 { margin: 0 0 0.75rem; font-size: 1.75rem; }
		.recipe-meta {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}
		.meta-badge {
			background: var(--color-bg);
			border: 1px solid var(--color-border);
			border-radius: 20px;
			padding: 0.25rem 0.75rem;
			font-size: 0.85rem;
			color: var(--color-text-muted);
			text-transform: capitalize;
		}
		.recipe-body { line-height: 1.7; margin-top: 1.5rem; }
		.recipe-body h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; color: var(--color-primary); }
		.recipe-body ul, .recipe-body ol { padding-left: 1.5rem; margin: 0 0 1rem; }
		.recipe-body li { margin-bottom: 0.3rem; }
		.recipe-body p { margin: 0 0 0.75rem; }
		.recipe-body h3 { font-size: 1rem; margin: 1rem 0 0.4rem; }
		.not-found { color: var(--color-text-muted); font-style: italic; }
	`,
	onMount({ append, options, signal }) {
		const recipe = recipes.find(r => r.id === options.gate.id)

		if (!recipe) {
			append('p', { className: 'not-found', textContent: 'Recipe not found.' })
			return
		}

		const backHref = `/categories/${recipe.category}/`
		const back = append('a', {
			href: backHref,
			textContent: `← Back to ${recipe.category}`,
			className: 'back-link',
		})
		back.addEventListener('click', e => { e.preventDefault(); navigate(backHref) }, { signal })

		const header = append('div', { className: 'recipe-header' })
		header.append(
			Object.assign(document.createElement('h2'), { textContent: recipe.title }),
		)

		const meta = document.createElement('ul')
		meta.className = 'recipe-meta'
		const badges = [
			recipe.category,
			`${recipe.servings} serving${recipe.servings !== 1 ? 's' : ''}`,
			`Prep ${recipe.prepTime} min`,
			`Cook ${recipe.cookTime} min`,
			recipe.difficulty,
		]
		for (const text of badges) {
			const li = document.createElement('li')
			li.className = 'meta-badge'
			li.textContent = text
			meta.append(li)
		}
		header.append(meta)

		// Render the markdown-converted HTML body.
		// Safe: content originates from version-controlled markdown files.
		const body = append('div', { className: 'recipe-body' })
		body.innerHTML = recipe.html
	},
})
