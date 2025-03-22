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
import mockDrive from "./utils/mock_drive.js";
import { join } from "node:path";
import fs from "node:fs/promises";
import type { TestContext } from "./types.js";

test.group("Attachment", (group) => {
  let testFilePath: string;
  let testBuffer: Buffer;
  let originalSetDrive: typeof Attachment.setDrive;

  // Set up the drive for testing
  group.setup(() => {
    originalSetDrive = Attachment.setDrive;
    Attachment.setDrive(mockDrive as any);
  });

  group.teardown(() => {
    // Restore original drive
    Attachment.setDrive = originalSetDrive;
    // Clean up any fake disks
    mockDrive.restore("local");
  });

  group.each.setup(async () => {
    // Create a test file
    testFilePath = join(process.cwd(), "test-file.txt");
    testBuffer = Buffer.from("Test content");
    await fs.writeFile(testFilePath, testBuffer);

    return () => fs.unlink(testFilePath).catch(() => {});
  });

  test("can create an attachment from a file path", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
    assert.isTrue(file.isLocal);
  });

  test("can create an attachment from a buffer", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromBuffer(testBuffer, {
      filename: "test-buffer.txt",
      mimeType: "text/plain",
    });

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
    assert.equal(file.mimeType, "text/plain");
    assert.isTrue(file.isLocal);

    // Test storing from buffer
    await file.store();
    assert.isFalse(file.isLocal);
  });

  test("can set options on an attachment", async ({ assert }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    file.setOptions({ folder: "uploads", disk: "local" });

    assert.equal(file.folder, "uploads");
    assert.equal(file.disk, "local");
  });

  test("can store and get url for an attachment", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    await file.store();

    const url = await file.getUrl();
    assert.isString(url);
  });

  test("can compute url for an attachment", async ({ assert }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    await file.store();

    assert.isNull(file.url); // URL not computed yet

    const computedUrl = await file.computeUrl();
    assert.isString(computedUrl);
    assert.equal(file.url, computedUrl); // URL should now be stored on the instance
  });

  test("can get signed url for an attachment", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    await file.store();

    const signedUrl = await file.getSignedUrl({ expiresIn: "1h" });
    assert.isString(signedUrl);
    assert.include(signedUrl, "signed=true"); // Mock disk adds ?signed=true
  });

  test("can be created from JSON", async ({ assert }: TestContext) => {
    const data = {
      fileName: "test-file.txt",
      size: 12,
      extname: "txt",
      mimeType: "text/plain",
    };

    const file = Attachment.fromJSON(data);
    assert.instanceOf(file, Attachment);
    assert.equal(file?.fileName, "test-file.txt");
  });

  test("returns null when creating from null JSON", async ({
    assert,
  }: TestContext) => {
    const file = Attachment.fromJSON(null);
    assert.isNull(file);
  });

  test("sets file path based on folder", async ({ assert }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    file.setOptions({ folder: "custom-folder" });

    assert.include(file.filePath, "custom-folder/");
  });

  test("can properly serialize attachment to JSON", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    await file.store();

    const json = file.toJSON();
    assert.isObject(json);
    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(json.fileName.endsWith(".txt"));
    assert.equal(json.size, 12);
  });

  test("can create an attachment from a multipart file", async ({
    assert,
  }: TestContext) => {
    // Mock a multipart file object similar to what AdonisJS would provide
    const mockMultipartFile = {
      clientName: "test-upload.txt",
      fileName: "test-upload.txt",
      filePath: testFilePath,
      tmpPath: testFilePath,
      size: testBuffer.length,
      extname: "txt",
      type: "text/plain",
      subtype: "plain",
      validate() {
        return { isValid: true, errors: [] };
      },
      move() {
        return { fileName: "test-upload.txt" };
      },
    };

    const file = new Attachment();
    await file.fromFile(mockMultipartFile as any);

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
    assert.equal(file.mimeType, "text/plain");
    assert.isTrue(file.isLocal);
  });

  test("can validate MIME type of an attachment", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);

    // No MIME type restrictions
    assert.isTrue(file.validateMimeType());
    assert.isTrue(file.validateMimeType({}));
    assert.isTrue(file.validateMimeType({ allowedMimes: [] }));

    // MIME type is allowed
    assert.isTrue(file.validateMimeType({ allowedMimes: ["text/plain"] }));

    // MIME type is not allowed
    assert.isFalse(file.validateMimeType({ allowedMimes: ["image/jpeg"] }));
  });

  test("static fromFile creates an attachment from multipart file", async ({
    assert,
  }: TestContext) => {
    // Mock a multipart file object similar to what AdonisJS would provide
    const mockMultipartFile = {
      clientName: "test-upload.txt",
      fileName: "test-upload.txt",
      filePath: testFilePath,
      tmpPath: testFilePath,
      size: testBuffer.length,
      extname: "txt",
      type: "text/plain",
    };

    const file = await Attachment.fromFile(mockMultipartFile as any);

    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
  });

  test("static fromPath creates an attachment from file path", async ({
    assert,
  }: TestContext) => {
    const file = await Attachment.fromPath(testFilePath);

    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
  });

  test("static fromBuffer creates an attachment from buffer", async ({
    assert,
  }: TestContext) => {
    const file = await Attachment.fromBuffer(testBuffer, {
      filename: "test.txt",
    });

    assert.isTrue(file.fileName?.endsWith(".txt"));
    assert.equal(file.size, 12); // 'Test content' length
  });

  test("can convert attachment to object for database storage", async ({
    assert,
  }: TestContext) => {
    const file = new Attachment();
    await file.fromPath(testFilePath);
    file.setOptions({ disk: "local", folder: "uploads" });

    const obj = file.toObject();
    assert.isObject(obj);
    assert.isTrue(obj.fileName.endsWith(".txt"));
    assert.equal(obj.size, 12);
    assert.equal(obj.extname, "txt");
    assert.equal(obj.disk, "local");
    assert.equal(obj.folder, "uploads");
  });

  test("static fromDbResponse safely handles database response", async ({
    assert,
  }: TestContext) => {
    // Valid data
    const validData = {
      fileName: "test.txt",
      size: 12,
      extname: "txt",
      mimeType: "text/plain",
      disk: "local",
      folder: "uploads",
    };

    const validAttachment = Attachment.fromDbResponse(validData);
    assert.isNotNull(validAttachment);
    assert.equal(validAttachment?.fileName, "test.txt");
    assert.equal(validAttachment?.size, 12);

    // Invalid data should return null
    const invalidData = { foo: "bar" };
    const nullAttachment = Attachment.fromDbResponse(invalidData as any);
    assert.isNull(nullAttachment);

    // Null data should return null
    assert.isNull(Attachment.fromDbResponse(null));
  });
});
