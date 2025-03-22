/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Assert } from "@japa/assert";

/**
 * Test context with the assert property
 */
export interface TestContext {
  assert: Assert;
  [key: string]: any;
}

/**
 * Generic model constructor type
 */
export interface ModelConstructor {
  $attachments: Record<string, any>;
  $columns: Record<string, any>;
  boot(): void;
  $addColumn(property: string, columnConfig: any): void;
  before(hookName: string, callback: Function): void;
  after(hookName: string, callback: Function): void;
  new (): any;
}

/**
 * Mock cleanup function type
 */
export type CleanupFunction = (callback: () => void | Promise<void>) => void;
