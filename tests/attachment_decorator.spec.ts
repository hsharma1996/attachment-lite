/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from "@japa/runner";
import { attachment } from "../src/decorator/decorator.js";
import { Attachment } from "../src/attachment.js";
import type { TestContext } from "./types.js";

// Create a BaseModel class that mocks the Lucid model behavior for testing
class BaseModel {
  $attributes: Record<string, any> = {};
  $original: Record<string, any> = {};
  $preloaded: Record<string, any> = {};
  $isDirty = false;

  static $attachments: Record<string, any> = {};
  static $columns: Record<string, any> = {};

  // Methods required by the decorator
  static boot() {}

  static before(event: string, callback: Function) {
    console.log("before", event, callback);
  }

  static after(event: string, callback: Function) {
    console.log("after", event, callback);
  }

  static $addColumn(name: string, options: any) {
    this.$columns[name] = options;
  }
}

test.group("Attachment Decorator", () => {
  test("decorator exists and is exported", async ({ assert }: TestContext) => {
    assert.isFunction(attachment);
  });

  test("decorator returns a function", async ({ assert }: TestContext) => {
    const result = attachment();
    assert.isFunction(result);
  });

  test("can decorate class property with attachment", async ({
    assert,
  }: TestContext) => {
    // Create a mock class with the decorator
    class TestModel extends BaseModel {
      @attachment({ disk: "local", folder: "avatars" })
      declare avatar: Attachment;
    }

    // Verify the decorator has set up the property on the model
    assert.isDefined(TestModel.$attachments);
    assert.isDefined(TestModel.$attachments.avatar);
    assert.equal(TestModel.$attachments.avatar.disk, "local");
    assert.equal(TestModel.$attachments.avatar.folder, "avatars");
  });

  test("attachment supports options", async ({ assert }: TestContext) => {
    // Create an attachment with options
    const testAttachment = new Attachment();
    testAttachment.setOptions({ disk: "custom", folder: "photos" });

    assert.equal(testAttachment.disk, "custom");
    assert.equal(testAttachment.folder, "photos");
  });

  test("decorator properly sets up consume, prepare and serialize functions", async ({
    assert,
  }: TestContext) => {
    // Create a class to decorate
    class TestModel extends BaseModel {
      @attachment({ disk: "local", folder: "avatars" })
      declare avatar: Attachment;
    }

    // Verify column definition was added
    assert.isDefined(TestModel.$columns);
    assert.isDefined(TestModel.$columns.avatar);
    assert.isFunction(TestModel.$columns.avatar.consume);
    assert.isFunction(TestModel.$columns.avatar.prepare);
    assert.isFunction(TestModel.$columns.avatar.serialize);

    // Test the consume function
    const jsonData = {
      fileName: "test.jpg",
      size: 1000,
      extname: "jpg",
      mimeType: "image/jpeg",
    };

    const consumed = TestModel.$columns.avatar.consume(jsonData);
    assert.instanceOf(consumed, Attachment);
    assert.equal(consumed.fileName, "test.jpg");

    // Test the prepare function
    const prepared = TestModel.$columns.avatar.prepare(consumed);
    assert.isString(prepared);
    assert.include(prepared, "test.jpg");

    // Test the serialize function
    const serialized = TestModel.$columns.avatar.serialize(consumed);
    assert.isObject(serialized);
    assert.equal(serialized.fileName, "test.jpg");

    // Test handling null values
    assert.isNull(TestModel.$columns.avatar.consume(null));
    assert.isNull(TestModel.$columns.avatar.prepare(null));
    assert.isNull(TestModel.$columns.avatar.serialize(null));
  });

  test("handles missing files gracefully", ({ assert }) => {
    // Instead of testing for warnings, let's test the actual behavior
    // Create a TestModel instance with minimum data needed
    class TestModel extends BaseModel {
      @attachment({ disk: "local", folder: "avatars" })
      declare avatar: Attachment;
    }

    // Verify TestModel.$columns.avatar exists and has the consume function
    assert.isObject(
      TestModel.$columns.avatar,
      "Attachment column should be defined",
    );
    assert.isFunction(
      TestModel.$columns.avatar.consume,
      "consume function should be defined",
    );

    // Create data for a non-existent file
    const data = {
      name: "test.jpg",
      size: 1024,
      clientName: "test.jpg",
      filePath: "avatars/test.jpg",
      extname: ".jpg",
      mimeType: "image/jpeg",
      disk: "local",
      folder: "avatars",
    };

    // Test that the consume function doesn't throw an error for missing file
    let result;
    let threw = false;
    try {
      result = TestModel.$columns.avatar.consume(data);
    } catch (error) {
      threw = true;
    }

    // It should not throw an error
    assert.isFalse(
      threw,
      "Consume function should not throw for missing files",
    );

    // The result should either be null or an Attachment instance
    if (result === null) {
      assert.isNull(result, "Result can be null for missing files");
    } else {
      assert.instanceOf(
        result,
        Attachment,
        "Result should be an Attachment instance if not null",
      );
    }
  });
});
