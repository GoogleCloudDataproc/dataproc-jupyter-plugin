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

import { test, expect } from '@jupyterlab/galata';

test('bigquery-dataset-explorer', async ({ page, request }) => {
  // Fetch Dataproc plugin settings
  const issues = await page.request.get('http://localhost:8888/dataproc-plugin/settings');
  expect(issues.ok()).toBeTruthy();

  // Parse response and check BigQuery integration is enabled
  const response = await issues.json();
  expect(response.enable_bigquery_integration).toBe(true);

  // Check if the "Dataset Explorer - BigQuery" tab is visible
  const tabExists = await page.isVisible('role=tab[name="Dataset Explorer - BigQuery"]');

  if (tabExists) {
    // Click on the "Dataset Explorer - BigQuery" tab
    await page.getByRole('tab', { name: 'Dataset Explorer - BigQuery' }).click();

    // Expand and navigate through the dataset tree
    await page.waitForSelector('div[role="treeitem"].caret-icon.down');
    await page.locator('div[role="treeitem"].caret-icon.down').nth(1).click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page.locator('div[role="treeitem"].caret-icon.down').nth(1).click();

    // Wait for the dataset details to load
    await page.getByText('Loading dataset details').waitFor({ state: "hidden" });

    // Check dataset details are visible
    await expect(page.getByText('Dataset info', { exact: true })).toBeVisible();
    const datasetRowHeaders = [
      'Dataset ID', 'Created', 'Default table expiration',
      'Last modified', 'Data location', 'Description', 'Default collation',
      'Default rounding mode', 'Time travel window', 'Storage billing model', 'Case insensitive'
    ];
    for (const header of datasetRowHeaders) {
      await expect(page.getByRole('cell', { name: header, exact: true })).toBeVisible();
    }

    // Click on the first table
    await page.locator('div[role="treeitem"][aria-level="2"]').first().click();

    // Wait for the table details to load
    await page.getByText('Loading table details').waitFor({ state: "hidden" });

    // Check table details are visible
    await expect(page.getByText('Table info')).toBeVisible();
    const tableHeaders = [
      'Table ID', 'Created', 'Last modified', 'Table expiration',
      'Data location', 'Default collation', 'Default rounding mode', 'Description', 'Case insensitive'
    ];
    for (const header of tableHeaders) {
      await expect(page.getByRole('cell', { name: header, exact: true })).toBeVisible();
    }

    // Click on the Schema tab and check all schema fields are visible
    await page.getByText('Schema', { exact: true }).click();
    await expect(page.getByText('Schema').nth(2)).toBeVisible();
    const schemaHeaders = [
      'Field name', 'Type', 'Mode', 'Key', 'Collation', 'Default Value',
      'Policy Tags', 'Data Policies', 'Description'
    ];
    for (const header of schemaHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }

    // Click on the Preview tab and check if data is present
    await page.getByText('Preview', { exact: true }).click();

    // Wait for the preview data to load
    await page.getByText('Loading Preview Data').waitFor({ state: "hidden" });

    // Check if data is present in the preview table
    const dataExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
    if (dataExists) {
      const rowCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
      expect(rowCount).toBeGreaterThan(0);
    } else {
      await expect(page.getByText('No rows to display')).toBeVisible();
    }

  } else {
    // If the tab doesn't exist, verify BigQuery integration is disabled
    expect(response.enable_bigquery_integration).toBe(false);
  }
});