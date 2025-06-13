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

test.describe('Clusters & Jobs tests', () => {

    // Set a common timeout for all tests
    const timeout = 5 * 60 * 1000;

    // Function to navigate to Clusters page
    async function navigateToClusters(page) {
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });
    }

    test('Sanity: Can verify tabs and fields on the page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page
        await navigateToClusters(page);

        // Verify Clusters and Jobs tabs
        await expect(page.getByRole('tabpanel').getByText('Clusters', { exact: true })).toBeVisible();
        await expect(page.getByRole('tabpanel').getByText('Jobs', { exact: true })).toBeVisible();

        // Verify Create Cluster button
        await expect(page.getByRole('button', { name: 'Create cluster' })).toBeVisible();

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Check search field is present
            await expect(page.getByPlaceholder('Filter Table')).toBeVisible();

            // Check list of clusters are displayed
            const rowCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
            expect(rowCount).toBeGreaterThan(0);
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Sanity: Can verify clusters table headers', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page
        await navigateToClusters(page);

        // Check clusters table headers if table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            const headers = [
                'Name', 'Status', 'Cluster image name', 'Region', 'Zone',
                'Total worker nodes', 'Scheduled deletion', 'Actions'
            ];
            for (const header of headers) {
                await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
            }
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Sanity: Can click on Cluster and validate the cluster details', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page
        await navigateToClusters(page);

        // Check if clusters table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            const clusterLocator = page.locator('//*[@class="cluster-name"]').nth(1);
            const clusterName = await clusterLocator.innerText();
            await clusterLocator.click();
            await page.getByText('Loading Cluster Details').waitFor({ state: "detached" });

            // Verify cluster details elements
            await expect(page.getByLabel('back-arrow-icon')).toBeVisible();
            await expect(page.getByText('Cluster details')).toBeVisible();
            await expect(page.getByRole('button', { name: 'START', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'VIEW CLOUD LOGS', exact: true })).toBeVisible();
            await expect(page.getByLabel('Clusters').getByText('Name', { exact: true })).toBeVisible();
            await expect(page.locator(`//*[@class="cluster-details-value" and text()="${clusterName}"]`)).toBeVisible();
            await expect(page.getByText('Cluster UUID', { exact: true })).toBeVisible();
            await expect(page.getByText('Type', { exact: true })).toBeVisible();
            await expect(page.getByText('Status', { exact: true })).toBeVisible();
            await expect(page.getByText('Jobs', { exact: true })).toBeVisible();

            // Wait for jobs to load and verify elements
            await page.getByText('Loading Jobs').waitFor({ state: "detached" });
            await expect(page.getByRole('button', { name: 'SUBMIT JOB', exact: true })).toBeVisible();

            const noRows = await page.getByText('No rows to display').isVisible();
            if (noRows) {
                await expect(page.getByText('No rows to display')).toBeVisible();
            } else {
                const jobHeaders = [
                    'Job ID', 'Status', 'Region', 'Type', 'Start time',
                    'Elapsed time', 'Labels', 'Actions'
                ];
                for (const header of jobHeaders) {
                    await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
                }
            }
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate Filter Table search field on cluster listing page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page
        await navigateToClusters(page);

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Capture first Job id
            const firstClusterLocator = page.locator('//*[@class="cluster-name"]').nth(1);
            const clusterName = await firstClusterLocator.innerText();

            await page.getByPlaceholder('Filter Table').fill(clusterName);

            // Check only one job is displayed
            const rowCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
            expect(rowCount).toEqual(2);

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test.skip('Can start, restart, and stop the cluster', async ({ page }) => {
        test.setTimeout(timeout);

        // Click on Google Cloud Resources - Clusters card
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();

        // Wait until the Clusters page loads
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });

        const parentLocator = page.locator('//tr[@class="cluster-list-data-parent"]');
        const noOfClusters = await parentLocator.count();

        for (let i = 0; i < noOfClusters; i++) {
            // Check if the current cluster's "Start Cluster" button is enabled
            const startEnabled = await parentLocator.nth(i).locator('//div[@title="Start Cluster"]').isEnabled();
            if (startEnabled) {
                // Start the cluster
                await startCluster(parentLocator.nth(i));

                // Restart the cluster
                await restartCluster(parentLocator.nth(i));

                // Stop the cluster
                await stopCluster(parentLocator.nth(i));
                break;
            }
        }

        // Function to start a cluster
        async function startCluster(clusterLocator) {
            await clusterLocator.locator('//div[@title="Start Cluster"]').click();
            await clusterLocator.getByText('stopped').waitFor({ state: "detached" });
            await clusterLocator.getByText('starting').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('running')).toBeVisible();
        }

        // Function to restart a cluster
        async function restartCluster(clusterLocator) {
            await expect(clusterLocator.locator('//div[@title="Restart Cluster"]')).toBeEnabled();
            await clusterLocator.locator('//div[@title="Restart Cluster"]').click();
            await clusterLocator.getByText('running').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('stopping')).toBeVisible();
            await clusterLocator.getByText('stopping').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('stopped')).toBeVisible();
            await clusterLocator.getByText('stopped').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('starting')).toBeVisible();
            await clusterLocator.getByText('starting').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('running')).toBeVisible();
        }

        // Function to stop a cluster
        async function stopCluster(clusterLocator) {
            await expect(clusterLocator.locator('//div[@title="Stop Cluster"]')).toBeEnabled();
            await clusterLocator.locator('//div[@title="Stop Cluster"]').click();
            await clusterLocator.getByText('running').waitFor({ state: "detached" });
            await clusterLocator.getByText('stopping').waitFor({ state: "detached" });
            await expect(clusterLocator.getByText('stopped')).toBeVisible();
        }
    });

    test('Can verify jobs table headers', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page
        await navigateToClusters(page);

        // Click on Jobs tab
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Verify Jobs tab elements and table headers
        await expect(page.getByRole('button', { name: 'SUBMIT JOB', exact: true })).toBeVisible();

        const noRows = await page.getByText('No rows to display').isVisible();
        if (noRows) {
            await expect(page.getByText('No rows to display')).toBeVisible();
        } else {
            await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();
            const jobHeaders = [
                'Job ID', 'Status', 'Region', 'Type', 'Start time',
                'Elapsed time', 'Labels', 'Actions'
            ];
            for (const header of jobHeaders) {
                await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
            }
        }
    });

    test('Can click on Job ID and validate the details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Click on first Job id
            const firstJobLocator = page.locator('//*[@class="cluster-name"]').nth(1);
            const jobName = await firstJobLocator.innerText();
            await firstJobLocator.click();

            // Wait for Job Details to load
            await page.getByText('Loading Job Details').waitFor({ state: "detached" });


            // Verify the Job details
            await expect(page.locator('//div[@class="back-arrow-icon"]')).toBeVisible();
            await expect(page.getByText('Job details')).toBeVisible();
            await expect(page.getByRole('button', { name: 'CLONE', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'DELETE', exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'VIEW SPARK LOGS', exact: true })).toBeVisible();
            await expect(page.getByText('Job ID')).toBeVisible();
            await expect(page.locator(`//*[@class="cluster-details-value" and text()="${jobName}"]`).first()).toBeVisible();
            await expect(page.getByText('Job UUID', { exact: true })).toBeVisible();
            await expect(page.getByText('Type', { exact: true })).toBeVisible();
            await expect(page.getByText('Status', { exact: true }).first()).toBeVisible();
            await expect(page.getByText('Configuration', { exact: true })).toBeVisible();
            await expect(page.getByRole('button', { name: 'EDIT' })).toBeVisible();
            await expect(page.getByText('Start time:')).toBeVisible();
            await expect(page.getByText('Elapsed time:')).toBeVisible();
            await expect(page.getByText('Status').nth(1)).toBeVisible();
            await expect(page.getByText('Region')).toBeVisible();
            await expect(page.getByText('Cluster', { exact: true })).toBeVisible();
            await expect(page.getByText('Job type')).toBeVisible();
            await expect(page.getByText('Labels', { exact: true })).toBeVisible();
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can verify clone a job from job details page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Click on first Job id
            const firstJobLocator = page.locator('//*[@class="cluster-name"]').nth(1);
            const jobName = await firstJobLocator.innerText();
            await firstJobLocator.click();

            // Wait for Job Details to load
            await page.getByText('Loading Job Details').waitFor({ state: "detached" });

            // Click on clone button
            await page.getByRole('button', { name: 'CLONE' }).click();

            // Capture job id and click on Submit button
            const jobId = await page.getByLabel('Job ID*').inputValue();
            await page.getByRole('button', { name: 'SUBMIT' }).click();

            await page.waitForTimeout(5000);
            await expect(page.getByText(`Job ${jobId} successfully submitted`)).toBeVisible();

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can verify clone a job from job listing page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Click on clone button
            await page.getByRole('button', { name: 'CLONE' }).first().click();

            // Capture job id and click on Submit button
            const jobId = await page.getByLabel('Job ID*').inputValue();
            await page.getByRole('button', { name: 'SUBMIT' }).click();

            await page.waitForTimeout(5000);
            await expect(page.getByText(`Job ${jobId} successfully submitted`)).toBeVisible();

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test.skip('Can delete a job using actions delete icon', async ({ page }) => { // Due to atribute aria-disabled="true", automation script not able to perform delete action
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Get the first job ID and click on delete option
            const jobhId = await page.getByRole('cell').first().innerText();
            await page.getByTitle('Delete Job').first().click();

            // Confirm deletion and verify success message
            await expect(page.getByText(`This will delete ${jobhId} and cannot be undone.`)).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await page.waitForTimeout(5000);
            await expect(page.getByText(`Job ${jobhId} deleted successfully`)).toBeVisible();

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }

    });

    test('Can delete a job from job details page', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Get the first job ID and delete it
            const jobhId = await page.getByRole('cell').first().innerText();
            await page.getByRole('cell').first().click();

            // Click the delete button, confirm deletion, and verify success message
            await page.getByRole('button', { name: 'DELETE', exact: true }).click();
            await expect(page.getByText(`This will delete ${jobhId} and cannot be undone.`)).toBeVisible();
            await page.getByRole('button', { name: 'Delete' }).click();
            await page.waitForTimeout(5000);
            await expect(page.getByText(`Job ${jobhId} deleted successfully`)).toBeVisible();

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    // Function to select the first cluster if available
    async function selectCluster(page) {
        await page.getByRole('combobox', { name: 'Cluster*' }).click();
        const noOfClusters = await page.getByRole('option').count();
        if (noOfClusters >= 1) {
            await page.getByRole('option').first().click();
            return true; // Cluster available
        } else {
            expect(noOfClusters).toBe(0);
            return false; // No clusters available
        }
    }

    // Function to fill the Labels section
    async function fillLabels(page) {
        await expect(page.getByText('Labels')).toBeVisible();
        await expect(page.locator('//label[text()="Key 1*"]/following-sibling::div/input[@value="client"]')).toBeVisible();
        await expect(page.locator('//label[text()="Value 1"]/following-sibling::div/input[@value="dataproc-jupyter-plugin"]')).toBeVisible();
        await page.getByRole('button', { name: 'ADD LABEL' }).click();
        await page.getByLabel('Key 2*').fill('goog-dataproc-location');
        await page.getByLabel('Value 2').fill('us-central1');
    }

    // Function to submit the job and validate submission
    async function submitJobAndValidate(page, jobId) {
        await page.getByRole('button', { name: 'SUBMIT' }).click();
        await page.waitForTimeout(5000); // Wait for submission to complete
        await expect(page.getByText(`Job ${jobId} successfully submitted`)).toBeVisible();
    }

    test('Can validate fields and create a Spark job', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to the Jobs tab
        await navigateToClusters(page);

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();

        if (tableExists) {
            await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

            // Click the SUBMIT JOB button
            await page.waitForTimeout(5000);
            await page.getByRole('button', { name: 'SUBMIT JOB', exact: true }).click();

            // select the first available clusters
            await page.getByRole('combobox', { name: 'Cluster*' }).click();
            await page.getByRole('option').first().click();

            // Capture Job ID and verify default job type
            const jobId = await page.getByLabel('Job ID*').inputValue();
            const jobType = await page.getByLabel('Job type*').inputValue();
            expect(jobType).toBe('Spark');

            // Verify fields
            await expect(page.getByLabel('Main class or jar*')).toBeVisible();
            await page.getByLabel('Main class or jar*').fill('gs://dataproc-extension/DO NOT DELETE/helloworld-2.0.jar');
            await expect(page.getByLabel('Jar files')).toBeVisible();
            await expect(page.getByLabel('Files', { exact: true })).toBeVisible();
            await expect(page.getByLabel('Archive files')).toBeVisible();
            await expect(page.getByLabel('Arguments')).toBeVisible();
            await expect(page.getByLabel('Max restarts per hour')).toBeVisible();

            // Fill the Labels section
            await fillLabels(page);

            // Submit the job and validate
            await submitJobAndValidate(page, jobId);
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate fields and create a SparkR job', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to the Jobs tab
        await navigateToClusters(page);

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();

        if (tableExists) {
            await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

            // Click the SUBMIT JOB button
            await page.waitForTimeout(5000);
            await page.getByRole('button', { name: 'SUBMIT JOB', exact: true }).click();

            // select the first available clusters
            await page.getByRole('combobox', { name: 'Cluster*' }).click();
            await page.getByRole('option').first().click();

            // Capture Job ID
            const jobId = await page.getByLabel('Job ID*').inputValue();

            // Change job type to SparkR
            await page.getByLabel('Open', { exact: true }).nth(1).click();
            await page.getByRole('option', { name: 'SparkR' }).click();

            // Verify fields and fill necessary inputs
            await expect(page.getByLabel('Main R file*')).toBeVisible();
            await page.getByLabel('Main R file*').fill('gs://dataproc-extension/DO NOT DELETE/helloworld.r');
            await expect(page.getByLabel('Files', { exact: true })).toBeVisible();
            await expect(page.getByLabel('Arguments')).toBeVisible();
            await expect(page.getByLabel('Max restarts per hour')).toBeVisible();

            // Fill the Labels section
            await fillLabels(page);

            // Submit the job and validate
            await submitJobAndValidate(page, jobId);
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate fields and create a SparkSql job', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to the Jobs tab
        await navigateToClusters(page);

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();

        if (tableExists) {
            await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

            // Click the SUBMIT JOB button
            await page.waitForTimeout(5000);
            await page.getByRole('button', { name: 'SUBMIT JOB', exact: true }).click();

            // select the first available clusters
            await page.getByRole('combobox', { name: 'Cluster*' }).click();
            await page.getByRole('option').first().click();

            // Capture Job ID
            const jobId = await page.getByLabel('Job ID*').inputValue();

            // Change job type to SparkSql
            await page.getByLabel('Open', { exact: true }).nth(1).click();
            await page.getByRole('option', { name: 'SparkSql' }).click();

            await expect(page.getByLabel('Jar files')).toBeVisible();
            await expect(page.getByLabel('Max restarts per hour')).toBeVisible();

            // Select query source type and enter query file
            await page.getByRole('combobox', { name: 'Query source type*' }).click();
            await page.getByRole('option', { name: 'Query file' }).click();
            await page.getByLabel('Query file*').fill('gs://dataproc-extension/DO NOT DELETE/sampleSQL.sql');

            // Fill the Labels section
            await fillLabels(page);

            // Submit the job and validate
            await submitJobAndValidate(page, jobId);
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate fields and create a PySpark job', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to the Jobs tab
        await navigateToClusters(page);

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();

        if (tableExists) {
            await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

            // Click the SUBMIT JOB button
            await page.waitForTimeout(5000);
            await page.getByRole('button', { name: 'SUBMIT JOB', exact: true }).click();

            // select the first available clusters
            await page.getByRole('combobox', { name: 'Cluster*' }).click();
            await page.getByRole('option').first().click();

            // Capture Job ID
            const jobId = await page.getByLabel('Job ID*').inputValue();

            // Change job type to PySpark
            await page.getByLabel('Open', { exact: true }).nth(1).click();
            await page.getByRole('option', { name: 'PySpark' }).click();

            // Verify fields
            await expect(page.getByLabel('Additional python files')).toBeVisible();
            await expect(page.getByLabel('Jar files')).toBeVisible();
            await expect(page.getByLabel('Files', { exact: true })).toBeVisible();
            await expect(page.getByLabel('Archive files')).toBeVisible();
            await expect(page.getByLabel('Arguments')).toBeVisible();
            await expect(page.getByLabel('Max restarts per hour')).toBeVisible();

            // Fill Main Python file and Labels
            await expect(page.getByLabel('Main Python file*')).toBeVisible();
            await page.getByLabel('Main Python file*').fill('gs://dataproc-extension/DO NOT DELETE/helloworld1.py');
            await fillLabels(page);

            // Submit the job and validate
            await submitJobAndValidate(page, jobId);
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Sanity: Can perform field validations', async ({ page }) => {
        test.setTimeout(timeout); // Set the test timeout

        // Navigate to the Jobs tab
        await navigateToClusters(page);

        // Check if cluster table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();

        if (tableExists) {
            await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

            // Click the SUBMIT JOB button
            await page.waitForTimeout(5000);
            await page.getByRole('button', { name: 'SUBMIT JOB', exact: true }).click();

            // Job ID field validation: Empty field should show error
            await page.getByLabel('Job ID*').fill('');
            await expect(page.getByText('ID is required')).toBeVisible(); // Error should appear for empty Job ID

            // Fill valid Job ID and check if error is hidden
            await page.getByLabel('Job ID*').fill('testJob');
            await expect(page.getByText('ID is required')).toBeHidden();

            // Main class or jar validation
            await page.getByLabel('Main class or jar*').fill('test');
            await page.getByText('ClusterChoose a cluster to').click(); // Trigger validation by clicking outside

            // Clear the field and expect an error message
            await page.getByLabel('Main class or jar*').fill('');
            await page.getByLabel('Jar files').click(); // Click to trigger validation
            await expect(page.getByText('Main class or jar is required')).toBeVisible(); // Error should appear

            // Refill the field and check if the error is hidden
            await page.getByLabel('Main class or jar*').fill('test');
            await expect(page.getByText('Main class or jar is required')).toBeHidden();

            // Jar files validation
            await page.getByLabel('Jar files').fill('test');
            await page.getByText('ClusterChoose a cluster to').click(); // Trigger validation
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeVisible();

            // Clear the invalid Jar files and check if the error is hidden
            await page.getByRole('button', { name: 'Clear' }).click();
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeHidden();

            // Files validation
            await page.getByLabel('Files', { exact: true }).fill('test');
            await page.getByText('ClusterChoose a cluster to').click();
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeVisible();

            // Clear and revalidate the Files field
            await page.getByRole('button', { name: 'Clear' }).click();
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeHidden();

            // Archive files validation
            await page.getByLabel('Archive files').fill('test');
            await page.getByText('ClusterChoose a cluster to').click();
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeVisible();

            // Clear and check if the error is hidden
            await page.getByRole('button', { name: 'Clear' }).click();
            await expect(page.locator("//*[contains(text(),'All files must include a valid scheme prefix: ')]")).toBeHidden();

            // Add property validation: Empty key should show an error
            await page.getByRole('button', { name: 'ADD PROPERTY' }).click();
            await expect(page.getByText('key is required')).toBeVisible(); // Key field should be required

            // Check if the ADD PROPERTY button is disabled
            let isDisabled = await page.getByRole('button', { name: 'ADD PROPERTY' }).getAttribute('class');
            expect(isDisabled).toContain('disabled'); // Button should be disabled initially

            // Fill the key field and ensure the error is hidden
            await page.getByLabel('Key 1*').first().fill('key');
            await expect(page.getByText('key is required')).toBeHidden(); // Error should disappear after entering the key

            // Click on the value field and ensure the ADD PROPERTY button is enabled
            await page.getByLabel('Value').first().click();
            isDisabled = await page.getByRole('button', { name: 'ADD PROPERTY' }).getAttribute('class');
            expect(isDisabled).not.toContain('disabled'); // Button should now be enabled
        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can validate Filter Table search field on jobs listing page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Clusters page and switch to Jobs tab
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check if jobs table data is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {

            // Capture first Job id
            const firstJobLocator = page.locator('//*[@class="cluster-name"]').nth(1);
            const jobName = await firstJobLocator.innerText();

            await page.getByPlaceholder('Filter Table').fill(jobName);

            // Check only one job is displayed
            const rowCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
            expect(rowCount).toEqual(2);

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Sanity: Check pagination in jobs tab', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Navigate to Serverless page
        await navigateToClusters(page);
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

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

            // Change rows per page to 50
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