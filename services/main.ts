/**
 * @adonisjs/attachment-lite
 *
 * @license MIT
 */

import app from "@adonisjs/core/services/app";
import { Attachment } from "../src/attachment.js";

let attachment: typeof Attachment;

// Initialize the attachment service after the app is booted
await app.booted(async () => {
  // Get the attachment service from the container
  // This will be registered in the provider
  attachment = await app.container.make("craftnotion/attachment-lite");
});

/**
 * Export the attachment service
 * Usage:
 * ```ts
 * import attachment from '@adonisjs/attachment-lite/services/main'
 * ```
 */
export { attachment as default };
