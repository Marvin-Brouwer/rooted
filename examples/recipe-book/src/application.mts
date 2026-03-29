import { component } from '@rooted/components'
import { application } from '@rooted/components/application'
import { router } from '@rooted/router/application'

import { ContentBanner } from './_layout/content-banner.mts'
import { Doormat } from './_layout/doormat.mts'
import { appRoutes } from './_routes.g.mts'
import styles from './application.css'
import { HomePage } from './navigation/home.mts'
import { NavigationMenu } from './navigation/navigation-menu.mts'
import { NavigationProgress, NavigationSpinner } from './navigation/navigation-progress.mts'
import { NotFoundPage } from './navigation/not-found.mts'

const Router = router({
	home: HomePage,
	notFound: NotFoundPage,
	...appRoutes,
})

type PopoverElement = HTMLElement & { showPopover(): void; hidePopover(): void }

export const Application = component({
	name: 'recipe-application',
	styles,
	onMount({ append, element, create, signal }) {
		document.title = 'Recipe Book'

		const progress: Record<string, { done: boolean }> = {}

		const spinner = create(NavigationSpinner)

		const navOverlay = document.createElement('div') as PopoverElement
		navOverlay.setAttribute('popover', 'manual')
		navOverlay.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;margin:0;padding:0;border:none;background:transparent;pointer-events:none;'
		document.body.appendChild(navOverlay)

		let navOverlayShowing = false
		const navObserver = new MutationObserver(() => {
			if (navOverlay.children.length === 0 && navOverlayShowing) {
				navOverlay.hidePopover()
				navOverlayShowing = false
			}
		})
		navObserver.observe(navOverlay, { childList: true })
		signal.addEventListener('abort', () => {
			navObserver.disconnect()
			navOverlay.remove()
		})

		append(
			element('div', {
				id: 'app',
				children: [
					element('header', {
						classes: styles.stickyHeader,
						children: [
							create(NavigationMenu),
							create(ContentBanner),
						],
					}),
					element('main', {
						id: 'main-content',
						children: create(Router, {
							viewTransition: true,
							scrollBehavior: { scrollToTop: 'on:start-and-end' },
							on: {
								navigate(event) {
									if (event.spinnerRecommended) {
										navOverlay.appendChild(spinner)
									}
									else {
										spinner.remove()
									}

									if (event.navigationType === 'start') {
										if (progress[event.href]) return
										progress[event.href] = { done: false }

										navOverlay.appendChild(create(NavigationProgress, { href: event.href, state: progress[event.href] }))
										if (!navOverlayShowing) {
											navOverlay.showPopover()
											navOverlayShowing = true
										}
									}
									if (event.navigationType === 'end') {
										progress[event.href].done = true
										requestAnimationFrame(() => delete progress[event.href])
										spinner.remove()
									}
								},
							},
						}),
					}),
					element('footer', {
						children: [create(Doormat)],
					}),
				],
			}),
		)
	},
})

application(Application)
