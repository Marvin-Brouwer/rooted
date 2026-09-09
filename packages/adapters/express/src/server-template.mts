import { buildMiddlewareBlock, buildServerPreamble } from '@rooted/adapter'

/**
 * Builds the `server.mjs` that ships in the output directory. Everything up to
 * the Express instance is shared with the other node adapters; what follows is
 * the part only Express does.
 */
export function buildExpressTemplate(hasMiddleware: boolean): string {
	const preamble = buildServerPreamble({
		frameworkImports: `import express from 'express'`,
		hasMiddleware,
	})

	return `${preamble}const app = express()
${buildMiddlewareBlock(hasMiddleware)}
// Canonical slash, after your middleware so an API route it owns is never
// redirected out from under it.
app.use((req, res, next) => {
  const target = (req.method === 'GET' || req.method === 'HEAD') ? canonicalRedirect(req.url) : undefined
  if (target) return res.redirect(301, target)
  next()
})

// Serves all pre-rendered HTML files and static assets automatically
app.use(base, express.static(__dirname))

// Parameterized routes: Express uses the same :param syntax as the rooted router
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, res) =>
    res.status(200).type('html').send(fallbackHtml)
  )
}

// Anything else is a real 404. Navigations still get the SPA shell so the
// browser-side router can render a 404 page; everything else gets an empty
// body, because answering an image request with HTML only confuses things.
app.use((req, res) => {
  if (!(req.headers.accept ?? '').includes('text/html')) return res.status(404).end()
  res.status(404).type('html').send(fallbackHtml)
})

const port = Number(process.env.PORT ?? 3000)
app.listen(port, '0.0.0.0', () => console.log(\`Listening on http://0.0.0.0:\${port}\`))
`
}
