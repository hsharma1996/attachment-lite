/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Export Attachment class and interfaces
 */
export { Attachment } from './src/attachment.js'
export { attachment } from './src/decorator/decorator.js'

/**
 * Export the config function used for defining package configuration
 */
export function defineConfig(config: any) {
  return config
}

/**
 * Export the provider
 */
export { default as AttachmentProvider } from './providers/attachment_provider.js'

/**
 * Export types
 */
export type { AttachmentOptions, AttachmentContract, AttachmentLiteConfig } from './src/types.js' 