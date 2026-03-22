import { route } from '@rooted/router/routes'

export const ContentNoticeRoute = route`/content-notice/`({
	async resolve({ create }) {
		const { ContentNotice } = await import('./content-notice.mts')
		return create(ContentNotice)
	},
})
