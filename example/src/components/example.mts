import { component } from '@rooted/components'

export type ExampleOptions = {
	text: string
}
export const Example = component<ExampleOptions>({
	name: 'example',
	onMount({ append, options }) {
		append('p', {
			textContent: `this is a test "${options.text}"`
		})
	},
})