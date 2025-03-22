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
import AttachmentProvider from '../providers/attachment_provider.js'
import { defineConfig } from '../index.js'

test.group('Exports', () => {
  test('should export required components', async (ctx) => {
    // @ts-ignore - assert is added at runtime by the Japa assert plugin
    const { assert } = ctx

    assert.exists(Attachment, 'Attachment class is exported')
    assert.exists(attachment, 'attachment decorator is exported')
    assert.exists(defineConfig, 'defineConfig function is exported')
    assert.exists(AttachmentProvider, 'AttachmentProvider is exported')
  })
}) 