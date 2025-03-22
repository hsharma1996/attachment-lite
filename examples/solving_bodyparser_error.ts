/*
 * @adonisjs/attachment-lite
 * 
 * Example showing how to solve the MultipartFile type incompatibility error
 */

import { Attachment } from '../index.js'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * This example demonstrates how to solve the error:
 * 
 * Argument of type 'import(".../node_modules/@adonisjs/bodyparser/...").MultipartFile' 
 * is not assignable to parameter of type 'import(".../node_modules/@adonisjs/bodyparser/...").MultipartFile'.
 * Property '#private' is missing in type...
 */
export default class WebsitesController {
  /**
   * Fixed version of the problematic code
   */
  public async store({ request }: HttpContext) {
    // This is the file from a different version of bodyparser
    const upload_cv = request.file('upload_cv')
    
    if (!upload_cv) {
      return { error: 'No file provided' }
    }
    
    try {
      // SOLUTION: Use await with fromFile
      // This properly resolves the type compatibility issue
      const resume = await Attachment.fromFile(upload_cv)
      
      // Now you can assign it to your model
      // model.file_resume = resume
      
      // For line 70 in websites_controller.ts where you had:
      // file_resume: Attachment.fromFile(payload.upload_cv),
      //
      // Change to:
      // First fetch the file outside the object:
      // const tempResume = await Attachment.fromFile(payload.upload_cv)
      // 
      // Then use it in your object:
      // {
      //   ...otherProperties,
      //   file_resume: tempResume,
      // }
      
      return { success: true, message: 'File attached successfully' }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to process file',
        error: error.message
      }
    }
  }
} 