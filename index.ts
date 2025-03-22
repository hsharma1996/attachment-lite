/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Export Attachment class and attachment decorator
 */
export { Attachment } from './src/attachment.js'
export { attachment } from './src/decorator/decorator.js'

/**
 * Export the provider
 */
export { default as AttachmentProvider } from './providers/attachment_provider.js'

/**
 * Export drive setup utilities
 */
export { setupDrive, ensureDriveIsSet } from './src/drive_setup.js'

/**
 * Export the config function used for defining package configuration
 */
export function defineConfig(config: any) {
  return config
}

/**
 * Export types
 */
export type { AttachmentOptions, AttachmentContract, AttachmentLiteConfig } from './src/types.js'

/**
 * Simple utility to set up the drive service for attachments
 * This is kept for backward compatibility
 */
export function setupAttachmentDrive(drive: any) {
  const { Attachment } = require('./src/attachment.js')
  Attachment.setDrive(drive)
  console.log('Drive set successfully for Attachment')
  return drive
} 