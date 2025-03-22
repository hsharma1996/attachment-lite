/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@adonisjs/core/exceptions'
// Remove the direct import to avoid type conflicts
// import type { MultipartFile as CoreMultipartFile } from '@adonisjs/core/bodyparser'
import type { AttachmentOptions, AttachmentContract } from './types.js'
import { createReadStream } from 'node:fs'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { Disk, DriveManager } from 'flydrive'
import type { DriverContract } from '@adonisjs/drive/types'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Type definition for multipart files with only the properties we actually use
 * This avoids type conflicts between different versions of @adonisjs/bodyparser
 */
export interface MultipartFileAdapter {
  tmpPath?: string | null
  size: number
  extname?: string | null
  type?: string | null
  clientName?: string
  fileName?: string
  
  // We don't use these properties but they might be accessed by user code
  filePath?: string
  fieldName?: string
  headers?: any
  validated?: boolean
  isValid?: boolean
  
  // Any other properties are allowed but not required
  [key: string]: any
}

/**
 * Attachment class represents an attachment data type for Lucid models
 */
export class Attachment implements AttachmentContract {
  /**
   * Static reference to the drive instance
   */
  private static drive: DriveManager<Record<string, () => DriverContract>>

  /**
   * Is attachment a local file that hasn't been persisted yet
   */
  public isLocal: boolean = true

  /**
   * The disk the attachment is stored on
   */
  public disk: string | null = null

  /**
   * The folder the attachment is stored in
   */
  public folder: string | null = null

  /**
   * The file name of the attachment
   */
  public fileName: string | null = null

  /**
   * The path to the attachment (folder + fileName)
   */
  public filePath: string | null = null

  /**
   * The size of the attachment
   */
  public size: number | null = null

  /**
   * The extension of the attachment
   */
  public extname: string | null = null

  /**
   * The MIME type of the attachment
   */
  public mimeType: string | null = null

  /**
   * The URL of the attachment
   */
  public url: string | null = null

  /**
   * The temporary file path if this is a local file
   */
  private tmpPath: string | null = null

  constructor() { }

  /**
   * Set the static drive instance
   */
  public static setDrive(drive: DriveManager<Record<string, () => DriverContract>>) {
    this.drive = drive
  }

  /**
   * Get the static drive instance
   */
  public static getDrive(): DriveManager<Record<string, () => DriverContract>> {
    if (!this.drive) {
      throw new Exception('Drive not set for Attachment. Use Attachment.setDrive()')
    }
    return this.drive
  }

  /**
   * Create an attachment from a multipart file (static method)
   * This method returns a Promise<Attachment> and should be awaited
   */
  public static async fromFile(file: MultipartFileAdapter, options?: AttachmentOptions): Promise<Attachment> {
    const attachment = new Attachment();
    await attachment.fromFile(file, options);
    return attachment;
  }

  /**
   * Create an attachment from a file path (static method)
   */
  public static async fromPath(filePath: string, options?: AttachmentOptions): Promise<Attachment> {
    const attachment = new Attachment();
    await attachment.fromPath(filePath, options);
    return attachment;
  }

  /**
   * Create an attachment from a buffer (static method)
   */
  public static async fromBuffer(
    buffer: Buffer, 
    options: AttachmentOptions & { 
      filename: string, 
      mimeType?: string 
    }
  ): Promise<Attachment> {
    const attachment = new Attachment();
    await attachment.fromBuffer(buffer, options);
    return attachment;
  }

  /**
   * Create an attachment from a multipart file
   */
  public async fromFile(file: MultipartFileAdapter, options?: AttachmentOptions): Promise<this> {
    this.isLocal = true
    this.fileName = `${randomUUID()}.${file.extname}`
    this.tmpPath = file.tmpPath ?? null
    this.size = file.size
    this.extname = file.extname ?? null
    this.mimeType = file.type ?? null

    if (options) {
      this.setOptions(options)
    }

    if (this.folder) {
      this.filePath = `${this.folder}/${this.fileName}`
    } else {
      this.filePath = this.fileName
    }

    return this
  }

  /**
   * Create an attachment from a file path
   */
  public async fromPath(filePath: string, options?: AttachmentOptions): Promise<this> {
    this.isLocal = true
    this.tmpPath = filePath

    const fileStats = await stat(filePath)
    this.size = fileStats.size
    this.extname = path.extname(filePath).substring(1)
    this.fileName = `${randomUUID()}.${this.extname}`

    // Try to infer mime type based on extension
    this.mimeType = this.getMimeTypeFromExtension(this.extname)

    if (options) {
      this.setOptions(options)
    }

    if (this.folder) {
      this.filePath = `${this.folder}/${this.fileName}`
    } else {
      this.filePath = this.fileName
    }

    return this
  }

  /**
   * Create an attachment from JSON data
   */
  public static fromJSON(
    data: null | string | {
      fileName: string,
      size: number,
      extname: string,
      mimeType: string,
      disk?: string,
      folder?: string
    }
  ): Attachment | null {
    if (!data) {
      return null
    }

    const json = typeof data === 'string' ? JSON.parse(data) : data
    const attachment = new Attachment()

    attachment.isLocal = false
    attachment.fileName = json.fileName
    attachment.size = json.size
    attachment.extname = json.extname
    attachment.mimeType = json.mimeType

    if (json.disk) {
      attachment.disk = json.disk
    }

    if (json.folder) {
      attachment.folder = json.folder
      attachment.filePath = `${json.folder}/${json.fileName}`
    } else {
      attachment.filePath = json.fileName
    }

    return attachment
  }

  /**
   * Set options for the attachment
   */
  public setOptions(options?: AttachmentOptions): this {
    if (!options) return this

    if (options.disk) {
      this.disk = options.disk
    }

    if (options.folder) {
      this.folder = options.folder
      if (this.fileName) {
        this.filePath = `${options.folder}/${this.fileName}`
      }
    }

    return this
  }

  /**
   * Get the drive instance to use
   */
  private getDrive(): Disk {
    const drive = Attachment.getDrive()
    return this.disk ? drive.use(this.disk) : drive.use()
  }

  /**
   * Store the file to the configured drive
   */
  public async store(): Promise<void> {
    if (!this.isLocal) {
      throw new Exception('Cannot store an already stored attachment')
    }

    if (!this.tmpPath || !this.filePath) {
      throw new Exception('Cannot store attachment without file path')
    }

    const drive = this.getDrive()
    await drive.putStream(this.filePath, createReadStream(this.tmpPath))
    this.isLocal = false
  }

  /**
   * Destroy the attachment by removing it from the drive
   */
  public async destroy(): Promise<void> {
    if (this.isLocal || !this.filePath) {
      return
    }

    const drive = this.getDrive()
    await drive.delete(this.filePath)
  }

  /**
   * Compute URL for the attachment
   */
  public async computeUrl(): Promise<string | null> {
    if (this.isLocal || !this.filePath) {
      return null
    }

    const drive = this.getDrive()
    this.url = await drive.getUrl(this.filePath)
    return this.url
  }

  /**
   * Get URL for the attachment
   */
  public async getUrl(): Promise<string | null> {
    if (this.isLocal || !this.filePath) {
      return null
    }

    const drive = this.getDrive()
    return drive.getUrl(this.filePath)
  }

  /**
   * Get signed URL for the file
   */
  public async getSignedUrl(options?: Record<string, any>): Promise<string> {
    if (this.isLocal || !this.filePath) {
      throw new Exception('Cannot get signed URL for a local attachment')
    }

    const drive = this.getDrive()
    return drive.getSignedUrl(this.filePath, options)
  }

  /**
   * Try to infer mime type from file extension
   */
  private getMimeTypeFromExtension(extname: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'zip': 'application/zip',
      'txt': 'text/plain',
      'html': 'text/html',
      'csv': 'text/csv',
      'json': 'application/json',
    }

    return mimeTypes[extname.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * Validates if the MIME type is allowed based on the options
   */
  public validateMimeType(options: { allowedMimes?: string[] } = {}): boolean {
    if (!this.mimeType) {
      return false
    }

    if (!options.allowedMimes || options.allowedMimes.length === 0) {
      return true
    }

    return options.allowedMimes.includes(this.mimeType)
  }

  /**
   * Convert the attachment to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      fileName: this.fileName,
      filePath: this.filePath,
      size: this.size,
      extname: this.extname,
      mimeType: this.mimeType,
      url: this.url,
    }
  }

  /**
   * Create an attachment from a buffer
   */
  public async fromBuffer(
    buffer: Buffer, 
    options: AttachmentOptions & { 
      filename: string, 
      mimeType?: string 
    }
  ): Promise<this> {
    this.isLocal = true
    
    const extname = path.extname(options.filename).substring(1)
    this.fileName = `${randomUUID()}.${extname}`
    this.size = buffer.length
    this.extname = extname
    this.mimeType = options.mimeType || this.getMimeTypeFromExtension(extname)

    // Create a temporary file
    const tempPath = join(tmpdir(), this.fileName)
    await writeFile(tempPath, buffer)
    this.tmpPath = tempPath

    if (options) {
      this.setOptions(options)
    }

    if (this.folder) {
      this.filePath = `${this.folder}/${this.fileName}`
    } else {
      this.filePath = this.fileName
    }

    return this
  }
} 