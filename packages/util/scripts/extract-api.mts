import { fileURLToPath } from 'node:url'
import { extractApi } from '@rooted/development'

await extractApi(fileURLToPath(new URL('..', import.meta.url)))
