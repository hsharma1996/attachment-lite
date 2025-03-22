# AdonisJS Attachment Lite

[![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

A lightweight attachment management package for AdonisJS that allows you to easily associate files with your Lucid models.

## Installation

```sh
npm i @adonisjs/attachment-lite
```

Configure the package using the `node ace` command:

```sh
node ace add:attachment-lite
```

This command will:
- Add the provider to your `adonisrc.ts` file
- Create a `config/attachment-lite.ts` configuration file

## Usage

### Configuration

The default configuration is as follows:

```ts
import { defineConfig } from '@adonisjs/attachment-lite'

export default defineConfig({
  disk: 'local',
  defaultFolder: 'uploads',
  validateMimeTypes: true,
})
```

You can modify these settings based on your application needs.

### Defining Attachments

Use the `@attachment` decorator to define attachment properties on your Lucid models:

```ts
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { attachment } from '@adonisjs/attachment-lite'
import type { AttachmentContract } from '@adonisjs/attachment-lite/types'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @attachment()
  declare avatar: AttachmentContract | null
}
```

### Creating Attachments

You can create attachments from uploaded files:

```ts
import { Attachment } from '@adonisjs/attachment-lite'

// In your controller
public async update({ request, auth }) {
  const user = auth.user!
  const avatar = request.file('avatar')
  
  if (avatar) {
    // Create attachment from file
    const attachment = new Attachment()
    await attachment.fromFile(avatar)
    
    user.avatar = attachment
    await user.save()
  }
  
  return user
}
```

### Handling Attachments

The package automatically:
- Stores files when a new attachment is set
- Deletes old files when an attachment is replaced
- Deletes files when a model is deleted
- Computes URLs for attachments when models are fetched

### Custom Disk & Folder

You can specify a custom disk and folder for each attachment:

```ts
@attachment({
  disk: 's3',
  folder: 'profile-pictures',
  computeUrl: true
})
declare avatar: AttachmentContract | null
```

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@adonisjs/attachment-lite.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@adonisjs/attachment-lite

[license-image]: https://img.shields.io/npm/l/@adonisjs/attachment-lite?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]: "typescript"
