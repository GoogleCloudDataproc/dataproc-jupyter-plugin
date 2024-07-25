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

test.describe('Clusters tests', () => {

    // Set a common timeout for all tests
    const timeout = 5 * 60 * 1000;

    // Function to navigate to Clusters page
    async function navigateToClusters(page) {
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Clusters"]').click();
        await page.getByText('Loading Clusters').waitFor({ state: "detached" });
    }

    test('Can verify tabs and fields on the page', async ({ page }) => {
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

    test('Can verify clusters table headers', async ({ page }) => {
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

    test('Can click on Cluster and validate the cluster details', async ({ page }) => {
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

    test('Can start, restart, and stop the cluster', async ({ page }) => {
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
   //     await expect(page.getByRole('button', { name: 'SUBMIT JOB', exact: true })).toBeVisible();

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

});