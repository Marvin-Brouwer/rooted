import packageJson from '../package.json' with { type: 'json' }

import type { SeoOptions } from '@rooted/application'

const baseUrl = packageJson.homepage.slice(0, -1)

const intro = `
Recipe Book is a demo application built with the \`@rooted/*\` framework.
It showcases client-side routing, lazy-loaded components, and responsive image handling.

For more information, see: https://github.com/Marvin-Brouwer/rooted?tab=readme-ov-file#rooted
`.trim()

export const seo: SeoOptions = {
	llmsTxt: {
		intro,
		sections: [
			{
				title: 'Recipes',
				// Normally, when using a real database, you can generate these by querying the database
				entries: [
					{ title: 'Pasta Carbonara', url: `${baseUrl}/recipe/1/`, description: 'A classic Roman pasta with crispy guanciale, eggs, and Pecorino Romano — no cream required.' },
					{ title: 'Chicken Tikka Masala', url: `${baseUrl}/recipe/2/`, description: 'Tender marinated chicken in a rich, spiced tomato-cream sauce — a crowd-pleasing classic.' },
					{ title: 'Chocolate Lava Cake', url: `${baseUrl}/recipe/3/`, description: 'Individual molten chocolate cakes with a warm, flowing centre — stunning and surprisingly simple.' },
					{ title: 'Caesar Salad', url: `${baseUrl}/recipe/4/`, description: 'Crisp romaine lettuce with a punchy anchovy dressing, shaved Parmesan, and crunchy homemade croutons.' },
					{ title: 'Crispy Beef Tacos', url: `${baseUrl}/recipe/5/`, description: 'Seasoned ground beef with a zingy slaw, avocado, and pickled jalapeños in warm corn tortillas.' },
					{ title: 'Risotto alla Milanese', url: `${baseUrl}/recipe/6/`, description: 'The golden risotto of Milan — creamy arborio rice perfumed with saffron and finished with cold butter.' },
					{ title: 'Chicken Enchiladas Rojas', url: `${baseUrl}/recipe/7/`, description: 'Tender shredded chicken rolled in corn tortillas, smothered in a smoky red chilli sauce and baked under melted cheese.' },
					{ title: 'Crème Brûlée', url: `${baseUrl}/recipe/8/`, description: 'Silky vanilla custard baked low and slow, then crowned with a crackle of caramelised sugar.' },
					{ title: 'Sticky Toffee Pudding', url: `${baseUrl}/recipe/9/`, description: 'A deeply moist date sponge drenched in butterscotch toffee sauce — the ultimate British comfort dessert.' },
				],
			},
			{
				title: 'Browse by category',
				// Normally, when using a real database, you can generate these by querying the database
				entries: [
					{ title: 'All categories', url: `${baseUrl}/categories/` },
					{ title: 'Italian', url: `${baseUrl}/categories/italian/` },
					{ title: 'Indian', url: `${baseUrl}/categories/indian/` },
					{ title: 'Mexican', url: `${baseUrl}/categories/mexican/` },
					{ title: 'Desserts', url: `${baseUrl}/categories/desserts/` },
					{ title: 'Salads', url: `${baseUrl}/categories/salads/` },
				],
			},
			{
				title: 'Other pages',
				entries: [
					{ title: 'Search', url: `${baseUrl}/search/`, description: 'Find recipes by keyword, category, or ingredient.' },
					{ title: 'Accessibility', url: `${baseUrl}/accessibility/`, description: 'Accessibility statement for the Rooted Recipe Book demo application.' },
					{ title: 'Privacy', url: `${baseUrl}/privacy/`, description: 'Privacy policy for the Rooted Recipe Book demo application.' },
					{ title: 'Content notice', url: `${baseUrl}/content-notice/`, description: 'About this demo application and the content it uses.' },
					{ title: 'Licenses', url: `${baseUrl}/licenses/`, description: 'Open source licenses used by the Rooted Recipe Book demo application.' },
				],
			},
		],
	},
}
