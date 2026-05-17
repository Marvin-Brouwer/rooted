import { staticAdapter } from '@rooted/adapter'

import type { AdapterRoutes } from '@rooted/adapter'
import type { Plugin } from 'vite'

/**
 * Options for {@link awsS3Adapter}.
 */
export type AwsS3AdapterOptions = {
	/**
	 * Manual route list for projects that don't use `generateRouteManifest`.
	 * See {@link AdapterRoutes}.
	 */
	routes?: AdapterRoutes
}

/**
 * Adapter for AWS S3 static website hosting.
 *
 * Writes pre-rendered HTML files and a `404.html` SPA shell. S3 bucket website
 * hosting serves `404.html` automatically for unknown paths -- no extra files needed.
 * Bucket error-document settings and public access policies are configured outside the build.
 *
 * Also works for S3-compatible hosts with no extra configuration:
 * - DigitalOcean Spaces
 * - STACKIT Object Storage
 * - OVH Object Storage (note: static endpoints are HTTP-only by default)
 *
 * @example `vite.config.ts`
 * ```ts
 * import { rootedManifest } from '@rooted/application'
 * import { awsS3Adapter } from '@rooted-adapters/aws-s3'
 *
 * export default rootedManifest({
 *   plugins: [awsS3Adapter()],
 * })
 * ```
 */
export function awsS3Adapter(options?: AwsS3AdapterOptions): Plugin {
	return staticAdapter({ name: 'rooted:aws-s3', routes: options?.routes })
}
