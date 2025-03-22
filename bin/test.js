"use strict";
/*
 * @adonisjs/attachment-lite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var runner_1 = require("@japa/runner");
var assert_1 = require("@japa/assert");
/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
*/
(0, runner_1.processCLIArgs)(process.argv.slice(2));
(0, runner_1.configure)({
    files: ['tests/**/*.spec.ts'],
    plugins: [(0, assert_1.assert)()],
    timeout: 5000, // 5 second timeout for tests
});
console.log('Starting test runner...');
(0, runner_1.run)();
