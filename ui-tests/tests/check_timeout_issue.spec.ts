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

const numOfIterations = 20;

test.describe('Run a notebook multiple times', () => {

    for (let i = 1; i <= numOfIterations; i++) {
        test.only(`Test-1 Iteration ${i}: Can run print() command`, async ({ page }) => {
          
          // Set timeout for each test iteration
          test.setTimeout(10 * 60 * 1000);

          await page.getByRole('region', { name: 'notebook content' }).click();
          await page
            .locator('.jp-LauncherCard:visible', {
              hasText: 'Jupyter Plugin Kokoro Template on Serverless Spark (Remote)'
            })
            .click();
          const startTime = Date.now(); // Capture start time
          const firstCodeBox = page.locator('//div[@role="textbox"]/div').first();
          
          // Wait for kernel to be ready
          await page
            .locator('.jp-Notebook-ExecutionIndicator[data-status="starting"]')
            .waitFor({ timeout: 60000 });

          await firstCodeBox.click();
          await firstCodeBox.fill("print('test output')");
          await page.getByRole('menuitem', { name: 'Run', exact: true }).click();
          await page
            .getByRole('menuitem', { name: 'Run All Cells', exact: true })
            .click();
          await page
            .locator('.jp-OutputArea-output', { hasText: 'test output' })
            .waitFor({ timeout: 10 * 60 * 1000 });
     
          const endTime = Date.now(); // Capture end time
          const executionTime = (endTime - startTime) / 1000; // Convert to seconds
     
          console.log(`Iteration ${i}: Execution Time = ${executionTime} seconds`);
        });
      }
  });