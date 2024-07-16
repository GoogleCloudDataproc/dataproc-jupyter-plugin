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

import { expect, test } from '@jupyterlab/galata';

test.describe('Create serverless notebook from launcher screen', () => {
    test('Can create serverless notebook', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Severless New Runtime Template
        await page
            .locator('.jp-LauncherCard:visible', {
                hasText: 'New Runtime Template'
            })
            .click();

        // Generate formatted current date string
        const now = new Date();
        const pad = (num: number) => String(num).padStart(2, '0');
        const dateTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}:${pad(now.getSeconds())}`;

        // Create template name
        const templateName = 'auto-test-' + dateTimeStr;

        // Fill in template details
        await page.getByLabel('Display name*').click();
        await page.getByLabel('Display name*').fill(templateName);
        await page.getByLabel('Description*').click();
        await page.getByLabel('Description*').fill('Testing');

        // Select the project
        await page.getByRole('combobox', { name: 'Project ID' }).click();
        await page.getByRole('combobox', { name: 'Project ID' }).fill('kokoro');
        await page.getByRole('option', { name: 'dataproc-kokoro-tests' }).click();
        await page.waitForTimeout(5000);

        // Select Metastore service
        await page.getByRole('combobox', { name: 'Metastore services' }).click();
        await page.waitForTimeout(2000);
        const firstOption = await page.getByRole('option').first();
        await firstOption.click();
        await page.waitForTimeout(2000);

        // Click on save button to create a notebook
        await page.getByText('SAVE', { exact: true }).click();
        await page.waitForTimeout(5000);

        // Check the notebook created confirmation message
        await expect(page.getByText('Runtime Template ' + templateName + ' successfully created')).toBeVisible();
    });
});
