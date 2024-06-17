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

test('bigquery-dataset-explorer', async ({ page }) => {
  const tabExists = await page.isVisible(
    'role=tab[name="Dataset Explorer - BigQuery"]'
  );
  if (tabExists) {
    await page
      .getByRole('tab', { name: 'Dataset Explorer - BigQuery' })
      .click();
    await page
      .locator('div:nth-child(2) > div > .caret-icon > .icon-white > svg')
      .first()
      .click();
    await page
      .locator(
        'div:nth-child(2) > div > .caret-icon > .icon-white > svg > g > path'
      )
      .first()
      .click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page
      .locator('div:nth-child(3) > div > .caret-icon > .icon-white > svg')
      .click();
    await page
      .locator(
        'div:nth-child(3) > div > .caret-icon > .icon-white > svg > g > path'
      )
      .click();
    await page.locator('div[role="treeitem"][aria-level="2"]').first().click();
    await page.getByText('Schema', { exact: true }).click();
    await page.getByText('Preview', { exact: true }).click();
    await page.getByText('Details').click();
  }
});
