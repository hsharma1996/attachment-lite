/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from "@japa/runner";
import { Attachment } from "../src/attachment.js";
import { attachment } from "../src/decorator/decorator.js";
import AttachmentProvider from "../providers/attachment_provider.js";
import type { TestContext } from "./types.js";

test.group("Exports", () => {
  test("Attachment class is exported", async ({ assert }: TestContext) => {
    assert.isFunction(Attachment);
  });

  test("attachment decorator is exported", async ({ assert }: TestContext) => {
    assert.isFunction(attachment);
  });

  test("AttachmentProvider is exported", async ({ assert }: TestContext) => {
    assert.isFunction(AttachmentProvider);
  });
});
