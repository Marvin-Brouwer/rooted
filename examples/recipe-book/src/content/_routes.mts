import { route } from '@rooted/router/routes'

export const ContentNoticeRoute = route`/content-notice/`({
	async resolve({ create }) {
		const { ContentNotice } = await import('./content-notice.mts')
		return create(ContentNotice)
	},
	seo: {
		title: 'Content notice',
		description: 'About this demo application and the content it uses.',
	},
})

export const AccessibilityRoute = route`/accessibility/`({
	async resolve({ create }) {
		const { Accessibility } = await import('./accessibility.mts')
		return create(Accessibility)
	},
	seo: {
		title: 'Accessibility',
		description: 'Accessibility statement for the Rooted Recipe Book demo application.',
	},
})

export const PrivacyRoute = route`/privacy/`({
	async resolve({ create }) {
		const { Privacy } = await import('./privacy.mts')
		return create(Privacy)
	},
	seo: {
		title: 'Privacy',
		description: 'Privacy policy for the Rooted Recipe Book demo application.',
	},
})

export const LicensesRoute = route`/licenses/`({
	async resolve({ create }) {
		const { Licenses } = await import('./licenses.mts')
		return create(Licenses)
	},
	seo: {
		title: 'Licenses',
		description: 'Open source licenses used by the Rooted Recipe Book demo application.',
	},
})
