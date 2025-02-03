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

import { expect, test, galata } from '@jupyterlab/galata';
import { Locator } from '@playwright/test';

test.describe('Serverless batches and sessions.', () => {

    // Helper function to navigate to the Serverless page and wait for it to load
    async function navigateToServerless(page) {
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Serverless"]').click();
        await page.getByText('Loading Batches').waitFor({ state: "detached" });
    }

    // Function to validate all the fields whihc are common for different Batch types
    async function validateCommonFields(page) {
        await expect(page.getByLabel('Custom container image')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Specify a custom container image to add Java or Python dependencies not provided by the default container")]')).toBeVisible();
        await expect(page.getByLabel('Files', { exact: true })).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Files are included in the working directory of each executor. Can be a GCS file")]')).toBeVisible();
        await expect(page.getByLabel('Archive files')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Archive files are extracted in the Spark working directory. Can be a GCS file")]')).toBeVisible();
        await expect(page.getByLabel('Arguments')).toBeVisible();
        await expect(page.getByText('Execution Configuration')).toBeVisible();
        await expect(page.getByLabel('Service account')).toBeVisible();
        await expect(page.getByText('Network Configuration')).toBeVisible();
        await expect(page.getByText('Establishes connectivity for the VM instances in this cluster.')).toBeVisible();

        // Check Network Configuration 2 radio buttons
        await expect(page.locator('//div[@class="create-runtime-radio"]/div[text()="Networks in this project"]')).toBeVisible();
        await expect(page.locator('//div[@class="create-batch-message" and contains(text(),"Networks shared from host project")]')).toBeVisible();

        // Check by default 'Networks in this project' radio button is checked
        await expect(page.locator('//div[@class="create-runtime-radio"]//input[@value="projectNetwork"]')).toBeChecked();

        // Check Primary network and subnetwork fields having value 'default'
        await expect(page.locator('//label[text()="Primary network*"]/following-sibling::div//input[@value="default"]')).toBeVisible();
        await expect(page.locator('//label[text()="subnetwork"]/following-sibling::div//input[@value="default"]')).toBeVisible();

        await expect(page.getByLabel('Network tags')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Network tags are text attributes you can add to make firewall rules")]')).toBeVisible();

        // Check Encryption section
        await expect(page.getByText('Encryption', { exact: true })).toBeVisible();
        await expect(page.getByText('Google-managed encryption key')).toBeVisible();
        await expect(page.getByText('No configuration required')).toBeVisible();
        await expect(page.getByText('Customer-managed encryption key (CMEK)')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Google Cloud Key Management Service")]')).toBeVisible();

        // Check by default 'Google-managed encryption key' radio button is checked
        await expect(page.locator('//div[@class="create-batch-radio"]//input[@value="googleManaged"]').first()).toBeChecked();

        // Check Peripheral Configuration section
        await expect(page.getByText('Peripheral Configuration')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Configure Dataproc to use Dataproc Metastore as its Hive metastore")]')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"We recommend this option to persist table metadata when the batch finishes processing")]')).toBeVisible();

        // Check History server cluster section
        await expect(page.getByText('History server cluster').first()).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Choose a history server cluster to store logs in.")]')).toBeVisible();
        await expect(page.locator('//label[text()="History server cluster"]/following-sibling::div/input[@role="combobox"]')).toBeVisible();

        // Check Properties section
        await expect(page.getByText('Properties', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'ADD PROPERTY' })).toBeVisible();

        // Check labels section
        await expect(page.getByText('Labels')).toBeVisible();
        await expect(page.locator('//label[text()="Key 1*"]/following-sibling::div/input[@value="client"]')).toBeVisible();
        await expect(page.locator('//label[text()="Value 1"]/following-sibling::div/input[@value="dataproc-jupyter-plugin"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'ADD LABEL' })).toBeVisible();
    }

    test('Sanity: Can verify tabs and back button', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Verify the presence of Batches and Sessions tabs
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Click on Create Batch button and then Back button
        await page.getByText('Create Batch').click();
        await expect(page.getByText('Batch info')).toBeVisible()
        await page.locator('.back-arrow-icon > .icon-white > svg > path').click();
        await expect(page.getByText('Batch info')).not.toBeVisible();
    });

    test('Sanity: Can verify batches tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Verify the presence of Batches and Sessions tabs
        await expect(page.getByText('Batches', { exact: true })).toBeVisible();
        await expect(page.getByText('Sessions', { exact: true })).toBeVisible();

        // Check if Bathes table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Verify the presence of search field and column headers on Batches tab
            await expect(page.getByPlaceholder('Filter Table')).toBeVisible();
            const headers = ['Batch ID', 'Status', 'Location', 'Creation time', 'Elapsed time', 'Type', 'Actions'];
            for (const header of headers) {
                await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
            }
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can click on Batch ID and validate the batch details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if Bathes table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

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
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate all the fields and create a serverless batch with PySpark type', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and click Create Batch button
        await navigateToServerless(page);
        await page.getByText('Create Batch').click();

        // Capture the generated Batch ID for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Select PySpark batch type
        await page.getByLabel('Open', { exact: true }).first().click();
        await page.getByRole('option', { name: 'PySpark' }).click();

        // Validate all expected fields with default values are displayed
        await expect(page.getByLabel('Runtime version*')).toBeVisible();
        await expect(page.getByLabel('Main python file*')).toBeVisible();
        await expect(page.locator('//*[@class="submit-job-message-input" and contains(text(),"Can be a GCS file with the gs:// prefix, an HDFS file on the")]')).toBeVisible();
        await expect(page.getByLabel('Main python file*')).toBeVisible();
        await expect(page.getByLabel('Additional python files')).toBeVisible();
        await expect(page.getByLabel('Jar files')).toBeVisible();

        // Check all the displayed fields on the page
        await validateCommonFields(page);

        // Enter all mandatory fields data to create a serverless batch
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
        await page.waitForTimeout(2000);
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can validate all the fields and create a serverless batch with type Spark', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and click Create Batch button
        await navigateToServerless(page);
        await page.getByText('Create Batch').click();

        // Capture the generated Batch ID for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Check Batch type is Spark by default
        const batchType = await page.getByLabel('Batch type*').inputValue();
        expect(batchType).toBe('Spark');

        // Validate all expected fields with default values are displayed
        await expect(page.getByLabel('Runtime version*')).toBeVisible();

        await expect(page.getByText('Main class', { exact: true })).toBeVisible();
        await expect(page.locator('//*[contains(text(),"The fully qualified name of a class in a provided or standard jar file, for example, com.example.wordcount.")]')).toBeVisible();
        await expect(page.locator('//div[@class="create-batch-radio"]//input[@value="mainClass"]')).toBeChecked;
        await expect(page.getByLabel('Main class*')).toBeVisible();
        await expect(page.getByText('Main jar URI')).toBeVisible();
        await expect(page.getByLabel('Jar files')).toBeVisible();

        // Check all the displayed fields on the page
        await validateCommonFields(page);

        // Enter all mandatory fields data to create a serverless batch
        await page.getByLabel('Main class*').fill('org.apache.spark.examples.SparkPi');

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
        await page.waitForTimeout(2000);
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can validate all the fields and create a serverless batch with type SparkR', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and click Create Batch button
        await navigateToServerless(page);
        await page.getByText('Create Batch').click();

        // Capture the generated Batch ID for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Select PySpark batch type
        await page.getByLabel('Open', { exact: true }).first().click();
        await page.getByRole('option', { name: 'SparkR' }).click();

        // Validate all expected fields with default values are displayed
        await expect(page.getByLabel('Runtime version*')).toBeVisible();
        await expect(page.getByLabel('Main R file*')).toBeVisible();
        await expect(page.locator('//*[@class="submit-job-message-input" and contains(text(),"Can be a GCS file with the gs://")]')).toBeVisible();

        // Check all the displayed fields on the page
        await validateCommonFields(page);

        // Enter all mandatory fields data to create a serverless batch
        await page.getByLabel('Main R file*').fill('gs://dataproc-extension/DO NOT DELETE/helloworld.r');

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
        await page.waitForTimeout(2000);
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can validate all the fields and create a serverless batch with type SparkSql', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and click Create Batch button
        await navigateToServerless(page);
        await page.getByText('Create Batch').click();

        // Capture the generated Batch ID for validation
        const batchId = await page.getByLabel('Batch ID*').inputValue();

        // Select PySpark batch type
        await page.getByLabel('Open', { exact: true }).first().click();
        await page.getByRole('option', { name: 'SparkSql' }).click();

        // Validate all expected fields with default values are displayed
        await expect(page.getByLabel('Query file*')).toBeVisible();
        await expect(page.locator('//*[@class="create-messagelist" and contains(text(),"Can be a GCS file with the gs://")]').first()).toBeVisible();

        // Check all the displayed fields on the page
        await expect(page.getByLabel('Custom container image')).toBeVisible();
        await expect(page.locator('//*[contains(text(),"Specify a custom container image to add Java or Python dependencies not provided by the default container")]')).toBeVisible();
        await expect(page.getByLabel('Jar files')).toBeVisible();
        await expect(page.locator('//*[@class="create-messagelist" and contains(text(),"Jar files are included in the CLASSPATH. Can be a GCS")]')).toBeVisible();

        // Enter all mandatory fields data to create a serverless batch
        await page.getByLabel('Query file*').fill('gs://dataproc-extension/DO NOT DELETE/sampleSQL.sql');

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
        await page.waitForTimeout(2000);
        await page.getByLabel('submit Batch').click();
        await page.waitForTimeout(5000);
        await expect(page.getByText(`Batch ${batchId} successfully submitted`)).toBeVisible();
    });

    test('Can delete a batch using actions delete icon', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if Bathes table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Get the first batch ID and delete it
            const batchId = await page.getByRole('cell').first().innerText();
            await page.getByLabel('Delete Job').first().click();

            // Confirm deletion and verify success message
            await expect(page.getByText(`This will delete ${batchId} and cannot be undone.`)).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await page.waitForTimeout(5000);
            await expect(page.getByText(`Batch ${batchId} deleted successfully`)).toBeVisible();
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can delete a batch from batch details page', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if Bathes table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Capture and click the first Batch ID
            const batchId = await page.getByRole('cell').first().innerText();
            await page.getByRole('cell').first().click();

            // Click the delete button, confirm deletion, and verify success message
            await page.getByRole('button', { name: 'DELETE', exact: true }).click();
            await expect(page.getByText(`This will delete ${batchId} and cannot be undone.`)).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await page.waitForTimeout(5000);
            await expect(page.getByText(`Batch ${batchId} deleted successfully`)).toBeVisible();
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can clone the batch and create a new one', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if Bathes table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

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
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Sanity: Can verify sessions tab table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if Sessions table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Click on Sessions tab and wait for it to load
            await page.getByText('Sessions', { exact: true }).click();
            await page.getByText('Loading Sessions').waitFor({ state: "detached" });

            // Verify search field and column headers on Sessions tab
            await expect(page.getByPlaceholder('Filter Table')).toBeVisible();
            const headers = ['Session ID', 'Status', 'Location', 'Creator', 'Creation time', 'Elapsed time', 'Actions'];
            for (const header of headers) {
                await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
            }
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can click on Session ID and validate the session details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and switch to Sessions tab
        await navigateToServerless(page);
        await page.getByText('Sessions', { exact: true }).click();

        // Wait for Sessions to load
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Check if Sessions table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

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
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can delete a session', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page and switch to Sessions tab
        await navigateToServerless(page);
        await page.getByText('Sessions', { exact: true }).click();

        // Wait till the page loads
        await page.getByText('Loading Sessions').waitFor({ state: "detached" });

        // Check if Sessions table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Get the first session id
            const sessionId = await page.getByRole('cell').first().innerText();

            // Delete the first session
            await page.getByTitle('Delete Session').first().click();

            // Verify the text on confirmation popup and click on delete option
            await expect(page.getByText('This will delete ' + sessionId + ' and cannot be undone.')).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await page.waitForTimeout(5000);
            await expect(page.getByText('Session ' + sessionId + ' deleted successfully')).toBeVisible();
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Check pagination in serverless batches tab', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToServerless(page);

        // Check if pagination is visible on the page
        const paginationLocator = page.locator('//div[@class="pagination-parent-view"]');
        const isPaginationVisible = await paginationLocator.isVisible();

        // Function to validate row count
        const validateRowCount = async (tableRowsLocator: Locator, expectedCount: number) => {
            const rowCount = await tableRowsLocator.count();
            expect(rowCount).toBeLessThanOrEqual(expectedCount);
        };

        // Function to change rows per page and validate
        const changeRowsPerPageAndValidate = async (paginationLocator: Locator, tableRowsLocator: Locator, newRowsPerPage: number) => {
            let currentRowsPerPage = await paginationLocator.locator('input').getAttribute('value');
            await page.getByText(currentRowsPerPage!, { exact: true }).click();
            await page.getByRole('option', { name: String(newRowsPerPage) }).click();
            await page.waitForTimeout(2000);
            await validateRowCount(tableRowsLocator, newRowsPerPage);
        };

        // Function to navigate and validate row count
        const navigateAndValidate = async (buttonLocator: Locator, tableRowsLocator: Locator, expectedCount: number) => {
            await buttonLocator.click();
            await page.waitForTimeout(2000);
            await validateRowCount(tableRowsLocator, expectedCount);
        };

        // Function to validate the range
        const validateRange = async (pageRange: Locator, expectedStart: number, expectedEnd: number) => {
            const rangeText = await pageRange.textContent();
            const [currentRange, totalCount] = rangeText!.split(" of ");
            const [start, end] = currentRange.split(" - ").map(Number);
            expect(start).toBe(expectedStart);
            expect(end).toBeLessThanOrEqual(expectedEnd);
        };

        if (isPaginationVisible) {
            const tableRowsLocator = page.locator('//tbody[@class="clusters-table-body"]/tr[@role="row"]');

            // Verify the default row count and selected pagination number
            await validateRowCount(tableRowsLocator, 50);
            let currentRowsPerPage = await paginationLocator.locator('input').getAttribute('value');
            expect(currentRowsPerPage).toBe('50');

            // Change rows per page to 100 and validate
            await changeRowsPerPageAndValidate(paginationLocator, tableRowsLocator, 100);

            // Change rows per page to 200 and validate
            await changeRowsPerPageAndValidate(paginationLocator, tableRowsLocator, 200);

            // Change back rows per page to 50
            await changeRowsPerPageAndValidate(paginationLocator, tableRowsLocator, 50);

            // Validate pagination controls
            const leftArrow = page.locator('//div[contains(@class,"page-move-button")]').first();
            const rightArrow = page.locator('//div[contains(@class,"page-move-button")]').nth(1);
            const pageRange = page.locator('//div[@class="page-display-part"]');

            // Validate the displayed row range and total count
            let rangeText = await pageRange.textContent();
            let [currentRange, totalCount] = rangeText!.split(" of ");

            if (parseInt(totalCount) > 50) {

                // Validate the initial range
                await validateRange(pageRange, 1, 50);

                // Navigate to the next page using the right arrow and validate
                await navigateAndValidate(rightArrow, tableRowsLocator, 50);

                // Validate the range after clicking right arrow
                await validateRange(pageRange, 51, 100);

                // Navigate to the previous page using the left arrow and validate
                await navigateAndValidate(leftArrow, tableRowsLocator, 50);

                // Validate the range after clicking left arrow
                await validateRange(pageRange, 1, 50);
            }
        } else {
            // If the pagination view not present in the page
            expect(isPaginationVisible).toBe(false);
        }
    });
});

