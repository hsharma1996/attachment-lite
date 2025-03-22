/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configure, run } from '@japa/runner'
import { assert } from '@japa/assert'

// Extend TestContext interface to include assert
declare module '@japa/runner' {
  interface TestContext {
    assert: {
      isFunction: (value: any) => void;
      isTrue: (value: any, message?: string) => void;
      isFalse: (value: any, message?: string) => void;
      isString: (value: any, message?: string) => void;
      isObject: (value: any, message?: string) => void;
      isNull: (value: any, message?: string) => void;
      equal: (actual: any, expected: any, message?: string) => void;
      include: (haystack: any, needle: any, message?: string) => void;
      property: (obj: any, prop: string, message?: string) => void;
      instanceOf: (value: any, constructor: any, message?: string) => void;
      strictEqual: (actual: any, expected: any, message?: string) => void;
      isDefined: (value: any, message?: string) => void;
      exists: (value: any, message?: string) => void;
    }
  }
}

console.log('Starting test runner...')

// Configure the test runner
configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert()],
  timeout: 5000
})

// Run the tests
run()
