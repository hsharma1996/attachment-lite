/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * This example shows how to properly set up attachment-lite in an AdonisJS application
 * to avoid the "Drive not set for Attachment. Use Attachment.setDrive()" error.
 */

/**
 * RECOMMENDED APPROACH: Direct Drive Import
 * 
 * In your application's entry point (e.g., app.ts, main.ts, or in your start/kernel.ts):
 * 
 * ```typescript
 * import { Drive } from '@adonisjs/drive'
 * import { Attachment } from '@cn/attachment-lite'
 * 
 * // Set Drive directly - one line and done!
 * Attachment.setDrive(Drive)
 * ```
 * 
 * This ensures the Drive is set before any code tries to use Attachment.
 */

/**
 * ALTERNATIVE: Using the utility function
 * 
 * If you prefer using a helper function:
 * 
 * ```typescript
 * import { Drive } from '@adonisjs/drive'
 * import { setupAttachmentDrive } from '@cn/attachment-lite'
 * 
 * // One line setup with the helper function
 * setupAttachmentDrive(Drive)
 * ```
 */

/**
 * For specific components or controllers that use attachments, you can add a safety check:
 * 
 * ```typescript
 * import { Drive } from '@adonisjs/drive'
 * import { Attachment } from '@cn/attachment-lite'
 * 
 * class FileUploadController {
 *   constructor() {
 *     // Ensure Drive is set before handling any uploads
 *     try {
 *       Attachment.getDrive()
 *     } catch (error) {
 *       // Set it if not already set
 *       Attachment.setDrive(Drive)
 *     }
 *   }
 *   
 *   async upload({ request }) {
 *     // Your upload code...
 *     const file = request.file('file')
 *     const attachment = await Attachment.fromFile(file)
 *     await attachment.store()
 *   }
 * }
 * ```
 */

/**
 * Common Debugging Steps:
 * 
 * 1. Check if the provider is properly registered
 * 2. Verify that Drive is properly configured in your app
 * 3. If using a custom setup, ensure Drive is set before using attachments
 * 4. Check the load order of your providers (drive provider should load before attachment-lite)
 * 5. Try explicitly setting the Drive instance in your boot process
 */

// Quick fix for existing applications:
// In your main app file or in a provider:

/*
import { Drive } from '@adonisjs/core/services/drive'
import { Attachment } from '@adonisjs/attachment-lite'

// Set the drive instance directly
Attachment.setDrive(Drive)
*/ 