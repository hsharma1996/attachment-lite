/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AttachmentOptions, AttachmentContract } from '../types.js'
import { Attachment } from '../attachment.js'

/**
 * Verify if an attachment file exists in storage and set to null if missing
 */
async function verifyAttachmentExists(instance: any, property: string): Promise<void> {
  const attachment = instance[property] as AttachmentContract | null;
  
  // Skip if there's no attachment or if it's a local file
  if (!attachment || attachment.isLocal || !attachment.filePath) {
    return;
  }
  
  try {
    // Try to compute URL which will access the storage
    await attachment.computeUrl();
  } catch (error) {
    // If there's an error, the file likely doesn't exist in storage
    console.warn(`File missing for attachment ${property}: ${attachment.filePath}, setting to null`);
    
    // Set the property to null since the file is missing
    instance[property] = null;
    
    // Also update the attributes to maintain consistency
    if (instance.$attributes) {
      instance.$attributes[property] = null;
    }
  }
}

/**
 * Verify all attachments on a model instance
 */
async function verifyAttachments(instance: any) {
  const ModelConstructor = instance.constructor as any;
  
  if (!ModelConstructor.$attachments) {
    return;
  }
  
  // Process all attachment fields
  await Promise.all(
    Object.keys(ModelConstructor.$attachments).map((property) => {
      return verifyAttachmentExists(instance, property);
    })
  );
}

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

    // Fetch hooks with verification
    ModelConstructor.after('fetch', async (result: any) => {
      await computeUrls(result);
      // Verify attachments after computing URLs
      if (result) {
        await verifyAttachments(result);
      }
    })
    
    ModelConstructor.after('find', async (result: any) => {
      await computeUrls(result);
      // Verify attachments after computing URLs
      if (result) {
        await verifyAttachments(result);
      }
    })
    
    ModelConstructor.after('paginate', async (result: any) => {
      await computeUrlsForPagination(result);
      // Verify attachments in pagination results
      const models = result.all();
      if (models.length) {
        await Promise.all(models.map(verifyAttachments));
      }
    })

    /**
     * Define serializer for the property to serialize it
     * as an object with proper conversion from JSON and to JSON
     */
    if (typeof ModelConstructor.$addColumn === 'function') {
      ModelConstructor.$addColumn(property, {
        // Convert from DB response to Attachment object
        consume(value: any) {
          try {
            // First attempt to convert from database response
            const attachment = Attachment.fromDbResponse(value);
            
            // If we have an attachment, we'll try to verify it exists by computing URL
            // This will implicitly verify the file exists (if it doesn't, it'll fail)
            if (attachment && !attachment.isLocal && attachment.filePath) {
              // For immediate verification, we can try to compute URL
              // but we'll handle the promise in a way that won't crash
              attachment.computeUrl().catch(() => {
                // If the file doesn't exist on storage, we'll return null
                // This needs to be handled at the model level
                console.warn(`Attachment file not found: ${attachment.filePath}`);
                // We can't modify the model property here, but we'll handle it in the hook
              });
            }
            
            return attachment;
          } catch (error) {
            console.warn('Error loading attachment, replacing with null:', error);
            return null;
          }
        },
        // Convert from Attachment object to JSON string for storage
        prepare(value: Attachment | null) {
          if (!value) {
            return null
          }
          return JSON.stringify(value.toObject())
        },
        // Serialize to JSON for API responses
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
     * Only initialize $attachments once per model
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
      const options = ModelConstructor.$attachments[property] || {}
      
      // Check if validateMime is enabled and validate the MIME type
      if (options.validateMime && options.allowedMimes && options.allowedMimes.length > 0) {
        if (!file.validateMimeType({ allowedMimes: options.allowedMimes })) {
          throw new Error(
            `Invalid MIME type for attachment "${property}". ` +
            `Expected one of: ${options.allowedMimes.join(', ')}, but got: ${file.mimeType}`
          )
        }
      }
      
      filesToProcess.push({
        property,
        file,
        options,
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
    
    // After storing all files, compute URLs for those with computeUrl option
    await Promise.all(
      filesToProcess.map(({ file, options }) => {
        if (options.computeUrl) {
          return file.computeUrl().catch(() => {})
        }
        return Promise.resolve()
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