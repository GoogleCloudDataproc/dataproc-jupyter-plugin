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

test.describe('Serverless batch creation.', () => {

    test('Can verify tabs and back button', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Check both Batches and Sessions tabs are available
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Check list table is present on the page
        await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();

        // Click on Create Batch button
        await page.getByText('Create Batch').click();

        // Click on Back button
        await page.locator('.back-arrow-icon > .icon-white > svg > path').click();
    });

    test('Can verify Batchs tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Check both Batches and Sessions tabs are available
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Check search field is present
        await expect(page.getByPlaceholder('Filter Table')).toBeVisible();

        // Check the column headers on Batches tab are present
        await expect(page.getByRole('columnheader', { name: 'Batch ID' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Creation time' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Elapsed time' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    });

    test('Can verify Sessions tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Click on Session tab
        await page.getByText('Sessions', { exact: true }).click();

        // Wait till the page loads
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Check search field is present
        await expect(page.getByPlaceholder('Filter Table')).toBeVisible();

        // Check the column headers on Session tab are present
        await expect(page.getByRole('columnheader', { name: 'Session ID' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Creator' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Creation time' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Elapsed time' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    });

    test('Can create serverless batch', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        await page.getByText('Create Batch').click();

        // Capture the system generated Batch id for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Fill the required fields
        await page.getByLabel('Open', { exact: true }).first().click();
        await page.getByRole('option', { name: 'PySpark' }).click();

        await page.getByLabel('Main python file*').fill('gs://us-central1-test-am-5a4039ed-bucket/dataproc-notebooks/wrapper_papermill.py');

        await page.getByLabel('Service account').fill('411524708443-compute@developer.gserviceaccount.com');

        // Select the project
        await page.getByRole('combobox', { name: 'Project ID' }).click();
        await page.getByRole('combobox', { name: 'Project ID' }).fill('kokoro');
        await page.getByRole('option', { name: 'dataproc-kokoro-tests' }).click();
        await page.waitForTimeout(5000);

        // Select Metastore service
        await page.getByRole('combobox', { name: 'Metastore services' }).click();
        const firstOption = await page.getByRole('option').first();
        await firstOption.click();

        // Add Label
        await page.getByRole('button', { name: 'ADD LABEL' }).click();
        await page.getByLabel('Key 2*').fill('goog-dataproc-location');
        await page.getByLabel('Value 2').click();
        await page.getByLabel('Value 2').fill('us-central1');

        // Click on Submit and wait to display the confirmation message
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);

        await expect(page.getByText('Batch ' + batchId + ' successfully submitted')).toBeVisible();
    });

    test('Can click on Batch ID and validatet the Batch details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Capture first Batch ID and perform a Click
        const batchId = await page.getByRole('cell').first().innerText();
        const firstOption = await page.getByRole('cell').first();
        await firstOption.click();

        // Wait till the page loads
        await page.getByText('Loading Batch Details').waitFor({ state: "detached" });

        // Verify the details on the page
        await expect(page.locator('.back-arrow-icon > .icon-white > svg > path')).toBeVisible();
        await expect(page.locator('//*[@class="cluster-details-title" and text()="' + batchId + '"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'CLONE' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'DELETE' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'VIEW SPARK LOGS' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'VIEW CLOUD LOGS' })).toBeVisible();
        await expect(page.getByText('Batch ID', { exact: true })).toBeVisible();
        await expect(page.getByText('Batch UUID', { exact: true })).toBeVisible();
        await expect(page.getByText('Resource type', { exact: true })).toBeVisible();
        await expect(page.getByText('Status', { exact: true })).toBeVisible()
    });

    test('Can click on Session ID and validatet the Session details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Click on Session tab
        await page.getByText('Sessions', { exact: true }).click();

        // Wait till the page loads
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Capture first Batch ID and perform a Click
        const batchId = await page.getByRole('cell').first().innerText();
        const firstOption = await page.getByRole('cell').first();
        await firstOption.click();

        // Wait till the page loads
        await page.getByText('Loading Session Details').waitFor({ state: "detached" });

        // Verify the details on the page
        await expect(page.locator('.back-arrow-icon > .icon-white > svg > path')).toBeVisible();
        await expect(page.getByText('Session details', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Serverless').getByText('Name')).toBeVisible();
        await expect(page.getByText('UUID', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'TERMINATE' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'VIEW SPARK LOGS' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'VIEW CLOUD LOGS' })).toBeVisible();
        await expect(page.getByText('Status', { exact: true })).toBeVisible();
        await expect(page.getByText('Create time', { exact: true })).toBeVisible();
        await expect(page.getByText('Details', { exact: true })).toBeVisible();
    });

    test('Can delete a batch', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Get the first batch id
        const batchId = await page.getByRole('cell').first().innerText();

        // Delete the first batch and wait to get the confitmation message
        await page.getByLabel('Delete Job').first().click();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(5000);

        await expect(page.getByText('Batch ' + batchId + ' deleted successfully')).toBeVisible();
    });

    test('Can clone the batch and create new one', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Severless card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();

        // Wait till the page loads
        await page.getByText('Loading Batches').waitFor({ state: "detached" });

        // Click on first Batch ID
        const firstOption = await page.getByRole('cell').first();
        await firstOption.click();

        // Wait till the page loads
        await page.getByText('Loading Batch Details').waitFor({ state: "detached" });

        // Click on clone button
        await page.getByRole('button', { name: 'CLONE' }).click();

        // Get the new Batch ID
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Select the default network and wait to complete the loading
        await page.getByRole('combobox', { name: 'Primary network*' }).click();
        await page.getByRole('option', { name: 'default' }).click();
        await page.getByLabel('Loading Spinner').waitFor({ state: 'detached' })

        // Click on Submit button and wait to complete the process
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);

        await expect(page.getByText('Batch ' + batchId + ' successfully submitted')).toBeVisible();
    });
});