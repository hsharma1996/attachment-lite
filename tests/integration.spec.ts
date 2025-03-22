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
    return this.$attributes;
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
    const { assert } = ctx;
    
    // Create a model with tracking of attachments
    class ModelWithTracking extends BaseModel {
      attachmentData: {
        attached: string[],
        detached: string[]
      } = {
        attached: [],
        detached: []
      };
      
      $avatar?: Attachment;
      
      constructor() {
        super();
        
        Object.defineProperty(this, 'avatar', {
          get: () => this.$avatar,
          set: (value) => {
            // Track attachment changes
            if (!this.$avatar && value) {
              this.attachmentData.attached.push('avatar');
            } else if (this.$avatar && !value) {
              this.attachmentData.detached.push('avatar');
            }
            
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
    
    // Create the model and add an attachment
    const model = new ModelWithTracking();
    
    // Should start empty
    assert.equal(model.attachmentData.attached.length, 0);
    assert.equal(model.attachmentData.detached.length, 0);
    
    // Add an attachment
    const avatar = new Attachment();
    await avatar.fromPath(testFilePath);
    model.avatar = avatar;
    
    // Should track the addition
    assert.equal(model.attachmentData.attached.length, 1);
    assert.equal(model.attachmentData.attached[0], 'avatar');
    
    // Save the model
    await model.save();
    
    // Remove the attachment
    model.avatar = null as any;
    
    // Should track the removal
    assert.equal(model.attachmentData.detached.length, 1);
    assert.equal(model.attachmentData.detached[0], 'avatar');
  });
}) 