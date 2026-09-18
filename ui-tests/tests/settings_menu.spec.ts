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

import { test, expect, galata } from '@jupyterlab/galata';

test.describe('Settings Menu', () => {
  test('Can find settings menu', async ({ page }) => {
    await page
      .getByLabel('main menu', { exact: true })
      .getByText('Settings')
      .click();
    const cloudSettings = page.getByText('Google Cloud Settings');
    await cloudSettings.click();
  });

  test('Can change project', async ({ page }) => {
    await page
      .getByLabel('main menu', { exact: true })
      .getByText('Settings')
      .click();
      const cloudSettings = page.getByText('Google Cloud Settings');
      await cloudSettings.click();

    // Assert clearing the Project ID disables the save button.
    await page.getByRole('combobox', { name: 'Project ID' }).click();
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Assert that we can save the project after we fill in project again.
    await page.getByRole('combobox', { name: 'Project ID' }).fill('kokoro');
    await page.getByRole('option', { name: 'dataproc-kokoro-tests' }).click();
    await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();

    // Do not actually save. Due to tests running in parallel, changing the project
    // can cause other tests to fail as their access tokens get revoked from
    // underneath them.
  });
  test('Renders SettingsLayout when enable_runtime_profile_integration flag is true', async ({ page }) => {
    // Mock the settings API response to enable the new UI
    await page.route('**/dataproc-plugin/settings*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enable_runtime_profile_integration: true })
      });
    });

    await page
      .getByLabel('main menu', { exact: true })
      .getByText('Settings')
      .click();
    const cloudSettings = page.getByText('Google Cloud Settings');
    await cloudSettings.click();

    // The SettingsLayout renders sidebar tabs instead of the standard config selection.
    // Verify the 'common' and 'spark' tabs or sidebar layout elements are visible.
    const commonTab = page.locator('.settings-tab').filter({ hasText: 'common' });
    await expect(commonTab).toBeVisible();
  });

  test('Renders ConfigSelection when enable_runtime_profile_integration flag is false', async ({ page }) => {
    // Mock the settings API response to disable the new UI
    await page.route('**/dataproc-plugin/settings*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enable_runtime_profile_integration: false })
      });
    });

    await page
      .getByLabel('main menu', { exact: true })
      .getByText('Settings')
      .click();
    const cloudSettings = page.getByText('Google Cloud Settings');
    await cloudSettings.click();

    // The ConfigSelection renders the old layout without the sidebar tabs.
    // Verify that the 'common' tab from SettingsLayout is not visible.
    const commonTab = page.locator('.settings-tab').filter({ hasText: 'common' });
    await expect(commonTab).toHaveCount(0);

    // Ensure the main configuration form title is visible (rendered by ConfigSelection)
    const projectHeader = page.getByText('Google Cloud Project Settings');
    await expect(projectHeader).toBeVisible();
  });
});
