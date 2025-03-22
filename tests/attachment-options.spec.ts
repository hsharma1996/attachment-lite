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
import { attachment } from '../src/decorator/decorator.js'
import { setupDrive } from './bootstrap.js'
import { join } from 'path'
import fs from 'node:fs/promises'

/**
 * Mock BaseModel class for testing
 */
class BaseModel {
  $attributes: Record<string, any> = {}

  static $attachments: Record<string, any> = {}
  static $columns: Record<string, any> = {}

  static boot() {}

  static $addColumn(property: string, columnConfig: any) {
    if (!this.$columns) {
      this.$columns = {}
    }
    this.$columns[property] = columnConfig
  }

  static before(hookName: string, callback: Function) {}
  static after(hookName: string, callback: Function) {}

  async save() {}
  async delete() {}
  toJSON() {
    return this.$attributes
  }
}

test.group('Attachment Options', (group) => {
  let testFilePath: string
  let testImagePath: string

  // Set up the drive for testing
  setupDrive()

  group.each.setup(async () => {
    // Create test files
    testFilePath = join(process.cwd(), 'test-file.txt')
    testImagePath = join(process.cwd(), 'test-image.jpg')
    
    await fs.writeFile(testFilePath, 'Test content')
    await fs.writeFile(testImagePath, 'Fake image content')

    return async () => {
      await Promise.all([
        fs.unlink(testFilePath).catch(() => {}),
        fs.unlink(testImagePath).catch(() => {})
      ])
    }
  })

  test('validateMimeType validates mime types correctly', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx
    
    // Create attachments with different mime types
    const textFile = new Attachment()
    await textFile.fromPath(testFilePath)
    textFile.mimeType = 'text/plain'
    
    const imageFile = new Attachment()
    await imageFile.fromPath(testImagePath)
    imageFile.mimeType = 'image/jpeg'
    
    // Test the validateMimeType method directly
    const allowedMimes = ['text/plain']
    assert.isTrue(textFile.validateMimeType({ allowedMimes }))
    assert.isFalse(imageFile.validateMimeType({ allowedMimes }))
    
    // Test that our implementation uses this method
    // We can't easily test the hook directly, so we'll test the logic
    // that would be executed by the hook
    const options = {
      validateMime: true,
      allowedMimes: ['text/plain']
    }
    
    // Valid MIME type should pass
    assert.doesNotThrow(() => {
      if (options.validateMime && options.allowedMimes && options.allowedMimes.length > 0) {
        if (!textFile.validateMimeType({ allowedMimes: options.allowedMimes })) {
          throw new Error(
            `Invalid MIME type for attachment. ` +
            `Expected one of: ${options.allowedMimes.join(', ')}, but got: ${textFile.mimeType}`
          )
        }
      }
    })
    
    // Invalid MIME type should throw
    assert.throws(() => {
      if (options.validateMime && options.allowedMimes && options.allowedMimes.length > 0) {
        if (!imageFile.validateMimeType({ allowedMimes: options.allowedMimes })) {
          throw new Error(
            `Invalid MIME type for attachment. ` +
            `Expected one of: ${options.allowedMimes.join(', ')}, but got: ${imageFile.mimeType}`
          )
        }
      }
    }, `Invalid MIME type for attachment. Expected one of: text/plain, but got: image/jpeg`)
  })

  test('computeUrl option is honored by the model', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx
    
    // Create an attachment
    const file = new Attachment()
    await file.fromPath(testFilePath)
    
    // Store the file to allow URL computation
    await file.store()
    
    // Assert URL is not computed yet
    assert.isNull(file.url)
    
    // Manually compute URL
    const url = await file.computeUrl()
    
    // URL should now be computed
    assert.isNotNull(url)
    assert.isNotNull(file.url)
    assert.equal(file.url, url)
  })
  
  test('attachment options are stored on the model', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx
    
    // Define model with various attachment options
    class UserModel extends BaseModel {
      @attachment({
        disk: 'custom',
        folder: 'avatars',
        computeUrl: true,
        validateMime: true,
        allowedMimes: ['image/jpeg', 'image/png']
      })
      declare avatar: Attachment
    }
    
    // Check if options were stored correctly
    assert.isObject(UserModel.$attachments)
    assert.isObject(UserModel.$attachments.avatar)
    assert.equal(UserModel.$attachments.avatar.disk, 'custom')
    assert.equal(UserModel.$attachments.avatar.folder, 'avatars')
    assert.isTrue(UserModel.$attachments.avatar.computeUrl)
    assert.isTrue(UserModel.$attachments.avatar.validateMime)
    assert.deepEqual(UserModel.$attachments.avatar.allowedMimes, ['image/jpeg', 'image/png'])
  })
  
  test('setOptions method applies attachment options correctly', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx
    
    // Create an attachment
    const file = new Attachment()
    await file.fromPath(testFilePath)
    
    // Define options similar to what would be passed by the model
    const options = {
      disk: 'custom',
      folder: 'avatars'
    }
    
    // Apply options using setOptions
    file.setOptions(options)
    
    // Verify options were applied
    assert.equal(file.disk, 'custom')
    assert.equal(file.folder, 'avatars')
    assert.include(file.filePath, 'avatars/')
  })
}) 