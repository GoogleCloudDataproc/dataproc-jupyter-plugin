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

    await page.waitForSelector('div[role="treeitem"].caret-icon.down');

    await page.locator('div[role="treeitem"].caret-icon.down').nth(1).click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page.locator('div[role="treeitem"].caret-icon.down').nth(1).click();

    // Check all dataset cells are visible on UI
    await page.getByText('Dataset info',{ exact: true }).isVisible();
    await expect(page.getByRole('cell', { name: 'Dataset ID' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Created' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Default table expiration' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Last modified' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Data location' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Default collation' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Default rounding mode' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Time travel window' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Storage billing model' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Case insensitive' })).toBeVisible();

    // Click on first table
    await page.locator('div[role="treeitem"][aria-level="2"]').first().click();

    // Check all table cells are visible on UI
    await page.getByText('Table info').isVisible();
    await expect(page.getByRole('cell', { name: 'Table ID' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Created' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Last modified' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Table expiration' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Data location' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Default collation' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Default rounding mode' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Case insensitive' })).toBeVisible();

    // Click on Schema tab and check all the fields are visible on UI
    await page.getByText('Schema', { exact: true }).click();
    await expect(page.getByText('Schema').nth(2)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Field name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Mode' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Key' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Collation' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Default Value' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Policy Tags' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Data Policies' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();

    // Click on Preview tab and check data is present or not
    await page.getByText('Preview', { exact: true }).click();

    await page.waitForTimeout(3000);
    const dataExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
    if (dataExists) {
      const rowCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
      expect(rowCount).toBeGreaterThan(0);

    } else {
      await page.waitForTimeout(1000);
      await expect(page.getByText('No rows to display')).toBeVisible();
    }

  } else {
    expect(response.enable_bigquery_integration).toBe(false);
  }
});