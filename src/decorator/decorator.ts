/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import type { AttachmentOptions, AttachmentContract } from '../types.js'
import { Attachment } from '../attachment.js'

/**
 * Attachment decorator to be used on Lucid model properties
 */
export function attachment(options?: AttachmentOptions) {
  return function (target: any, property: string) {
    const ModelConstructor = target.constructor as any

    /**
     * Add hooks for processing and cleaning up attachments during
     * the model lifecycle events
     */
    if (typeof ModelConstructor.boot === 'function') {
      ModelConstructor.boot()
    }

    // Create hooks
    ModelConstructor.before('create', processAttachment)
    ModelConstructor.before('update', processAttachment)
    ModelConstructor.after('delete', cleanupAttachment)

    // Fetch hooks
    ModelConstructor.after('fetch', computeUrls)
    ModelConstructor.after('find', computeUrls)
    ModelConstructor.after('paginate', computeUrlsForPagination)

    /**
     * Define serializer for the property to serialize it
     * as an object
     */
    if (typeof ModelConstructor.$addColumn === 'function') {
      ModelConstructor.$addColumn(property, {
        serialize(value: Attachment | null) {
          if (!value) {
            return null
          }

          return value.toJSON()
        },
      })
    }

    /**
     * Save property options to be used by hooks
     */
    if (!ModelConstructor.$attachments) {
      ModelConstructor.$attachments = {}
    }

    ModelConstructor.$attachments[property] = options || {}
  }
}

/**
 * Process attachments during model create or update
 */
async function processAttachment(instance: any) {
  const ModelConstructor = instance.constructor as any
  if (!ModelConstructor.$attachments) {
    return
  }

  /**
   * Initialize attachment data if not exists
   */
  instance.attachmentData = instance.attachmentData || {
    attached: [],
    detached: [],
  }

  /**
   * Collect all attachments to be processed
   */
  const filesToProcess: { property: string; file: AttachmentContract; options: AttachmentOptions }[] = []

  Object.keys(ModelConstructor.$attachments).forEach((property) => {
    const file = instance[property] as AttachmentContract | null
    if (!file) {
      return
    }

    if (file.isLocal === true) {
      filesToProcess.push({
        property,
        file,
        options: ModelConstructor.$attachments[property] || {},
      })
    }
  })

  /**
   * No files to process
   */
  if (!filesToProcess.length) {
    return
  }

  /**
   * Process all files at once
   */
  try {
    await Promise.all(
      filesToProcess.map(({ file, options }) => {
        file.setOptions(options)
        return file.store()
      })
    )
  } catch (error) {
    /**
     * If we fail to process any file, then we must clean all
     * the processed ones
     */
    await Promise.all(
      filesToProcess.map(({ file }) => {
        return file.destroy().catch(() => { })
      })
    )

    throw error
  }
}

/**
 * Clean up attachment when model instance is deleted
 */
async function cleanupAttachment(instance: any) {
  const ModelConstructor = instance.constructor as any
  if (!ModelConstructor.$attachments) {
    return
  }

  /**
   * Collect all attachments to be cleaned
   */
  const promises: Promise<any>[] = []

  Object.keys(ModelConstructor.$attachments).forEach((property) => {
    const file = instance[property] as AttachmentContract | null
    if (!file) {
      return
    }

    promises.push(file.destroy().catch(() => { }))
  })

  /**
   * Clean all files at once
   */
  await Promise.all(promises)
}

/**
 * Compute urls for the given model instance
 */
async function computeUrls(result: any) {
  await computeUrlsForMany([result].filter(Boolean))
}

/**
 * Compute urls for the given model instances in pagination results
 */
async function computeUrlsForPagination(result: { all: () => any[] }) {
  await computeUrlsForMany(result.all())
}

/**
 * Compute urls for the given model instances
 */
async function computeUrlsForMany(models: any[]) {
  /**
   * Return early when no models
   */
  if (!models.length) {
    return
  }

  const ModelConstructor = models[0].constructor as any
  if (!ModelConstructor.$attachments) {
    return
  }

  const promises: Array<Promise<any>> = []

  /**
   * Collect all attachments for which we will compute urls
   */
  models.forEach((model) => {
    Object.keys(ModelConstructor.$attachments).forEach((property) => {
      const file = model[property] as AttachmentContract | null
      if (!file) {
        return
      }

      const options = ModelConstructor.$attachments[property]
      if (options?.computeUrl) {
        promises.push(file.computeUrl().catch(() => { }))
      }
    })
  })

  /**
   * Compute all urls at once
   */
  await Promise.all(promises)
} 