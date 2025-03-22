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
import { join } from 'path'
import fs from 'node:fs/promises'

test.group('Attachment', (group) => {
  let testFilePath: string
  let testBuffer: Buffer

  // Set up the drive for testing
  setupDrive()

  group.each.setup(async () => {
    // Create a test file
    testFilePath = join(process.cwd(), 'test-file.txt')
    testBuffer = Buffer.from('Test content')
    await fs.writeFile(testFilePath, testBuffer)

    return () => fs.unlink(testFilePath).catch(() => {})
  })

  test('can create an attachment from a file path', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12) // 'Test content' length
    assert.isTrue(file.isLocal)
  })

  test('can create an attachment from a buffer', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromBuffer(testBuffer, { 
      filename: 'test-buffer.txt',
      mimeType: 'text/plain'
    })

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12) // 'Test content' length
    assert.equal(file.mimeType, 'text/plain')
    assert.isTrue(file.isLocal)

    // Test storing from buffer
    await file.store()
    assert.isFalse(file.isLocal)
  })

  test('can set options on an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    file.setOptions({ folder: 'uploads', disk: 'local' })

    assert.equal(file.folder, 'uploads')
    assert.equal(file.disk, 'local')
  })

  test('can store and get url for an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    await file.store()

    const url = await file.getUrl()
    assert.isString(url)
  })

  test('can compute url for an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    await file.store()

    assert.isNull(file.url) // URL not computed yet
    
    const computedUrl = await file.computeUrl()
    assert.isString(computedUrl)
    assert.equal(file.url, computedUrl) // URL should now be stored on the instance
  })

  test('can get signed url for an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    await file.store()

    const signedUrl = await file.getSignedUrl({ expiresIn: '1h' })
    assert.isString(signedUrl)
    assert.include(signedUrl, 'signed=true') // Mock disk adds ?signed=true
  })

  test('can be created from JSON', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const data = {
      fileName: 'test-file.txt',
      size: 12,
      extname: 'txt',
      mimeType: 'text/plain',
    }

    const file = Attachment.fromJSON(data)
    assert.instanceOf(file, Attachment)
    assert.equal(file?.fileName, 'test-file.txt')
  })

  test('returns null when creating from null JSON', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = Attachment.fromJSON(null)
    assert.isNull(file)
  })
  
  test('sets file path based on folder', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    file.setOptions({ folder: 'custom-folder' })
    
    assert.include(file.filePath, 'custom-folder/')
  })
  
  test('can properly serialize attachment to JSON', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    await file.store()

    const json = file.toJSON()
    assert.isObject(json)
    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(json.fileName.endsWith('.txt'))
    assert.equal(json.size, 12)
  })

  test('can create an attachment from a multipart file', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    // Mock a multipart file object similar to what AdonisJS would provide
    const mockMultipartFile = {
      clientName: 'test-upload.txt',
      fileName: 'test-upload.txt',
      filePath: testFilePath,
      tmpPath: testFilePath,
      size: testBuffer.length,
      extname: 'txt',
      type: 'text/plain',
      subtype: 'plain',
      validate() {
        return { isValid: true, errors: [] }
      },
      move() {
        return { fileName: 'test-upload.txt' }
      }
    }

    const file = new Attachment()
    await file.fromFile(mockMultipartFile as any)

    // Using UUID for filename, so just check if it has the correct extension
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12) // 'Test content' length
    assert.equal(file.mimeType, 'text/plain')
    assert.isTrue(file.isLocal)
  })

  test('can validate MIME type of an attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = new Attachment()
    await file.fromPath(testFilePath)
    file.mimeType = 'image/jpeg'
    
    // Without allowed mimes, should return true
    assert.isTrue(file.validateMimeType())
    
    // With matching allowed mimes, should return true
    assert.isTrue(file.validateMimeType({ allowedMimes: ['image/jpeg', 'image/png'] }))
    
    // With non-matching allowed mimes, should return false
    assert.isFalse(file.validateMimeType({ allowedMimes: ['image/png', 'image/gif'] }))
    
    // Test with null MIME type
    file.mimeType = null
    assert.isFalse(file.validateMimeType())
  })
  
  test('static fromFile creates an attachment from multipart file', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    // Mock a multipart file object
    const mockMultipartFile = {
      clientName: 'test-upload.txt',
      fileName: 'test-upload.txt',
      filePath: testFilePath,
      tmpPath: testFilePath,
      size: testBuffer.length,
      extname: 'txt',
      type: 'text/plain',
      subtype: 'plain',
      validate() {
        return { isValid: true, errors: [] }
      },
      move() {
        return { fileName: 'test-upload.txt' }
      }
    }

    const file = await Attachment.fromFile(mockMultipartFile as any)

    assert.instanceOf(file, Attachment)
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12)
    assert.equal(file.mimeType, 'text/plain')
    assert.isTrue(file.isLocal)
  })
  
  test('static fromPath creates an attachment from file path', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = await Attachment.fromPath(testFilePath)

    assert.instanceOf(file, Attachment)
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12)
    assert.isTrue(file.isLocal)
  })
  
  test('static fromBuffer creates an attachment from buffer', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const file = await Attachment.fromBuffer(testBuffer, { 
      filename: 'test-buffer.txt',
      mimeType: 'text/plain'
    })

    assert.instanceOf(file, Attachment)
    assert.isTrue(file.fileName?.endsWith('.txt'))
    assert.equal(file.size, 12)
    assert.equal(file.mimeType, 'text/plain')
    assert.isTrue(file.isLocal)
  })
}) 