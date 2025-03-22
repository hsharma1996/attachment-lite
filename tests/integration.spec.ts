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
import { attachment } from "../src/decorator/decorator.js";
import type { TestContext } from "./types.js";

/**
 * Simple model class for testing
 */
class TestBaseModel {
  $attributes: Record<string, any> = {};
  $original: Record<string, any> = {};
  $isLocal = true;
  $isPersisted = false;
  $dirty: Set<string> = new Set();

  constructor() {
    // Empty constructor
  }

  async save() {
    // Save any pending attachments
    for (const key in this.$attributes) {
      const value = this.$attributes[key];
      if (value instanceof Attachment && value.isLocal) {
        await value.store();
      }
    }

    // Update original values
    this.$original = { ...this.$attributes };

    return this;
  }

  async delete() {
    // Remove any attachments
    for (const key in this.$attributes) {
      const value = this.$attributes[key];
      if (value instanceof Attachment) {
        await value.destroy();
      }
    }

    return true;
  }

  toJSON() {
    return { ...this.$attributes };
  }
}

/**
 * User model with attachment
 */
// @ts-ignore - Class is for demonstration purposes
class TestUser extends TestBaseModel {
  // Private property to store avatar attachment
  $avatar?: Attachment;

  constructor() {
    super();

    // Manually apply what the decorator would do
    Object.defineProperty(this, "avatar", {
      get: () => this.$avatar,
      set: (value) => {
        this.$avatar = value;
        this.$attributes.avatar = value;
      },
      enumerable: true,
      configurable: true,
    });
  }

  // Public property for TypeScript
  declare avatar: Attachment;
}

/**
 * Model with avatar attachment for testing
 */
// @ts-ignore - Class is for demonstration purposes
class TestModel extends TestBaseModel {
  // Property for the avatar attachment
  private _avatar: Attachment | null = null;

  get avatar(): Attachment | null {
    return this._avatar;
  }

  set avatar(value: Attachment | null) {
    this._avatar = value;
    this.$attributes.avatar = value;
  }
}

test.group("Integration", (group) => {
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

  test("model can save and delete an attachment", async ({
    assert,
  }: TestContext) => {
    /**
     * The base model with attachments
     */
    class TestBaseModel1 {
      // Define stub properties
      $attributes: Record<string, any> = {};
      $original: Record<string, any> = {};
      $isLocal = true;
      $isPersisted = false;
      $dirty: Set<string> = new Set();

      // Attachment decorator
      @attachment()
      declare avatar: Attachment | null;

      // Stub methods
      constructor() {
        this.$attributes = {};
        this.$original = {};
        this.$isLocal = true;
        this.$isPersisted = false;
        this.$dirty = new Set();
      }

      // These methods simulate the behavior of a Lucid model
      $consumeAdapterResult(adapterResult: any) {
        this.$attributes = { ...this.$attributes, ...adapterResult };
        this.$original = { ...this.$original, ...adapterResult };
        this.$isPersisted = true;
        this.$isLocal = false;
        this.$dirty.clear();
      }

      async save(instance: typeof TestBaseModel1) {
        // In a real model, this would call the database adapter
        const adapterResult = { id: 1 };

        // Set avatar property for saving
        if (this.avatar) {
          await this.avatar.store();
          this.$attributes.avatar = this.avatar.toJSON();
        }

        this.$consumeAdapterResult(adapterResult);

        // Call hooks
        await instance.afterFind(this);
      }

      async delete(instance: typeof TestBaseModel1) {
        // Call before delete hook
        await instance.beforeDelete(this);

        // Simulate deletion in the database
        this.$isPersisted = false;
      }

      // Model hooks
      static async afterFind(model: TestBaseModel1) {
        if (model.$attributes.avatar) {
          model.avatar = Attachment.fromJSON(model.$attributes.avatar);
        }
      }

      static async beforeDelete(model: TestBaseModel1) {
        if (model.avatar) {
          await model.avatar.destroy();
          model.avatar = null;
        }
      }
    }

    const userModel = new TestBaseModel1();
    const avatar = new Attachment();
    await avatar.fromPath(testFilePath);
    userModel.avatar = avatar;

    // Save the model and its attachment
    await userModel.save(TestBaseModel1);
    assert.isTrue(userModel.$isPersisted);
    assert.isDefined(userModel.avatar);
    assert.isFalse(userModel.avatar!.isLocal);

    // Delete the model (should also delete the attachment)
    await userModel.delete(TestBaseModel1);
    assert.isNull(userModel.avatar);
  });

  test("model can handle missing attachment files gracefully", async ({
    assert,
  }: TestContext) => {
    /**
     * The base model with attachments
     */
    class TestBaseModel2 {
      // Define stub properties
      $attributes: Record<string, any> = {};
      $original: Record<string, any> = {};
      $isLocal = true;
      $isPersisted = false;
      $dirty: Set<string> = new Set();

      // Attachment decorator
      @attachment()
      declare avatar: Attachment | null;

      // Stub methods
      constructor() {
        this.$attributes = {};
        this.$original = {};
        this.$isLocal = true;
        this.$isPersisted = false;
        this.$dirty = new Set();
      }

      // These methods simulate the behavior of a Lucid model
      $consumeAdapterResult(adapterResult: any) {
        this.$attributes = { ...this.$attributes, ...adapterResult };
        this.$original = { ...this.$original, ...adapterResult };
        this.$isPersisted = true;
        this.$isLocal = false;
        this.$dirty.clear();
      }

      async save(instance: typeof TestBaseModel2) {
        // In a real model, this would call the database adapter
        const adapterResult = { id: 1 };

        // Set avatar property for saving
        if (this.avatar) {
          await this.avatar.store();
          this.$attributes.avatar = this.avatar.toJSON();
        }

        this.$consumeAdapterResult(adapterResult);

        // Call hooks
        await instance.afterFind(this);
      }

      async delete(instance: typeof TestBaseModel2) {
        // Call before delete hook
        await instance.beforeDelete(this);

        // Simulate deletion in the database
        this.$isPersisted = false;
      }

      // Model hooks
      static async afterFind(model: TestBaseModel2) {
        if (model.$attributes.avatar) {
          model.avatar = Attachment.fromJSON(model.$attributes.avatar);
        }
      }

      static async beforeDelete(model: TestBaseModel2) {
        if (model.avatar) {
          await model.avatar.destroy();
          model.avatar = null;
        }
      }
    }

    // Create a model without an actual file for the attachment
    const userModel = new TestBaseModel2();

    // Directly set a JSON representation of an attachment to the model attributes
    userModel.$attributes.avatar = {
      fileName: "non-existent.jpg",
      size: 1024,
      mimeType: "image/jpeg",
      extname: "jpg",
      folder: "avatars",
      disk: "local",
    };

    // This would normally be called by the model's afterFind hook
    userModel.avatar = Attachment.fromJSON(userModel.$attributes.avatar);

    // Deletion should not throw even if the file doesn't exist
    await userModel.delete(TestBaseModel2);
    assert.isNull(userModel.avatar);
  });

  test("model can save an attachment", async ({ assert }: TestContext) => {
    class TestUser1 {
      $attributes: Record<string, any> = {};
      $isDirty = false;

      @attachment()
      declare avatar: Attachment | null;

      persist() {
        this.$isDirty = false;
        return this;
      }
    }

    const user = new TestUser1();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    user.avatar = file;
    await user.avatar.store();

    assert.isObject(user.$attributes.avatar);
    assert.isFalse(user.avatar.isLocal);
  });

  test("can get attachment url", async ({ assert }: TestContext) => {
    class TestUser2 {
      $attributes: Record<string, any> = {};

      @attachment()
      declare avatar: Attachment | null;
    }

    const user = new TestUser2();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    user.avatar = file;
    await user.avatar.store();

    const url = await user.avatar.getUrl();
    assert.isString(url);
  });

  test("can compute attachment url", async ({ assert }: TestContext) => {
    class TestUser3 {
      $attributes: Record<string, any> = {};

      @attachment()
      declare avatar: Attachment | null;
    }

    const user = new TestUser3();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    user.avatar = file;
    await user.avatar.store();

    const url = await user.avatar.computeUrl();
    assert.isString(url);
    assert.equal(user.avatar.url, url);
  });

  test("can specify folder for attachment", async ({ assert }: TestContext) => {
    class TestUser4 {
      $attributes: Record<string, any> = {};

      @attachment({ folder: "avatars" })
      declare avatar: Attachment | null;
    }

    const user = new TestUser4();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    user.avatar = file;
    await user.avatar.store();

    const url = await user.avatar.getUrl();
    assert.include(url, "avatars/");
  });

  test("model can delete an attachment", async ({ assert }: TestContext) => {
    class TestUser5 {
      $attributes: Record<string, any> = {};

      @attachment()
      declare avatar: Attachment | null;

      async deleteAttachment() {
        if (this.avatar) {
          await this.avatar.destroy();
          this.avatar = null;
        }
      }
    }

    const user = new TestUser5();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    user.avatar = file;
    await user.avatar.store();

    await user.deleteAttachment();
    assert.isNull(user.avatar);
  });

  test("can validate attachment MIME type", async ({ assert }: TestContext) => {
    class TestUser6 {
      $attributes: Record<string, any> = {};

      @attachment({
        allowedMimes: ["image/jpeg", "image/png"],
      })
      declare avatar: Attachment | null;
    }

    const user = new TestUser6();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    // Mock MIME type
    file.mimeType = "image/jpeg";
    user.avatar = file;

    assert.isTrue(
      file.validateMimeType({ allowedMimes: ["image/jpeg", "image/png"] }),
    );

    // Change to invalid MIME type
    file.mimeType = "text/plain";
    assert.isFalse(
      file.validateMimeType({ allowedMimes: ["image/jpeg", "image/png"] }),
    );
  });

  test("model can be serialized to JSON with attachment", async ({
    assert,
  }: TestContext) => {
    class TestUser7 {
      $attributes: Record<string, any> = {};
      id = 1;
      username = "johndoe";

      @attachment()
      declare avatar: Attachment | null;

      toJSON() {
        return {
          id: this.id,
          username: this.username,
          avatar: this.avatar ? this.avatar.toJSON() : null,
        };
      }
    }

    const user = new TestUser7();
    const file = new Attachment();
    await file.fromPath(testFilePath);

    // Store the file and set URL
    user.avatar = file;
    await user.avatar.store();
    await user.avatar.computeUrl();

    const json = user.toJSON();
    assert.isObject(json);
    assert.equal(json.id, 1);
    assert.equal(json.username, "johndoe");
    assert.isObject(json.avatar);

    // Check avatar properties safely
    if (json.avatar) {
      assert.isString(json.avatar.url);
    }
  });

  test("tracks changes to attachment during model lifecycle", async ({
    assert,
  }: TestContext) => {
    class TestUser8 {
      $attributes: Record<string, any> = {};
      $isDirty = false;
      $original: Record<string, any> = {};

      @attachment()
      declare avatar: Attachment | null;

      // Simple dirty tracker
      markAsDirty(field: string) {
        this.$isDirty = true;
        // Track original value for reporting changes
        if (!this.$original[field] && this.$attributes[field]) {
          this.$original[field] = this.$attributes[field];
        }
      }

      // Implementation for demo purposes
      async save() {
        // Clear dirty flag
        this.$isDirty = false;
        return this;
      }
    }

    // Create a user
    const user = new TestUser8();

    // Set an attachment
    const file = new Attachment();
    await file.fromPath(testFilePath);
    user.avatar = file;

    // Should mark the model as dirty
    assert.isTrue(user.$isDirty);

    // Save should clear the dirty flag
    await user.save();
    assert.isFalse(user.$isDirty);

    // Changing the attachment should mark dirty again
    const newFile = new Attachment();
    await newFile.fromPath(testFilePath);
    user.avatar = newFile;
    assert.isTrue(user.$isDirty);
  });

  test("handles missing files correctly after model load", async ({
    assert,
  }: TestContext) => {
    class TestUser9 {
      $attributes: Record<string, any> = {};

      @attachment()
      declare avatar: Attachment | null;

      // Simulate loading from database
      static fromDatabase(data: Record<string, any>) {
        const user = new TestUser9();
        user.$attributes = data;
        return user;
      }
    }

    // Create a user with a reference to a non-existent file
    const userData = {
      id: 1,
      username: "johndoe",
      avatar: {
        fileName: "missing.jpg",
        size: 1024,
        extname: "jpg",
        mimeType: "image/jpeg",
        folder: "avatars",
        disk: "local",
      },
    };

    const user = TestUser9.fromDatabase(userData);

    // The avatar should be loaded from the JSON data
    assert.instanceOf(user.avatar, Attachment);
    assert.equal(user.avatar!.fileName, "missing.jpg");

    // Should not throw when trying to access a non-existent file
    try {
      await user.avatar!.getUrl();
      assert.isTrue(true, "No error thrown");
    } catch (error) {
      assert.fail("Should not throw error on missing file");
    }
  });
});
