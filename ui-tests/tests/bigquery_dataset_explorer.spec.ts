/**
 * @license
 * Copyright 2024 Google LLC
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

import { test, expect, galata } from '@jupyterlab/galata';

test('bigquery-dataset-explorer', async ({ page, request }) => {
  const issues = await page.request.get(
    'http://localhost:8888/dataproc-plugin/settings'
  );
  expect(issues.ok()).toBeTruthy();
  const response: any = await issues.json();
  expect(response.enable_bigquery_integration).toBe(true);

  const tabExists = await page.isVisible(
    'role=tab[name="Dataset Explorer - BigQuery"]'
  );

  if (tabExists) {
    expect(response.enable_bigquery_integration).toBe(true);
    await page
      .getByRole('tab', { name: 'Dataset Explorer - BigQuery' })
      .click();

    // Wait for the Dataset projects to populate.
    await page.waitForSelector('div[role="treeitem"][aria-level="1"]');
    await page.waitForSelector('div[role="treeitem"].caret-icon.down');

    // Wait before clicking "Expand" to ensure consistency and avoid flaky issues 
    await page.waitForTimeout(4000);

    // Expand the first dataset project. This should always be the `bigquery-public-data` one.
    await page.locator('div[role="treeitem"].caret-icon.down').nth(0).click();

    // Wait for the first dataset to be displayed, and then expand it.
    await page.waitForSelector('div[role="treeitem"][aria-level="2"]');
    await page.waitForSelector('div[role="treeitem"].caret-icon.down');
    await page.locator('div[role="treeitem"].caret-icon.down').nth(0).click();

    // Click on the first table displayed.
    await page.locator('div[role="treeitem"][aria-level="3"]').first().click();
    await page.getByText('Schema', { exact: true }).click();
    await page.getByText('Preview', { exact: true }).click();
  } else {
    expect(response.enable_bigquery_integration).toBe(false);
  }
});
