import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'

import HeroBar from './hero-bar.vue'
import NavLogo from './nav-logo.vue'

import '@fontsource/jetbrains-mono/400.css'
import './brand.css'

/** The default VitePress theme with the brand from `docs/branding/style-guide.md` applied. */
export default {
	extends: DefaultTheme,
	Layout: () => h(DefaultTheme.Layout, null, {
		'nav-bar-title-before': () => h(NavLogo),
		'home-hero-before': () => h(HeroBar),
	}),
}
