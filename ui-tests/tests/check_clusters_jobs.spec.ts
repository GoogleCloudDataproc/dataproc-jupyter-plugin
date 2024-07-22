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

test.describe('Clusters tests.', () => {

    test('Can verify tabs and fileds on the page', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Clusters card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();

        // Wait till the page loads
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });

        // Check both Clusters and Jobs tabs are available
        await expect(page.getByRole('tabpanel').getByText('Clusters', { exact: true })).toBeVisible();
        await expect(page.getByRole('tabpanel').getByText('Jobs', { exact: true })).toBeVisible();

        // Check Create Cluster button is present
        await expect(page.getByRole('button', { name: 'Create cluster' })).toBeVisible();

        // Check search field is present
        await expect(page.getByPlaceholder('Filter Table')).toBeVisible();

        // Check list of clusters are displayed
        await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();
    });

    test('Can verify clusters table headers', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Clusters card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();

        // Wait till the page loads
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });

        // Check list of clusters is displayed on the page
        await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();

        // Check the column headers on Clusters tab
        await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Cluster image name', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Region', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Zone', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Total worker nodes', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Scheduled deletion', exact: true })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeVisible();
    });

    test('Can click on Cluster and validate the cluster details', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Clusters card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();

        // Wait till the page loads
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });


        // Capture first cluster name and perform a click
        const clusterName = await page.locator('//*[@class="cluster-name"]').nth(1).innerText();
        await page.locator('//*[@class="cluster-name"]').nth(1).click();

        // Wait till the page loads
        await page.getByText('Loading Cluster Details').waitFor({ state: "detached" });

        // Verify the details
        await expect(page.getByLabel('back-arrow-icon')).toBeVisible();
        await expect(page.getByText('Cluster details')).toBeVisible();
        await expect(page.getByRole('button', { name: 'START', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'STOP', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'VIEW CLOUD LOGS', exact: true })).toBeVisible();
        await expect(page.getByLabel('Clusters').getByText('Name', { exact: true })).toBeVisible();
        await expect(page.locator('//*[@class="cluster-details-value" and text()="' + clusterName + '"]')).toBeVisible();
        await expect(page.getByText('Cluster UUID', { exact: true })).toBeVisible();
        await expect(page.getByText('Type', { exact: true })).toBeVisible();
        await expect(page.getByText('Status', { exact: true })).toBeVisible();
        await expect(page.getByText('Jobs', { exact: true })).toBeVisible();

        // Wait till jobs loaded on the UI
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check submit button is displayed
        await expect(page.getByRole('button', { name: 'SUBMIT JOB', exact: true })).toBeVisible();

        const status = await page.getByText('No rows to display').isVisible();
        if (status == true) {
            await expect(page.getByText('No rows to display')).toBeVisible();
        } else {
            // Check all the table headers are displayed
            await expect(page.getByPlaceholder('Filter Table', { exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Job ID', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Region', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Type', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Start time', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Elapsed time', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Labels', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeVisible();
        }
    });

    test('Can start, restart, and stop the cluster', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

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
        test.setTimeout(5 * 60 * 1000);

        // Click on Google Cloud Resources - Clusters card
        await page
            .locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();

        // Click on Jobs tab
        await page.getByRole('tabpanel').getByText('Jobs', { exact: true }).click();

        // Wait till the page loads
        await page.getByText('Loading Jobs').waitFor({ state: "detached" });

        // Check submit button is displayed
        await expect(page.getByRole('button', { name: 'SUBMIT JOB', exact: true })).toBeVisible();

        const status = await page.getByText('No rows to display').isVisible();
        if (status == true) {
            await expect(page.getByText('No rows to display')).toBeVisible();
        } else {
            // Check list of jobs are displayed on the UI
            await expect(page.locator('//table[@class="clusters-list-table"]')).toBeVisible();

            // Check all the table headers are displayed
            await expect(page.getByPlaceholder('Filter Table', { exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Job ID', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Region', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Type', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Start time', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Elapsed time', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Labels', exact: true })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeVisible();
        }
    });

});