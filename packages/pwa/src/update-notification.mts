import { component } from '@rooted/components'
import { ElementChild, ElementChildren } from '@rooted/components/elements'
import { onUpdateReady } from '@rooted/pwa'

/** Options for {@link UpdateNotification}. */
export type UpdateNotificationOptions = {
	/**
	 * What to render once there's an update.
	 * A single node or string, or an array of them.
	 * `undefined` and `null` entries are skipped.
	 */
	children?: ElementChildren
}

/**
 * Renders its children only once a new version is installed and waiting.
 * Until then it renders nothing, so it's safe to leave mounted in a layout.
 *
 * It adds no element of its own, so whatever you put inside lands straight in the parent's layout.
 *
 * The children are built when the component mounts, not when the update arrives.
 * Keep them cheap.
 *
 * @example A banner with a way to take the update
 * ```ts
 * create(UpdateNotification, {
 *   children: [
 *     element('span', {
 *       textContent: 'A new version is ready.',
 *     }),
 *     create(ApplyUpdateButton, {
 *       label: 'Reload',
 *     }),
 *   ],
 * })
 * ```
 *
 * @see {@link ApplyUpdateButton}
 */
export const UpdateNotification = component<UpdateNotificationOptions>({
	name: '@rooted/update-notification',
	onMount({ options, append, signal }) {
		const { children } = options

		const nodes = (Array.isArray(children) ? children : [children])
			.filter((child): child is Exclude<ElementChild, undefined | null> => child !== undefined && child !== null)

		onUpdateReady(signal, () => {
			append(...nodes)
		})
	},
})
