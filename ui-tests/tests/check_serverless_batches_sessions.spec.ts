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

test.describe('Serverless batches and sessions.', () => {

    // Helper function to navigate to the Serverless page and wait for it to load
    async function navigateToServerless(page) {
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();
        await page.getByText('Loading Batches').waitFor({ state: "detached" });
    }

    test('Can verify tabs and back button', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Verify the presence of Batches and Sessions tabs
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Verify the presence of the list table
        await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();

        // Click on Create Batch button and then Back button
        await page.getByText('Create Batch').click();
        await page.locator('.back-arrow-icon > .icon-white > svg > path').click();
    });

    test('Can verify batches tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Verify the presence of Batches and Sessions tabs
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Verify the presence of search field and column headers on Batches tab
        await expect(page.getByPlaceholder('Filter Table')).toBeVisible();
        const headers = ['Batch ID', 'Status', 'Location', 'Creation time', 'Elapsed time', 'Type', 'Actions'];
        for (const header of headers) {
            await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
        }
    });

    test('Can click on Batch ID and validate the batch details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Capture and click the first Batch ID
        const batchId = await page.getByRole('cell').first().innerText();
        await page.getByRole('cell').first().click();

        // Wait till Batch Details page loads
        await page.getByText('Loading Batch Details').waitFor({ state: "detached" });

        // Verify the batch details
        await expect(page.locator('.back-arrow-icon > .icon-white > svg > path')).toBeVisible();
        await expect(page.locator(`//*[@class="cluster-details-title" and text()="${batchId}"]`)).toBeVisible();
        const buttons = ['CLONE', 'DELETE', 'VIEW SPARK LOGS', 'VIEW CLOUD LOGS'];
        for (const button of buttons) {
            await expect(page.getByRole('button', { name: button, exact: true })).toBeVisible();
        }
        const texts = ['Batch ID', 'Batch UUID', 'Resource type', 'Status', 'Details', 'Properties', 'Environment config'];
        for (const text of texts) {
            await expect(page.getByText(text, { exact: true })).toBeVisible();
        }
    });

    test('Can create serverless batch', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and click Create Batch button
        await navigateToServerless(page);
        await page.getByText('Create Batch').click();

        // Capture the generated Batch ID for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Fill required fields for batch creation
        await page.getByLabel('Open', { exact: true }).first().click();
        await page.getByRole('option', { name: 'PySpark' }).click();
        await page.getByLabel('Main python file*').fill('gs://us-central1-test-am-5a4039ed-bucket/dataproc-notebooks/wrapper_papermill.py');

        // Select the project
        await page.getByRole('combobox', { name: 'Project ID' }).click();
        await page.getByRole('combobox', { name: 'Project ID' }).fill('kokoro');
        await page.getByRole('option', { name: 'dataproc-kokoro-tests' }).click();
        await page.waitForTimeout(5000);

        // Select Metastore service
        await page.getByRole('combobox', { name: 'Metastore services' }).click();
        await page.getByRole('option').first().click();

        // Add Label
        await page.getByRole('button', { name: 'ADD LABEL' }).click();
        await page.getByLabel('Key 2*').fill('goog-dataproc-location');
        await page.getByLabel('Value 2').fill('us-central1');

        // Submit the batch and verify confirmation message
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can delete a batch using actions delete icon', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Get the first batch ID and delete it
        const batchId = await page.getByRole('cell').first().innerText();
        await page.getByLabel('Delete Job').first().click();

        // Confirm deletion and verify success message
        await expect(page.getByText(`This will delete ${batchId} and cannot be undone.`)).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} deleted successfully`)).toBeVisible();
    });

    test('Can delete a batch from batch details page', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Capture and click the first Batch ID
        const batchId = await page.getByRole('cell').first().innerText();
        await page.getByRole('cell').first().click();

        // Click the delete button, confirm deletion, and verify success message
        await page.getByRole('button', { name: 'DELETE', exact: true }).click();
        await expect(page.getByText(`This will delete ${batchId} and cannot be undone.`)).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} deleted successfully`)).toBeVisible();
    });

    test('Can clone the batch and create a new one', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Click on first Batch ID
        await page.getByRole('cell').first().click();

        // Wait till the Batch Details page loads
        await page.getByText('Loading Batch Details').waitFor({ state: "detached" });

        // Click on clone button, select network, and submit new batch
        await page.getByRole('button', { name: 'CLONE' }).click();
        const batchId = await page.getByLabel('Batch ID*').inputValue();
        await page.getByRole('combobox', { name: 'Primary network*' }).click();
        await page.getByRole('option', { name: 'default' }).click();
        await page.getByLabel('Loading Spinner').waitFor({ state: 'detached' });
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can verify sessions tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Click on Sessions tab and wait for it to load
        await page.getByText('Sessions', { exact: true }).click();
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Verify search field and column headers on Sessions tab
        await expect(page.getByPlaceholder('Filter Table')).toBeVisible();
        const headers = ['Session ID', 'Status', 'Location', 'Creator', 'Creation time', 'Elapsed time', 'Actions'];
        for (const header of headers) {
            await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
        }
    });

    test('Can click on Session ID and validate the session details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and switch to Sessions tab
        await navigateToServerless(page);
        await page.getByText('Sessions', { exact: true }).click();
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Wait for Sessions to load
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Click on first session id
        await page.getByRole('cell').first().click();

        // Wait for Session Details to load
        await page.getByText('Loading Session Details').waitFor({ state: "detached" });

        // Verify the session details
        await expect(page.locator('.back-arrow-icon > .icon-white > svg > path')).toBeVisible();
        await expect(page.getByLabel('Serverless').getByText('Name', { exact: true })).toBeVisible();
        const expectedTexts = [
            'Session details', 'UUID', 'Status', 'Create time', 'Details'
        ];
        for (const text of expectedTexts) {
            await expect(page.getByText(text, { exact: true })).toBeVisible();
        }
        const expectedButtons = ['TERMINATE', 'VIEW SPARK LOGS', 'VIEW CLOUD LOGS'];
        for (const button of expectedButtons) {
            await expect(page.getByRole('button', { name: button, exact: true })).toBeVisible();
        }
    });

    test('Can delete a session', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and switch to Sessions tab
        await navigateToServerless(page);
        await page.getByText('Sessions', { exact: true }).click();

        // Wait till the page loads
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Get the first session id
        const sessionId = await page.getByRole('cell').first().innerText();

        // Delete the first session
        await page.getByTitle('Delete Session').first().click();

        // Verify the text on confirmation popup and click on delete option
        await expect(page.getByText('This will delete ' + sessionId + ' and cannot be undone.')).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).click();
        await page.waitForTimeout(5000);
        await expect(page.getByText('Session ' + sessionId + ' deleted successfully')).toBeVisible();
    });
});

