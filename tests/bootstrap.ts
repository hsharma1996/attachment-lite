/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Attachment } from '../src/attachment.js'

// Custom disk for testing
class MockDisk {
  private files: Map<string, Buffer> = new Map()

  async putStream(path: string, stream: any): Promise<void> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    this.files.set(path, buffer)
  }

  async delete(path: string): Promise<void> {
    this.files.delete(path)
  }

  async getUrl(path: string): Promise<string> {
    return `https://example.com/${path}`
  }

  async getSignedUrl(path: string, _options?: any): Promise<string> {
    return `https://example.com/${path}?signed=true`
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }
}

// Create a mock DriveManager
class MockDriveManager {
  private disk = new MockDisk()

  use(_diskName?: string) {
    return this.disk
  }
}

// Set up drive for tests
export function setupDrive() {
  // Set up the drive on the attachment class
  const mockDrive = new MockDriveManager()
  Attachment.setDrive(mockDrive as any)
}