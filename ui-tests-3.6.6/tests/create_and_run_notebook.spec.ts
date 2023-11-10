/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test } from '@jupyterlab/galata';

test.describe('Create and run notebook', () => {
  test('Can create, attach and run print() command', async ({ page }) => {
    // This is a slow integration test because it waits for a session to spin up.
    test.setTimeout(5 * 60 * 1000);
    await page.getByRole('region', { name: 'notebook content' }).click();

    await page
      .locator('.jp-LauncherCard:visible', {
        hasText: 'Jupyter Plugin Kokoro Template on Serverless Spark (Remote)'
      })
      .click();

    // Wait for kernel to be ready (why unknown?  Is this a bug?)
    await page
      .locator('.jp-Notebook-ExecutionIndicator[data-status="starting"]')
      .waitFor({ timeout: 10000 });

    await page.getByLabel('notebook content').locator('pre').first().click();
    await page.getByRole('textbox').nth(1).fill("print('test output')");

    await page.getByRole('menuitem', { name: 'Run', exact: true }).click();
    await page
      .getByRole('menuitem', { name: 'Run All Cells', exact: true })
      .click();

    await page
      .locator('.jp-OutputArea-output', { hasText: 'test output' })
      .waitFor({ timeout: 5 * 60 * 1000 });
  });
});
