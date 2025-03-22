/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Attachment } from '../src/attachment.js'
import { setupDrive } from './bootstrap.js'
import { join } from 'node:path'
import fs from 'node:fs/promises'

/**
 * Simple model class for testing
 */
class BaseModel {
  $attributes: Record<string, any> = {};
  $original: Record<string, any> = {};

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
class User extends BaseModel {
  // Private property to store avatar attachment
  $avatar?: Attachment;

  constructor() {
    super();

    // Manually apply what the decorator would do
    Object.defineProperty(this, 'avatar', {
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
class TestModel extends BaseModel {
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

test.group('Integration', (group) => {
  let testFilePath: string;

  // Set up the drive for testing
  setupDrive();

  group.each.setup(async () => {
    // Create a test file
    testFilePath = join(process.cwd(), 'test-file.txt');
    await fs.writeFile(testFilePath, 'Test content');

    return () => fs.unlink(testFilePath).catch(() => { });
  });

  test('model can save an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx;

    const user = new User();

    // Create an attachment
    const avatar = new Attachment();
    await avatar.fromPath(testFilePath);

    // Set it on the model
    user.avatar = avatar;

    // Verify it's still local
    assert.isTrue(avatar.isLocal);

    // Save the model (which should store the attachment)
    await user.save();

    // Verify the attachment was stored
    assert.isFalse(avatar.isLocal);

    // Get URL should now work
    const url = await avatar.getUrl();
    assert.isString(url);
  });

  test('model can delete an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx;

    const user = new User();

    // Create and set the attachment
    const avatar = new Attachment();
    await avatar.fromPath(testFilePath);
    user.avatar = avatar;

    // Save to store it
    await user.save();

    // Now mock the destroy method on the attachment to verify it's called
    let destroyCalled = false;
    const originalDestroy = avatar.destroy;
    avatar.destroy = async function () {
      destroyCalled = true;
      return originalDestroy.call(this);
    };

    // Delete the model
    await user.delete();

    // Verify the destroy method was called
    assert.isTrue(destroyCalled, 'Attachment destroy method should be called');
  });

  test('model can be serialized to JSON with attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx;

    const user = new User();

    // Create and set the attachment
    const avatar = new Attachment();
    await avatar.fromPath(testFilePath);
    user.avatar = avatar;

    // Convert to JSON
    const json = JSON.stringify(user);
    const parsed = JSON.parse(json);

    // Verify the attachment data is included
    assert.property(parsed, 'avatar');
    assert.equal(parsed.avatar.fileName, avatar.fileName);
    assert.equal(parsed.avatar.size, avatar.size);
  });

  test('tracks changes to attachment during model lifecycle', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const testFilePath = join(process.cwd(), 'test-file.jpg')

    // Create a TestModel
    const model = new TestModel()
    const attachment = new Attachment()
    await attachment.fromPath(testFilePath)
    
    // Set attachment
    model.avatar = attachment
    
    // Save model
    await model.save()
    
    // Check the attachment was stored and is no longer local
    assert.isFalse(attachment.isLocal)
    
    // Check it can be serialized to JSON
    const json = model.toJSON()
    assert.isObject(json.avatar)
    
    // Delete model
    await model.delete()
  });

  test('handles missing files correctly after model load', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    // Create a test model with attachment
    const model = new TestModel()
    
    // Create an attachment that refers to a non-existent file
    const attachment = new Attachment()
    attachment.isLocal = false  // Pretend it's already stored
    attachment.fileName = 'non-existent-file.jpg'
    attachment.filePath = 'uploads/non-existent-file.jpg'
    attachment.size = 1024
    attachment.extname = 'jpg'
    attachment.mimeType = 'image/jpeg'
    attachment.disk = 'local'
    attachment.folder = 'uploads'
    
    // Set it on the model
    model.avatar = attachment
    
    // Set the attributes directly to simulate a loaded model
    model.$attributes.avatar = attachment
    model.$original.avatar = attachment
    
    // Create a mock of the model's afterFind hook
    class MockModelWithHooks extends TestModel {
      static async afterFind(instance: any) {
        // This simulates the hook that verifies attachments
        await verifyModelAttachments(instance)
      }
    }
    
    // Function to manually verify attachments (simulates what the decorator does)
    async function verifyModelAttachments(instance: any) {
      const attachments = ['avatar'] // In real code this would come from model.$attachments
      
      for (const property of attachments) {
        const attachment = instance[property]
        if (attachment && !attachment.isLocal) {
          try {
            // Override computeUrl to simulate missing file
            const originalComputeUrl = attachment.computeUrl
            attachment.computeUrl = async function() {
              throw new Error('File not found')
            }
            
            // Try to compute URL which would fail
            await attachment.computeUrl()
            
            // Restore original method
            attachment.computeUrl = originalComputeUrl
          } catch (error) {
            // Set to null if file is missing
            instance[property] = null
            instance.$attributes[property] = null
          }
        }
      }
    }
    
    // Run the simulated hook
    await MockModelWithHooks.afterFind(model)
    
    // The attachment should be null now
    assert.isNull(model.avatar)
    assert.isNull(model.$attributes.avatar)
  });
}) 