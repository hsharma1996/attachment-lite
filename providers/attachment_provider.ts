/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import { Attachment } from '../src/attachment.js'
import drive from '@adonisjs/drive/services/main'

/**
 * Extending the container with attachment.lite binding
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'attachment.lite': typeof Attachment
  }
}

/**
 * Attachment Provider registers the Attachment class
 * to the IoC container and sets up the Drive instance
 */
export default class AttachmentProvider {
  constructor(protected app: ApplicationService) { }

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.withBinds('attachment.lite', () => {
      return Attachment
    })
  }

  /**
   * This method is called when all providers are registered
   * and the application is ready to boot.
   */
  async boot() {
    try {
      // Simple approach: Just try to get drive from the container
      Attachment.setDrive(drive)
      console.log('Attachment-lite: Drive instance has been set successfully')
    } catch (error) {
      console.error('Failed to set Drive for Attachment-lite.', error)
    }
  }
} 