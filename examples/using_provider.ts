/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * This example shows how to use the attachment-lite provider in an AdonisJS 6 application
 */

/**
 * Step 1: Register the provider in your adonisrc.json file
 * 
 * ```json
 * {
 *   "providers": [
 *     // ... other providers
 *     "@cn/attachment-lite/providers/attachment_provider"
 *   ]
 * }
 * ```
 */

/**
 * Step 2: Use the attachment decorator in your Lucid models
 * 
 * ```typescript
 * // app/models/user.ts
 * import { BaseModel, column } from '@adonisjs/lucid/orm'
 * import { attachment } from '@cn/attachment-lite'
 * import type { AttachmentContract } from '@cn/attachment-lite/types'
 * 
 * export default class User extends BaseModel {
 *   @column({ isPrimary: true })
 *   declare id: number
 * 
 *   @attachment({
 *     disk: 'local',  // optional, uses default disk if not specified
 *     folder: 'avatars', // optional subfolder to store files
 *     preComputeUrl: true // optional, pre-compute URLs after DB queries
 *   })
 *   declare avatar: AttachmentContract | null
 * }
 * ```
 */

/**
 * Step 3: Use the attachment in your controllers
 * 
 * ```typescript
 * // app/controllers/users_controller.ts
 * import { HttpContext } from '@adonisjs/core/http'
 * import { Attachment } from '@cn/attachment-lite'
 * import User from '#models/user'
 * 
 * export default class UsersController {
 *   async store({ request }: HttpContext) {
 *     const avatar = request.file('avatar')
 *     
 *     if (!avatar) {
 *       return { error: 'No avatar file provided' }
 *     }
 *     
 *     // Create a new user
 *     const user = new User()
 *     
 *     // Create attachment from the uploaded file
 *     user.avatar = await Attachment.fromFile(avatar)
 *     
 *     // Save the model, which will also store the attachment
 *     await user.save()
 *     
 *     return { success: true, user }
 *   }
 *   
 *   async update({ request, params }: HttpContext) {
 *     const user = await User.findOrFail(params.id)
 *     const avatar = request.file('avatar')
 *     
 *     if (avatar) {
 *       // This will automatically handle removing the old file
 *       user.avatar = await Attachment.fromFile(avatar)
 *     }
 *     
 *     await user.save()
 *     
 *     return { success: true, user }
 *   }
 *   
 *   async delete({ params }: HttpContext) {
 *     const user = await User.findOrFail(params.id)
 *     
 *     // This will also delete the attachment file
 *     await user.delete()
 *     
 *     return { success: true }
 *   }
 * }
 * ```
 */

/**
 * Troubleshooting:
 * 
 * If you still get the "Drive not set for Attachment" error, you can manually set it
 * in a preload file:
 * 
 * ```typescript
 * // start/attachment.ts
 * import { Drive } from '@adonisjs/drive'
 * import { Attachment } from '@cn/attachment-lite'
 * 
 * export default function setupAttachment() {
 *   Attachment.setDrive(Drive)
 *   console.log('Drive manually set for Attachment')
 * }
 * 
 * // Don't forget to register this file in adonisrc.json:
 * // {
 * //   "preloads": [
 * //     {
 * //       "file": "./start/attachment",
 * //       "environment": ["web", "console", "test"]
 * //     }
 * //   ]
 * // }
 * ```
 */ 