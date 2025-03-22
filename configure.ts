/**
 * @adonisjs/attachment-lite
 *
 * @license MIT
 */

import type Configure from "@adonisjs/core/commands/configure";

/**
 * Configure the package on installation
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods();
  // Add provider to rc file
  await codemods.updateRcFile((rcFile: any) => {
    rcFile.addProvider("@adonisjs/attachment-lite/attachment_provider");
  });
}
