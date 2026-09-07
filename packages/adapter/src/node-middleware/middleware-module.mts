/**
 * One middleware file, loaded and ready to be handed a framework instance.
 *
 * The loader produces these, the chain hands them to the adapter's
 * `createServer`, and the order they arrive in is the order the generated
 * server would have run them.
 */
export type MiddlewareModule<TApplication> = {
	/** Absolute path of the file it came from. Handy in error messages. */
	file: string
	/**
	 * The file's default export. Already wrapped: if it throws, the failure is
	 * logged and swallowed, so one broken file doesn't take the server with it.
	 */
	register(application: TApplication): Promise<void>
}
