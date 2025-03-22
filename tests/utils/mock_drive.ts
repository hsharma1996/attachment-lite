/**
 * Mock implementation of the Drive module for testing
 */

import driveConfig from "../../config/drive.js";
import { Readable } from "node:stream";

// Storage for fake disk files
const storage = new Map<string, Map<string, Buffer>>();

// Define the disk config type
interface DiskConfig {
  driver: string;
  root: string;
  basePath: string;
  serveFiles: boolean;
}

/**
 * Implementation of a mock Drive for testing
 */
export class MockDrive {
  // Private properties
  private diskName: string = "local";

  /**
   * Use a specific disk (or default)
   * This is used by the Attachment class
   */
  use(diskName: string = "local") {
    return new MockDiskImplementation(diskName);
  }

  /**
   * Fake a disk for testing
   */
  fake(name: string): MockDiskImplementation {
    this.diskName = name;

    // Initialize storage for this disk if not exists
    if (!storage.has(name)) {
      storage.set(name, new Map());
    }

    return new MockDiskImplementation(name);
  }

  /**
   * Restore/clear a disk to clean state
   */
  restore(name: string): void {
    if (storage.has(name)) {
      storage.delete(name);
    }
  }

  // Fix the ensureDir function
  async ensureDir(_path: string): Promise<void> {
    // This is a no-op in our mock
    return;
  }

  /**
   * Get a file instance for the given path
   */
  file(path: string): any {
    return {
      exists: () => this.exists(path),
      getUrl: () => this.getUrl(path),
      getSignedUrl: (options: any) => this.getSignedUrl(path, options),
      putStream: (stream: Readable) => this.putStream(path, stream),
      delete: () => this.delete(path),
    };
  }

  /**
   * Create a file from a snapshot (for restoring from DB)
   */
  fromSnapshot(snapshot: any): any {
    return {
      exists: () => this.exists(snapshot.path),
      getUrl: () => this.getUrl(snapshot.path),
      getSignedUrl: (options: any) => this.getSignedUrl(snapshot.path, options),
      putStream: (stream: Readable) => this.putStream(snapshot.path, stream),
      delete: () => this.delete(snapshot.path),
    };
  }

  /**
   * Check if a file exists
   */
  async exists(path: string): Promise<boolean> {
    const files = storage.get(this.diskName);
    if (!files) {
      return false;
    }
    return files.has(path);
  }

  /**
   * Put file contents at a given location
   */
  async put(path: string, contents: Buffer): Promise<void> {
    const files = storage.get(this.diskName);
    if (!files) {
      return;
    }
    files.set(path, contents);
  }

  /**
   * Put a stream at a given location
   */
  async putStream(path: string, stream: Readable): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    await this.put(path, buffer);
  }

  /**
   * Delete a file
   */
  async delete(path: string): Promise<void> {
    const files = storage.get(this.diskName);
    if (!files) {
      return;
    }
    files.delete(path);
  }

  /**
   * Get URL for a file
   */
  async getUrl(path: string): Promise<string> {
    const disks = driveConfig.disks as Record<string, DiskConfig>;
    const disk = disks[this.diskName];
    return `${disk.basePath}/${path}`;
  }

  /**
   * Get a signed URL for a file
   * Fix the unused options parameter
   */
  async getSignedUrl(path: string, _options: any = {}): Promise<string> {
    const url = await this.getUrl(path);
    return `${url}?signed=true`;
  }
}

/**
 * Mock implementation of a Disk for testing
 * We're not implementing the full interface to avoid type conflicts
 */
export class MockDiskImplementation {
  private diskName: string;
  private files: Map<string, Buffer>;

  constructor(diskName: string) {
    this.diskName = diskName;

    // Initialize storage for this disk if not exists
    if (!storage.has(diskName)) {
      storage.set(diskName, new Map());
    }

    this.files = storage.get(diskName)!;
  }

  /**
   * Put a file at the given location
   */
  async put(path: string, contents: Buffer): Promise<void> {
    this.files.set(path, contents);
  }

  /**
   * Put a stream at the given location
   */
  async putStream(path: string, stream: Readable): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    this.files.set(path, buffer);
  }

  /**
   * Delete a file at the given location
   */
  async delete(path: string): Promise<void> {
    this.files.delete(path);
  }

  /**
   * Check if a file exists at the given location
   */
  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  /**
   * Get URL for a file
   */
  async getUrl(path: string): Promise<string> {
    const disks = driveConfig.disks as Record<string, DiskConfig>;
    const disk = disks[this.diskName];
    return `${disk.basePath}/${path}`;
  }

  /**
   * Get a signed URL for a file
   * Fix the unused options parameter
   */
  async getSignedUrl(path: string, _options: any = {}): Promise<string> {
    const url = await this.getUrl(path);
    return `${url}?signed=true`;
  }
}

// Export a singleton instance
export default new MockDrive();
