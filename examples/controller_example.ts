/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Attachment } from '../index.js'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Example controller showing how to use attachment-lite with AdonisJS 6
 */
export default class UsersController {
  /**
   * Create a new user with avatar
   */
  public async store({ request }: HttpContext) {
    // Get the file from the request
    const avatar = request.file('avatar')
    
    // Validate the file
    if (!avatar) {
      return { error: 'No avatar file provided' }
    }
    
    // Create a User model (replace with your actual model)
    const user = {} // new User()
    
    try {
      // Use the static fromFile method with await
      const attachment = await Attachment.fromFile(avatar, {
        disk: 'local', 
        folder: 'avatars',
        allowedMimes: ['image/jpeg', 'image/png', 'image/gif']
      })
      
      // Validate the MIME type
      if (!attachment.validateMimeType()) {
        return { error: 'Invalid file type. Please upload a JPG, PNG, or GIF image.' }
      }
      
      // Set the attachment on the model
      // user.avatar = attachment
      
      // Save the model which will also store the attachment
      // await user.save()
      
      // Instead of saving, we'll just store the attachment for this example
      await attachment.store()
      
      // Get the URL for the stored attachment
      const url = await attachment.getUrl()
      
      return {
        success: true,
        message: 'File uploaded successfully',
        url: url
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to upload file',
        error: error.message
      }
    }
  }
  
  /**
   * Update a user's avatar
   */
  public async updateAvatar({ request, params }: HttpContext) {
    const avatar = request.file('avatar')
    
    if (!avatar) {
      return { error: 'No avatar file provided' }
    }
    
    try {
      // Create an attachment with the async method
      const attachment = await Attachment.fromFile(avatar, {
        folder: 'avatars',
        allowedMimes: ['image/jpeg', 'image/png', 'image/gif']
      })
      
      // Find the user (replace with your actual code)
      // const user = await User.findOrFail(params.id)
      // user.avatar = attachment
      // await user.save()
      
      // For this example, manually store it
      await attachment.store()
      
      return {
        success: true,
        message: 'Avatar updated successfully',
        url: await attachment.getUrl()
      }
    } catch (error) {
      return {
        success: false, 
        message: 'Failed to update avatar',
        error: error.message
      }
    }
  }
} 