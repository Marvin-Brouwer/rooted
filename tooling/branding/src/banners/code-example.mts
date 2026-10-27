/**
 * The code shown in the README banner and the social preview.
 *
 * Write it the way the codebase writes it: tabs, one property per line, options types declared on their own.
 * It starts in the top-left and may run off the bottom edge, so keep the lines that end up next to the wordmark short.
 */
export const codeExample = `import { component } from '@rooted/components'

type ArticleCardOptions = {
	title: string
	summary: string
}

export const ArticleCard = component<ArticleCardOptions>({
	name: 'article-card',
	onMount({ append, element, options }) {
		append(
			element('article', {
				children: [
					element('h2', {
						textContent: options.title,
					}),
					element('p', {
						textContent: options.summary,
					}),
				],
			})
		)
	},
})
`
