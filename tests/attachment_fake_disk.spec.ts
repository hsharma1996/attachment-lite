/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from "@japa/runner";
import { Attachment } from "../src/attachment.js";
import { attachment } from "../src/decorator/decorator.js";
import mockDrive from "./utils/mock_drive.js";
import { join } from "node:path";
import fs from "node:fs/promises";
import type {
  TestContext,
  ModelConstructor,
  CleanupFunction,
} from "./types.js";

// We'll use our mock drive directly

/**
 * Mock BaseModel class for testing
 */
class BaseModel {
  // Use Record to allow any string properties
  $attributes: Record<string, any> = {};
  attachmentFields: Record<string, any> = {};

  static $attachments: Record<string, any> = {};
  static $columns: Record<string, any> = {};

  static boot() {}

  static $addColumn(property: string, columnConfig: any) {
    if (!this.$columns) {
      this.$columns = {};
    }
    this.$columns[property] = columnConfig;
  }

  static before(hookName: string, callback: Function) {
    console.log("before", hookName, callback);
  }

  static after(hookName: string, callback: Function) {
    console.log("after", hookName, callback);
  }

  // Add getter and setter for dynamic properties
  get(property: string): any {
    return this.attachmentFields[property];
  }

  set(property: string, value: any): void {
    this.attachmentFields[property] = value;
  }

  async save() {
    // Simulate a save operation
    const ModelConstructor = this.constructor as typeof BaseModel &
      ModelConstructor;

    // Call the "before create" hooks
    for (const property in ModelConstructor.$attachments) {
      const file = this.attachmentFields[property] as Attachment | null;
      if (file && file.isLocal) {
        const options = ModelConstructor.$attachments[property];

        // Apply validation if enabled
        if (
          options.validateMime &&
          options.allowedMimes &&
          options.allowedMimes.length > 0
        ) {
          if (!file.validateMimeType({ allowedMimes: options.allowedMimes })) {
            throw new Error(
              `Invalid MIME type for attachment "${property}". ` +
                `Expected one of: ${options.allowedMimes.join(", ")}, but got: ${file.mimeType}`,
            );
          }
        }

        // Set options and store the file
        file.setOptions(options);
        await file.store();

        // Compute URL if required
        if (options.computeUrl) {
          await file.computeUrl().catch(() => {});
        }
      }
    }
  }

  async delete() {
    // Simulate a delete operation
    const ModelConstructor = this.constructor as typeof BaseModel &
      ModelConstructor;

    // Call the "after delete" hooks
    for (const property in ModelConstructor.$attachments) {
      const file = this.attachmentFields[property] as Attachment | null;
      if (file && !file.isLocal) {
        await file.destroy().catch(() => {});
      }
    }
  }

  toJSON() {
    return this.$attributes;
  }
}

test.group("Attachment With Fake Disk", (group) => {
  let testFilePath: string;
  let testImagePath: string;
  let originalSetDrive: typeof Attachment.setDrive;

  group.setup(() => {
    // Set up mock drive for testing
    originalSetDrive = Attachment.setDrive;
    Attachment.setDrive(mockDrive as any);
  });

  group.teardown(() => {
    // Restore original drive
    Attachment.setDrive = originalSetDrive;
  });

  group.each.setup(async () => {
    // Create test files
    testFilePath = join(process.cwd(), "test-file.txt");
    testImagePath = join(process.cwd(), "test-image.jpg");

    await fs.writeFile(testFilePath, "Test content");
    await fs.writeFile(testImagePath, "Fake image content");

    return async () => {
      await Promise.all([
        fs.unlink(testFilePath).catch(() => {}),
        fs.unlink(testImagePath).catch(() => {}),
        // Clear fake disks
        mockDrive.restore("local"),
      ]);
    };
  });

  test("should store attachment with fake disk", async ({
    assert,
    cleanup,
  }: TestContext & { cleanup: CleanupFunction }) => {
    // Fake the "local" disk and restore after test
    const fakeDisk = mockDrive.fake("local");
    cleanup(() => mockDrive.restore("local"));

    // Define model with attachment
    class UserModel extends BaseModel {
      @attachment({
        disk: "local",
        folder: "avatars",
        computeUrl: true,
      })
      declare avatar: Attachment;
    }

    // Create model instance
    const user = new UserModel();

    // Create and attach file
    const file = new Attachment();
    await file.fromPath(testFilePath);
    user.attachmentFields.avatar = file;

    // Save the model (which triggers the attachment processing)
    await user.save();

    // Assert the file no longer shows as local
    assert.isFalse(file.isLocal);

    // Assert URL was computed
    assert.isNotNull(file.url);

    // Assert file exists in the fake disk
    assert.isTrue(await fakeDisk.exists(file.filePath!));
  });

  test("should validate mime types with fake disk", async ({
    assert,
    cleanup,
  }: TestContext & { cleanup: CleanupFunction }) => {
    // Fake the "local" disk and restore after test
    const fakeDisk = mockDrive.fake("local");
    cleanup(() => mockDrive.restore("local"));

    // Define model with mime validation
    class UserModel extends BaseModel {
      @attachment({
        disk: "local",
        folder: "avatars",
        validateMime: true,
        allowedMimes: ["text/plain"],
      })
      declare avatar: Attachment;
    }

    // Create model with valid mime type
    const validUser = new UserModel();
    const validFile = new Attachment();
    await validFile.fromPath(testFilePath);
    validFile.mimeType = "text/plain";
    validUser.attachmentFields.avatar = validFile;

    // This should succeed
    await validUser.save();

    // Assert file exists in the fake disk
    assert.isTrue(await fakeDisk.exists(validFile.filePath!));

    // Create model with invalid mime type
    const invalidUser = new UserModel();
    const invalidFile = new Attachment();
    await invalidFile.fromPath(testImagePath);
    invalidFile.mimeType = "image/jpeg";
    invalidUser.attachmentFields.avatar = invalidFile;

    // This should fail with mime type validation error
    try {
      await invalidUser.save();
      assert.fail("Should have thrown error for invalid MIME type");
    } catch (error: any) {
      assert.include(error.message, "Invalid MIME type");
      assert.include(error.message, "Expected one of: text/plain");
    }

    // The invalid file should not exist in the disk
    assert.isFalse(await fakeDisk.exists("avatars/" + invalidFile.fileName));
  });

  test("should cleanup attachments on delete with fake disk", async ({
    assert,
    cleanup,
  }: TestContext & { cleanup: CleanupFunction }) => {
    // Fake the "local" disk and restore after test
    const fakeDisk = mockDrive.fake("local");
    cleanup(() => mockDrive.restore("local"));

    // Define model with attachment
    class UserModel extends BaseModel {
      @attachment({
        disk: "local",
        folder: "uploads",
      })
      declare document: Attachment;
    }

    // Create model instance
    const user = new UserModel();

    // Create and attach file
    const file = new Attachment();
    await file.fromPath(testFilePath);
    user.attachmentFields.document = file;

    // Save the model (which triggers the attachment processing)
    await user.save();

    // Assert file exists in the fake disk
    assert.isTrue(await fakeDisk.exists(file.filePath!));

    // Delete the model
    await user.delete();

    // Assert file was removed from the fake disk
    assert.isFalse(await fakeDisk.exists(file.filePath!));
  });

  test("should apply options correctly with fake disk", async ({
    assert,
    cleanup,
  }: TestContext & { cleanup: CleanupFunction }) => {
    // Fake the "local" disk and restore after test
    const fakeDisk = mockDrive.fake("local");
    cleanup(() => mockDrive.restore("local"));

    // Define model with specific options
    class UserModel extends BaseModel {
      @attachment({
        disk: "local",
        folder: "custom-folder",
        computeUrl: true,
      })
      declare avatar: Attachment;
    }

    // Create model instance
    const user = new UserModel();

    // Create and attach file
    const file = new Attachment();
    await file.fromPath(testFilePath);
    user.attachmentFields.avatar = file;

    // Save the model
    await user.save();

    // Assert options were applied correctly
    assert.equal(file.disk, "local");
    assert.equal(file.folder, "custom-folder");
    assert.isTrue(file.filePath!.startsWith("custom-folder/"));
    assert.isNotNull(file.url);

    // Assert file exists in the expected location
    assert.isTrue(await fakeDisk.exists(file.filePath!));
  });
});
