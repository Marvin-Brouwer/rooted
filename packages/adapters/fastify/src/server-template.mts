import { buildMiddlewareBlock, buildServerPreamble } from '@rooted/adapter'

/**
 * Builds the `server.mjs` that ships in the output directory. Everything up to
 * the Fastify instance is shared with the other node adapters; what follows is
 * the part only Fastify does.
 */
export function buildFastifyTemplate(hasMiddleware: boolean): string {
	const preamble = buildServerPreamble({
		frameworkImports: `import Fastify from 'fastify'\nimport fastifyStatic from '@fastify/static'`,
		hasMiddleware,
	})

	return `${preamble}const app = Fastify({ logger: true })
${buildMiddlewareBlock(hasMiddleware)}
// Canonical slash, after your middleware so an API route it owns is never
// redirected out from under it.
app.addHook('onRequest', (request, reply, done) => {
  const target = canonicalRedirect(request.url)
  if (target) return reply.redirect(target, 301)
  done()
})

// Serves all pre-rendered HTML files and static assets automatically
await app.register(fastifyStatic, { root: __dirname, prefix: base })

// Parameterized routes: Fastify matches the pattern, SPA router handles content
for (const route of dynamicRoutes) {
  app.get(prefix + route, (_req, reply) =>
    reply.code(200).type('text/html').send(fallbackHtml)
  )
}

// Anything else is a real 404. Navigations still get the SPA shell so the
// browser-side router can render a 404 page; everything else gets an empty
// body, because answering an image request with HTML only confuses things.
app.setNotFoundHandler((request, reply) => {
  if (!(request.headers.accept ?? '').includes('text/html'))
    return reply.code(404).send()
  return reply.code(404).type('text/html').send(fallbackHtml)
})

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
`
}
