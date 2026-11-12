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

import { test, expect } from '@jupyterlab/galata';

test.describe('Runtime Profile UI', () => {
  test('Create Runtime Profile - Add Label Input Focus', async ({ page }) => {
    // Wait for the launcher to be visible
    await page.locator('.jp-Launcher-body').waitFor();

    // Open the "Create Runtime Profile" page from the Launcher
    // Playwright automatically scrolls the element into view before clicking
    const card = page.locator('.jp-LauncherCard', {
      hasText: 'Create Runtime Profile'
    });
    await card.click();

    // Wait for the form to appear.
    // The title is "Create a runtime profile"
    await expect(
      page.locator('.cluster-details-title', {
        hasText: 'Create a runtime profile'
      })
    ).toBeVisible();

    // Expand "Additional configuration" and open "Other customizations" drawer
    await page.getByRole('button', { name: 'Additional configuration' }).click();
    await page
      .getByRole('button', { name: 'Edit Other customizations' })
      .click();

    // --- Test Spark Properties (Others) ---
    // Click "+ Add property" first
    const addPropertyButton = page.getByRole('button', {
      name: '+ Add property'
    });
    await addPropertyButton.click();

    // Find the container (parent of the button) to scope our search
    const propertiesSection = addPropertyButton.locator('..');

    // Count existing keys to determine the new key number
    const propKeyCount = await propertiesSection.getByLabel(/Key \d+/).count();
    const propKeyInput = propertiesSection.getByLabel(`Key ${propKeyCount}`);

    const testPropKey = 'test-property-key';
    await propKeyInput.click();
    await propKeyInput.type(testPropKey, { delay: 100 });
    await expect(propKeyInput).toHaveValue(testPropKey);

    // Test Value input
    const propValueInput = propertiesSection.getByLabel(
      `Value ${propKeyCount}`
    );
    const testPropValue = 'test-property-value';
    await propValueInput.click();
    await propValueInput.type(testPropValue, { delay: 100 });
    await expect(propValueInput).toHaveValue(testPropValue);

    // --- Test Labels ---
    // Click "+ Add label" first
    const addLabelButton = page.getByRole('button', { name: '+ Add label' });
    await addLabelButton.click();

    // Find the container (parent of the button) to scope our search
    const labelsSection = addLabelButton.locator('..');

    // Count existing keys to determine the new key number
    const labelKeyCount = await labelsSection.getByLabel(/Key \d+/).count();
    const labelKeyInput = labelsSection.getByLabel(`Key ${labelKeyCount}`);

    const testLabelKey = 'test-label-key';
    await labelKeyInput.click();
    await labelKeyInput.type(testLabelKey, { delay: 100 });
    await expect(labelKeyInput).toHaveValue(testLabelKey);

    // Test Value input
    const labelValueInput = labelsSection.getByLabel(`Value ${labelKeyCount}`);
    const testLabelValue = 'test-label-value';
    await labelValueInput.click();
    await labelValueInput.type(testLabelValue, { delay: 100 });
    await expect(labelValueInput).toHaveValue(testLabelValue);

    // Click Save button to save the property and labels
    await page.getByRole('button', { name: 'Save' }).click();

    // Validate the saved property and label on the "Other customizations" section
    const otherCustomizationsSection = page.locator(
      '.section-detail-wrapper',
      { hasText: 'Other customizations' }
    );
    await expect(
      otherCustomizationsSection.getByText(`${testPropKey}: ${testPropValue}`)
    ).toBeVisible();
    await expect(
      otherCustomizationsSection.getByText(
        `${testLabelKey}: ${testLabelValue}`
      )
    ).toBeVisible();
  });
});
