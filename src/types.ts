/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// Remove the direct import to avoid type conflicts
// import type { MultipartFile as CoreMultipartFile } from '@adonisjs/core/bodyparser'

// Import the adapter interface from our attachment.ts file
import type { MultipartFileAdapter } from './attachment.js'

/**
 * Options for configuring an attachment
 */
export interface AttachmentOptions {
  /**
   * The disk to use for storing attachments
   */
  disk?: string

  /**
   * The folder to store the attachment in
   */
  folder?: string

  /**
   * Whether to compute the URL for the attachment
   */
  computeUrl?: boolean

  /**
   * Whether to validate the MIME type of the uploaded file
   */
  validateMime?: boolean

  /**
   * List of allowed MIME types
   */
  allowedMimes?: string[]
}

/**
 * Configuration options for the attachment-lite package
 */
export interface AttachmentLiteConfig {
  /**
   * Default disk to use for storing attachments
   */
  disk: string
  
  /**
   * Default folder to store attachments
   */
  defaultFolder: string
  
  /**
   * Whether to validate uploaded file MIME types
   */
  validateMimeTypes: boolean
}

/**
 * Contract for the Attachment class
 */
export interface AttachmentContract {
  /**
   * The disk the attachment is stored on
   */
  disk: string | null
  
  /**
   * The folder the attachment is stored in
   */
  folder: string | null
  
  /**
   * The file name of the attachment
   */
  fileName: string | null
  
  /**
   * The path to the attachment (folder + fileName)
   */
  filePath: string | null
  
  /**
   * The size of the attachment
   */
  size: number | null
  
  /**
   * The extension of the attachment
   */
  extname: string | null
  
  /**
   * The MIME type of the attachment
   */
  mimeType: string | null
  
  /**
   * Whether the attachment is a local file
   */
  isLocal: boolean
  
  /**
   * The URL of the attachment
   */
  url: string | null
  
  /**
   * Create an attachment from a multipart file
   */
  fromFile(file: MultipartFileAdapter, options?: AttachmentOptions): Promise<this>
  
  /**
   * Create an attachment from a file path
   */
  fromPath(filePath: string, options?: AttachmentOptions): Promise<this>
  
  /**
   * Create an attachment from a buffer
   */
  fromBuffer(buffer: Buffer, options: AttachmentOptions & { filename: string; mimeType?: string }): Promise<this>
  
  /**
   * Set options for the attachment
   */
  setOptions(options?: AttachmentOptions): this
  
  /**
   * Store the file to the configured drive
   */
  store(): Promise<void>
  
  /**
   * Destroy the attachment by removing it from the drive
   */
  destroy(): Promise<void>
  
  /**
   * Compute the URL for the attachment
   */
  computeUrl(): Promise<string | null>
  
  /**
   * Get the URL for the attachment
   */
  getUrl(): Promise<string | null>
  
  /**
   * Get signed URL for the file
   */
  getSignedUrl(options?: Record<string, any>): Promise<string>
  
  /**
   * Validates if the MIME type is allowed based on the options
   */
  validateMimeType(options?: { allowedMimes?: string[] }): boolean
  
  /**
   * Convert the attachment to JSON
   */
  toJSON(): Record<string, any>
} 