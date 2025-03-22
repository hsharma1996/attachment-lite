/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type {
  AttachmentOptions,
  AttachmentContract,
  LucidModel,
  LucidRow,
} from "../types.js";
import { Attachment } from "../attachment.js";

/**
 * Detect changes in attachment properties and mark detached files for cleanup
 */
function detectAttachmentChanges(instance: LucidRow): void {
  const ModelConstructor = instance.constructor as LucidModel;
  if (!ModelConstructor.$attachments) return;

  // Initialize attachment data if not exists
  if (!instance.attachmentData) {
    instance.attachmentData = {
      attached: [],
      detached: [],
    };
  }

  // Get original values from the model
  const originalValues = (instance as any).$original || {};

  // Check each attachment property
  Object.keys(ModelConstructor.$attachments).forEach((property) => {
    const key = property as keyof LucidRow;
    const newValue = instance[key] as AttachmentContract | null;
    const oldValue = originalValues[property] as unknown;

    // Skip if no old value (nothing to detach)
    if (!oldValue) return;

    // Convert old value to attachment if it's not already
    const oldAttachment =
      typeof oldValue === "string"
        ? Attachment.fromJSON(oldValue)
        : (oldValue as AttachmentContract | null);

    // If old value exists and is different from new value
    if (
      oldAttachment &&
      (!newValue || oldAttachment.filePath !== newValue.filePath)
    ) {
      // Add to detached list for cleanup
      if (instance.attachmentData) {
        instance.attachmentData.detached.push(property);
      }
    }
  });
}

/**
 * Clean up detached attachments
 */
async function cleanupDetachedAttachments(instance: LucidRow): Promise<void> {
  if (!instance.attachmentData?.detached?.length) return;

  const originalValues = (instance as any).$original || {};

  const promises = instance.attachmentData.detached.map(async (property) => {
    // Get original attachment data
    const originalData = originalValues[property];
    if (!originalData) return;

    // Create attachment from original data
    const attachmentInstance =
      typeof originalData === "string"
        ? Attachment.fromJSON(originalData)
        : (originalData as AttachmentContract | null);

    // Destroy the attachment if it exists
    if (attachmentInstance && !attachmentInstance.isLocal) {
      // Check if destroy is a function before calling it
      if (typeof attachmentInstance.destroy === "function") {
        await attachmentInstance.destroy().catch(() => {
          // Log error but don't fail the operation
          console.warn(
            `Failed to destroy detached attachment: ${attachmentInstance.filePath}`,
          );
        });
      } else {
        // If destroy is not a function, log a warning
        console.warn(
          `Attachment destroy method not available for: ${attachmentInstance.filePath}`,
        );
      }
    }
  });

  await Promise.all(promises);

  // Clear the detached list after processing
  if (instance.attachmentData) {
    instance.attachmentData.detached = [];
  }
}

/**
 * Verify if an attachment file exists in storage and set to null if missing
 */
async function verifyAttachmentExists(
  instance: LucidRow,
  property: keyof LucidRow,
): Promise<void> {
  // Use type assertion for string indexing
  const attachmentValue = instance[property] as AttachmentContract | null;

  // Skip if there's no attachment or if it's a local file
  if (
    !attachmentValue ||
    attachmentValue.isLocal ||
    !attachmentValue.filePath
  ) {
    return;
  }

  try {
    // Try to compute URL which will access the storage
    await attachmentValue.computeUrl();
  } catch (error) {
    // If there's an error, the file likely doesn't exist in storage
    console.warn(
      `File missing for attachment ${property}: ${attachmentValue.filePath}, setting to null`,
    );

    // Set the property to null since the file is missing
    // @ts-ignore
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
async function verifyAttachments(instance: LucidRow) {
  const ModelConstructor = instance.constructor as LucidModel;

  if (!ModelConstructor.$attachments) {
    return;
  }

  // Process all attachment fields
  await Promise.all(
    Object.keys(ModelConstructor.$attachments).map((property) => {
      return verifyAttachmentExists(instance, property as keyof LucidRow);
    }),
  );
}

/**
 * Persist a specific attachment without saving the model
 * This is useful when you want to store an attachment without saving model changes
 */
export async function persistAttachment(
  instance: LucidRow,
  property: keyof LucidRow,
): Promise<void> {
  const ModelConstructor = instance.constructor as LucidModel;

  if (
    !ModelConstructor.$attachments ||
    !ModelConstructor.$attachments[property]
  ) {
    throw new Error(
      `Property "${property}" is not configured as an attachment`,
    );
  }

  // Use type assertion for string indexing
  const file = instance[property] as AttachmentContract | null;
  if (!file || !file.isLocal) {
    return; // Nothing to persist or already persisted
  }

  const options = ModelConstructor.$attachments[property];

  // Check MIME type validation
  if (
    options.validateMime &&
    options.allowedMimes &&
    options.allowedMimes.length > 0
  ) {
    if (!file.validateMimeType({ allowedMimes: options.allowedMimes })) {
      throw new Error(
        `Invalid MIME type for attachment "${property}". ` +
          `Expected one of: ${options.allowedMimes.join(", ")}, but got: ${file.mimeType}`,
      );
    }
  }

  // Store the file
  file.setOptions(options);
  await file.store();

  // Compute URL if needed
  if (options.computeUrl) {
    await file.computeUrl().catch(() => {});
  }
}

/**
 * Process multiple attachments at once without saving the model
 * Useful for batch processing multiple attachment fields
 */
export async function processAttachments(
  instance: LucidRow,
  properties?: string[],
): Promise<void> {
  const ModelConstructor = instance.constructor as LucidModel;

  if (!ModelConstructor.$attachments) {
    return;
  }

  // Determine which properties to process
  const attachmentProperties =
    properties || Object.keys(ModelConstructor.$attachments);

  // Filter to only include properties that are actually configured as attachments
  const validProperties = attachmentProperties.filter(
    (prop) =>
      ModelConstructor.$attachments && ModelConstructor.$attachments[prop],
  );

  if (validProperties.length === 0) {
    return;
  }

  // Process all attachments in parallel
  await Promise.all(
    validProperties.map((property) =>
      persistAttachment(instance, property as keyof LucidRow),
    ),
  );
}

/**
 * Attachment decorator to be used on Lucid model properties
 */
export function attachment(options?: AttachmentOptions) {
  return function (target: object, property: string) {
    const ModelConstructor = target.constructor as LucidModel;

    /**
     * Add hooks for processing and cleaning up attachments during
     * the model lifecycle events
     */
    if (typeof ModelConstructor.boot === "function") {
      ModelConstructor.boot();
    }

    // Create hooks - only if ModelConstructor has these methods
    if (typeof ModelConstructor.before === "function") {
      ModelConstructor.before("create", processAttachment);

      // Enhanced update hook to handle attachment changes
      ModelConstructor.before("update", async (instance: LucidRow) => {
        // First detect changes to existing attachments
        detectAttachmentChanges(instance);

        // Then clean up detached attachments
        await cleanupDetachedAttachments(instance);

        // Finally process new attachments
        await processAttachment(instance);
      });
    }

    if (typeof ModelConstructor.after === "function") {
      ModelConstructor.after("delete", cleanupAttachment);

      // Fetch hooks with verification
      ModelConstructor.after("fetch", async (result: LucidRow) => {
        await computeUrls(result);
        // Verify attachments after computing URLs
        if (result) {
          await verifyAttachments(result);
        }
      });

      ModelConstructor.after("find", async (result: LucidRow) => {
        await computeUrls(result);
        // Verify attachments after computing URLs
        if (result) {
          await verifyAttachments(result);
        }
      });

      ModelConstructor.after(
        "paginate",
        async (result: { all: () => LucidRow[] }) => {
          await computeUrlsForPagination(result);
          // Verify attachments in pagination results
          const models = result.all();
          if (models.length) {
            await Promise.all(models.map(verifyAttachments));
          }
        },
      );
    }

    /**
     * Define serializer for the property to serialize it
     * as an object with proper conversion from JSON and to JSON
     */
    if (typeof ModelConstructor.$addColumn === "function") {
      ModelConstructor.$addColumn(property, {
        // Convert from DB response to Attachment object
        consume(value: any) {
          try {
            // First attempt to convert from database response
            const attachmentObj = Attachment.fromDbResponse(value);

            // If we have an attachment, we'll try to verify it exists by computing URL
            // This will implicitly verify the file exists (if it doesn't, it'll fail)
            if (
              attachmentObj &&
              !attachmentObj.isLocal &&
              attachmentObj.filePath
            ) {
              // For immediate verification, we can try to compute URL
              // but we'll handle the promise in a way that won't crash
              attachmentObj.computeUrl().catch(() => {
                // If the file doesn't exist on storage, we'll return null
                // This needs to be handled at the model level
                console.warn(
                  `Attachment file not found: ${attachmentObj.filePath}`,
                );
                // We can't modify the model property here, but we'll handle it in the hook
              });
            }

            return attachmentObj;
          } catch (error) {
            console.warn(
              "Error loading attachment, replacing with null:",
              error,
            );
            return null;
          }
        },
        // Convert from Attachment object to JSON string for storage
        prepare(value: Attachment | null) {
          if (!value) {
            return null;
          }
          return JSON.stringify(value.toObject());
        },
        // Serialize to JSON for API responses
        serialize(value: Attachment | null) {
          if (!value) {
            return null;
          }
          return value.toJSON();
        },
      });
    } else {
      // For non-Lucid models (mainly for testing), set up property descriptor
      // This mimics the behavior of $addColumn but with direct property access
      const privateKey = `_${property}`;

      Object.defineProperty(target, privateKey, {
        writable: true,
        enumerable: false,
      });

      Object.defineProperty(target, property, {
        get() {
          // Get from private property
          let value = this[privateKey];

          // If not set but available in $attributes, initialize it
          if (
            value === undefined &&
            this.$attributes &&
            this.$attributes[property]
          ) {
            value = Attachment.fromJSON(this.$attributes[property]);
            this[privateKey] = value;
          }

          return value;
        },
        set(value: Attachment | null) {
          // Set private property
          this[privateKey] = value;

          // Update $attributes for compatibility with tests
          if (!this.$attributes) {
            this.$attributes = {};
          }

          if (value) {
            // Apply folder option if provided
            if (options && options.folder && value.isLocal) {
              value.folder = options.folder;
            }

            this.$attributes[property] = value.toJSON();

            // Mark as dirty if the model supports it
            if (typeof this.markAsDirty === "function") {
              this.markAsDirty(property);
            } else if (this.$dirty instanceof Set) {
              this.$dirty.add(property);
            } else if (typeof this.$isDirty !== "undefined") {
              this.$isDirty = true;
            }
          } else {
            this.$attributes[property] = null;
          }
        },
        enumerable: true,
        configurable: true,
      });
    }

    /**
     * Save property options to be used by hooks
     * Only initialize $attachments once per model
     */
    if (!ModelConstructor.$attachments) {
      ModelConstructor.$attachments = {};
    }

    ModelConstructor.$attachments[property] = options || {};
  };
}

/**
 * Process attachments during model create or update
 */
async function processAttachment(instance: LucidRow) {
  const ModelConstructor = instance.constructor as LucidModel;
  if (!ModelConstructor.$attachments) {
    return;
  }

  /**
   * Initialize attachment data if not exists
   */
  if (!instance.attachmentData) {
    instance.attachmentData = {
      attached: [],
      detached: [],
    };
  }

  /**
   * Collect all attachments to be processed
   */
  const filesToProcess: {
    property: string;
    file: AttachmentContract;
    options: AttachmentOptions;
  }[] = [];

  Object.keys(ModelConstructor.$attachments).forEach((property) => {
    // Use type assertion for string indexing
    const file = instance[
      property as keyof LucidRow
    ] as AttachmentContract | null;
    if (!file) {
      return;
    }

    if (file.isLocal === true) {
      // We've already checked if $attachments exists above
      const options = ModelConstructor.$attachments![property];

      // Track newly attached files
      if (instance.attachmentData) {
        instance.attachmentData.attached.push(property);
      }

      // Check if validateMime is enabled and validate the MIME type
      if (
        options.validateMime &&
        options.allowedMimes &&
        options.allowedMimes.length > 0
      ) {
        if (!file.validateMimeType({ allowedMimes: options.allowedMimes })) {
          throw new Error(
            `Invalid MIME type for attachment "${property}". ` +
              `Expected one of: ${options.allowedMimes.join(", ")}, but got: ${file.mimeType}`,
          );
        }
      }

      filesToProcess.push({
        property,
        file,
        options,
      });
    }
  });

  /**
   * No files to process
   */
  if (!filesToProcess.length) {
    return;
  }

  /**
   * Process all files at once
   */
  try {
    await Promise.all(
      filesToProcess.map(({ file, options }) => {
        file.setOptions(options);
        return file.store();
      }),
    );

    // After storing all files, compute URLs for those with computeUrl option
    await Promise.all(
      filesToProcess.map(({ file, options }) => {
        if (options.computeUrl) {
          return file.computeUrl().catch(() => {});
        }
        return Promise.resolve();
      }),
    );
  } catch (error) {
    /**
     * If we fail to process any file, then we must clean all
     * the processed ones
     */
    await Promise.all(
      filesToProcess.map(({ file }) => {
        return file.destroy().catch(() => {});
      }),
    );

    throw error;
  }
}

/**
 * Clean up attachment when model instance is deleted
 */
async function cleanupAttachment(instance: LucidRow) {
  const ModelConstructor = instance.constructor as LucidModel;
  if (!ModelConstructor.$attachments) {
    return;
  }

  /**
   * Collect all attachments to be cleaned
   */
  const promises: Promise<any>[] = [];

  Object.keys(ModelConstructor.$attachments).forEach((property) => {
    // Use type assertion for string indexing
    const file = instance[
      property as keyof LucidRow
    ] as AttachmentContract | null;
    if (!file) {
      return;
    }

    promises.push(file.destroy().catch(() => {}));
  });

  /**
   * Clean all files at once
   */
  await Promise.all(promises);
}

/**
 * Compute urls for the given model instance
 */
async function computeUrls(result: LucidRow | null) {
  await computeUrlsForMany([result].filter(Boolean) as LucidRow[]);
}

/**
 * Compute urls for the given model instances in pagination results
 */
async function computeUrlsForPagination(result: { all: () => LucidRow[] }) {
  await computeUrlsForMany(result.all());
}

/**
 * Compute urls for the given model instances
 */
async function computeUrlsForMany(models: LucidRow[]) {
  /**
   * Return early when no models
   */
  if (!models.length) {
    return;
  }

  const ModelConstructor = models[0].constructor as LucidModel;
  if (!ModelConstructor.$attachments) {
    return;
  }

  const promises: Array<Promise<any>> = [];

  /**
   * Collect all attachments for which we will compute urls
   */
  models.forEach((model) => {
    Object.keys(ModelConstructor.$attachments!).forEach((property) => {
      // Use type assertion for string indexing
      const file = model[
        property as keyof LucidRow
      ] as AttachmentContract | null;
      if (!file) {
        return;
      }

      const options = ModelConstructor.$attachments![property];
      if (options?.computeUrl) {
        promises.push(file.computeUrl().catch(() => {}));
      }
    });
  });

  /**
   * Compute all urls at once
   */
  await Promise.all(promises);
}
