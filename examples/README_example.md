# Using Attachment Lite with AdonisJS 6

This document demonstrates how to use the `@adonisjs/attachment-lite` package with AdonisJS 6.

## Setting Up Your Model

First, set up your model with the attachment decorator:

```typescript
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { attachment, AttachmentContract } from '@adonisjs/attachment-lite'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  // Use the attachment decorator - don't use @column with it
  @attachment({
    disk: 'local', // Default disk to use
    folder: 'avatars', // Folder to store files in
    validateMime: true, // Validate MIME types
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif'] // Allowed MIME types
  })
  declare avatar: AttachmentContract | null
}
```

## Using in Controllers

### Creating an Attachment from a File Upload

```typescript
import { HttpContext } from '@adonisjs/core/http'
import { Attachment } from '@adonisjs/attachment-lite'
import User from '#models/user'

export default class UsersController {
  public async store({ request }: HttpContext) {
    const userData = request.only(['name', 'email'])
    const avatarFile = request.file('avatar')
    
    const user = new User()
    user.name = userData.name
    user.email = userData.email
    
    // Handle file upload if a file was provided
    if (avatarFile) {
      // Use the static fromFile method - this is the preferred approach
      user.avatar = await Attachment.fromFile(avatarFile)
      
      // Alternatively, you could do:
      // const avatar = new Attachment()
      // await avatar.fromFile(avatarFile)
      // user.avatar = avatar
    }
    
    await user.save()
    
    return user
  }
}
```

### Updating an Attachment

```typescript
public async update({ request, params }: HttpContext) {
  const user = await User.findOrFail(params.id)
  const userData = request.only(['name', 'email'])
  const avatarFile = request.file('avatar')
  
  user.name = userData.name || user.name
  user.email = userData.email || user.email
  
  if (avatarFile) {
    // This will automatically handle removing the old file when the model is saved
    user.avatar = await Attachment.fromFile(avatarFile)
  }
  
  await user.save()
  
  return user
}
```

### Removing an Attachment

```typescript
public async removeAvatar({ params }: HttpContext) {
  const user = await User.findOrFail(params.id)
  
  // Set to null to remove the attachment
  user.avatar = null
  
  await user.save()
  
  return { message: 'Avatar removed successfully' }
}
```

### Getting URLs for Attachments

```typescript
public async getProfile({ params }: HttpContext) {
  const user = await User.findOrFail(params.id)
  
  // If you need the URL for the avatar
  let avatarUrl = null
  
  if (user.avatar) {
    avatarUrl = await user.avatar.getUrl()
    
    // Or for a signed URL (for private disks)
    // avatarUrl = await user.avatar.getSignedUrl({ expiresIn: '1h' })
  }
  
  return {
    ...user.toJSON(),
    avatarUrl
  }
}
```

## Other Attachment Creation Methods

### From a File Path

```typescript
// Static method
const attachment = await Attachment.fromPath('/path/to/local/file.jpg', {
  folder: 'uploads'
})

// Instance method
const attachment = new Attachment()
await attachment.fromPath('/path/to/local/file.jpg')
```

### From a Buffer

```typescript
// Get a buffer from somewhere
const imageBuffer = fs.readFileSync('/path/to/image.jpg')

// Static method
const attachment = await Attachment.fromBuffer(imageBuffer, {
  filename: 'image.jpg',
  mimeType: 'image/jpeg',
  folder: 'images'
})

// Instance method
const attachment = new Attachment()
await attachment.fromBuffer(imageBuffer, {
  filename: 'image.jpg',
  mimeType: 'image/jpeg'
})
```

## MIME Type Validation

```typescript
// Check if the file's MIME type is in the allowed list
if (!attachment.validateMimeType({ 
  allowedMimes: ['image/jpeg', 'image/png'] 
})) {
  return { error: 'Invalid file type. Only JPEG and PNG images are allowed.' }
}
``` 