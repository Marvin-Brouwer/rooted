import { route } from '@rooted/router/routes'

export const ContentNoticeRoute = route`/content-notice/`({
	async resolve({ create }) {
		const { ContentNotice } = await import('./content-notice.mts')
		return create(ContentNotice)
	},
})

export const AccessibilityRoute = route`/accessibility/`({
	async resolve({ create }) {
		const { Accessibility } = await import('./accessibility.mts')
		return create(Accessibility)
	},
})

export const PrivacyRoute = route`/privacy/`({
	async resolve({ create }) {
		const { Privacy } = await import('./privacy.mts')
		return create(Privacy)
	},
})

export const LicensesRoute = route`/licenses/`({
	async resolve({ create }) {
		const { Licenses } = await import('./licenses.mts')
		return create(Licenses)
	},
})
