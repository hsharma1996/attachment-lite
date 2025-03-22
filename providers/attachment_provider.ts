/**
 * @adonisjs/attachment-lite
 *
 * @license MIT
 */

import type { ApplicationService } from '@adonisjs/core/types'
import { Attachment } from '../src/attachment.js'

/**
 * Define container bindings for TypeScript
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'craftnotion/attachment-lite': typeof Attachment
  }
}

/**
 * Provider to register the attachment-lite service
 */
export default class AttachmentProvider {
  constructor(protected app: ApplicationService) { }

  /**
   * Register the attachment service to the container
   */
  register() {
    // Register the Attachment class in the container
    this.app.container.singleton('craftnotion/attachment-lite', async () => {
      const drive = await this.app.container.make('drive.manager')
      Attachment.setDrive(drive)
      return Attachment;
    })
  }

  /**
   * Boot the provider when app is ready
   */
  async boot() {

  }
} 