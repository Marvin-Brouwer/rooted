interface ImportMeta {
	readonly env: {
		/** `true` in development, `false` in production builds */
		readonly DEV: boolean
		/** The app base path Vite was configured with. Always ends with `/` */
		readonly BASE_URL: string
	}
}
