import { component, type GenericComponent } from '@rooted/components'
import { createComponent } from '@rooted/components/elements'

/**
 * Builds the content for one locale. Called on mount and again whenever the
 * locale changes, so it should build fresh nodes each time rather than reusing
 * ones it handed out before.
 */
export type LocalizedRender<TLocale extends string> =
	(locale: TLocale) => Node | GenericComponent | Promise<Node | GenericComponent>

type LoadLocale<TLocale extends string> = () => Promise<[locale: TLocale, changed: boolean]>

type LocalizedOptions = {
	load: LoadLocale<string>
	render: LocalizedRender<string>
}

// Defined once at module scope, not per `configureLocalization` call: component
// names have to be unique app-wide, and configuring twice would otherwise warn
// about a duplicate.
const LocalizedContent = component<LocalizedOptions>({
	name: '@rooted/localized-content',
	async onMount({ options, replace, on }) {
		on('window', 'popstate', async () => {
			const [locale, changed] = await options.load()
			if (!changed) return
			replace(await options.render(locale))
		})

		// Mounting always needs content, so the first render isn't gated on `changed`
		const [locale] = await options.load()
		replace(await options.render(locale))
	},
})

/**
 * @internal
 * Builds the `localized` member of a configured localization instance.
 */
export function createLocalizedFactory<TLocale extends string>(load: LoadLocale<TLocale>) {
	return function localized(render: LocalizedRender<TLocale>): GenericComponent {
		return createComponent(LocalizedContent, {
			load: load as LoadLocale<string>,
			render: render as LocalizedRender<string>,
		})
	}
}
