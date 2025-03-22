/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// Import Lucid types directly instead of defining them ourselves
import { MultipartFile } from "@adonisjs/core/bodyparser";
import type { LucidModel, LucidRow } from "@adonisjs/lucid/types/model";

/**
 * Extend the LucidModel interface to add attachment support
 */
declare module "@adonisjs/lucid/types/model" {
  interface LucidModel {
    /**
     * A collection of attachment configurations for a given model
     */
    $attachments?: Record<string, AttachmentOptions>;
  }

  interface LucidRow {
    /**
     * Data for tracking attachment operations
     */
    attachmentData?: {
      attached: string[];
      detached: string[];
    };
  }
}

/**
 * Options for configuring an attachment
 */
export interface AttachmentOptions {
  /**
   * The disk to use for storing attachments
   */
  disk?: string;

  /**
   * The folder to store the attachment in
   */
  folder?: string;

  /**
   * Whether to compute the URL for the attachment
   */
  computeUrl?: boolean;

  /**
   * Whether to validate the MIME type of the uploaded file
   */
  validateMime?: boolean;

  /**
   * List of allowed MIME types
   */
  allowedMimes?: string[];
}

/**
 * Configuration options for the attachment-lite package
 */
export interface AttachmentLiteConfig {
  /**
   * Default disk to use for storing attachments
   */
  disk: string;

  /**
   * Default folder to store attachments
   */
  defaultFolder: string;

  /**
   * Whether to validate uploaded file MIME types
   */
  validateMimeTypes: boolean;
}

/**
 * Contract for the Attachment class
 */
export interface AttachmentContract {
  /**
   * The disk the attachment is stored on
   */
  disk: string | null;

  /**
   * The folder the attachment is stored in
   */
  folder: string | null;

  /**
   * The file name of the attachment
   */
  fileName: string | null;

  /**
   * The path to the attachment (folder + fileName)
   */
  filePath: string | null;

  /**
   * The size of the attachment
   */
  size: number | null;

  /**
   * The extension of the attachment
   */
  extname: string | null;

  /**
   * The MIME type of the attachment
   */
  mimeType: string | null;

  /**
   * Whether the attachment is a local file
   */
  isLocal: boolean;

  /**
   * The URL of the attachment
   */
  url: string | null;

  /**
   * Create an attachment from a multipart file
   */
  fromFile(file: MultipartFile, options?: AttachmentOptions): Promise<this>;

  /**
   * Create an attachment from a file path
   */
  fromPath(filePath: string, options?: AttachmentOptions): Promise<this>;

  /**
   * Create an attachment from a buffer
   */
  fromBuffer(
    buffer: Buffer,
    options: AttachmentOptions & { filename: string; mimeType?: string },
  ): Promise<this>;

  /**
   * Set options for the attachment
   */
  setOptions(options?: AttachmentOptions): this;

  /**
   * Store the file to the configured drive
   */
  store(): Promise<void>;

  /**
   * Destroy the attachment by removing it from the drive
   */
  destroy(): Promise<void>;

  /**
   * Compute the URL for the attachment
   */
  computeUrl(): Promise<string | null>;

  /**
   * Get the URL for the attachment
   */
  getUrl(): Promise<string | null>;

  /**
   * Get signed URL for the file
   */
  getSignedUrl(options?: Record<string, any>): Promise<string>;

  /**
   * Validates if the MIME type is allowed based on the options
   */
  validateMimeType(options?: { allowedMimes?: string[] }): boolean;

  /**
   * Convert the attachment to JSON
   */
  toJSON(): Record<string, any>;

  /**
   * Convert the attachment to a plain object for database storage
   */
  toObject(): Record<string, any>;
}

// Re-export Lucid types for convenience
export { LucidModel, LucidRow };
