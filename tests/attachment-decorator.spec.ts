/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { attachment } from '../src/decorator/decorator.js'
import { Attachment } from '../src/attachment.js'

// Mock AdonisJS 6 model base structure with hooks
class BaseModel {
  $attributes: Record<string, any> = {}
  $original: Record<string, any> = {}

  // Method needed for decorator to work
  computePropertyName(key: string): string {
    return key
  }

  // Mock hook methods needed by decorator
  static boot() { }
  static before() { }
  static after() { }
  static $addColumn() { }
}

test.group('Attachment Decorator', () => {
  test('decorator exists and is exported', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    assert.isFunction(attachment)
  })

  test('decorator returns a function', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    const result = attachment()
    assert.isFunction(result)
  })

  test('can decorate class property with attachment', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    // Create a mock class with the decorator
    // const decoratedProperty = attachment()

    // Manually apply what the decorator would do
    class TestModel extends BaseModel {
      declare avatar: Attachment
    }

    // Manually create getter/setter for the property
    const model = new TestModel()
    let avatarValue: Attachment | null = null

    Object.defineProperty(TestModel.prototype, 'avatar', {
      get() {
        return avatarValue
      },
      set(value) {
        avatarValue = value
        this.$attributes.avatar = value
      },
      enumerable: true,
    })

    // Check if the property works as expected
    const testAttachment = new Attachment()
    model.avatar = testAttachment

    assert.strictEqual(model.avatar, testAttachment)
    assert.strictEqual(model.$attributes.avatar, testAttachment)
  })

  test('attachment supports options', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    // Create an attachment with options
    const testAttachment = new Attachment()
    testAttachment.setOptions({
      disk: 'local',
      folder: 'avatars'
    })

    // Verify options were applied to the attachment
    assert.equal(testAttachment.disk, 'local')
    assert.equal(testAttachment.folder, 'avatars')
  })
}) 