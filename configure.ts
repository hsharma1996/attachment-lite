/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineConfig } from './index.js'

/**
 * Configuration options for attachment-lite
 */
export default defineConfig({
  /**
   * Default disk to use for storing attachments
   */
  disk: 'local',
  
  /**
   * Default folder to store attachments
   */
  defaultFolder: 'uploads',
  
  /**
   * Whether to validate uploaded file MIME types
   */
  validateMimeTypes: true,
}) 