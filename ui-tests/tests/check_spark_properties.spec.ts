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

test.describe('Check all spark properties on Serverless Runtime Template', () => {
    test('Can check all spark properties are displayed', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Goto menu and click on Google setting
        await page
            .getByLabel('main menu', { exact: true })
            .getByText('Settings')
            .click();
        const dataprocSettings = page.getByText('Google Dataproc Settings');
        const bigQuerySettings = page.getByText('Google BigQuery Settings');
        await dataprocSettings.or(bigQuerySettings).click();

        // Click on Create button
        await page.getByText('Create', { exact: true }).click();

        await page.getByText('Loading Runtime').waitFor({ state: "hidden" });

        // Check Spark Properties section and subsections are present on the page
        await expect(page.getByText('Spark Properties', { exact: true })).toBeVisible();
        await expect(page.getByText('Resource Allocation', { exact: true })).toBeVisible();
        await expect(page.getByText('Autoscaling', { exact: true })).toBeVisible();
        await expect(page.getByText('GPU', { exact: true })).toBeVisible();

        // Expand Resource Allocation subsection and check the properties keys
        await page.locator('//*[@class="spark-properties-sub-header-parent"][1]/div[2]').click();
        await expect(page.locator('//*[@value="spark.driver.cores"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.driver.memory"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.driver.memoryOverhead"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.driver.disk.size"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.driver.disk.tier"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.executor.cores"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.executor.memory"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.executor.memoryOverhead"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.executor.disk.size"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.executor.disk.tier"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.executor.instances"]')).toBeVisible();

        // Verify the default values of the properties keys in the Allocation subsection
        const sparkDriverCoresValue = await page.locator('//*[@id="value-spark.driver.cores"]//input').getAttribute('value');
        expect(sparkDriverCoresValue).toBe('4');
        const sparkDriverMemoryValue = await page.locator('//*[@id="value-spark.driver.memory"]//input').getAttribute('value');
        expect(sparkDriverMemoryValue).toBe('12200m');
        const sparkDriverMemoryOverheadValue = await page.locator('//*[@id="value-spark.driver.memoryOverhead"]//input').getAttribute('value');
        expect(sparkDriverMemoryOverheadValue).toBe('1220m');
        const sparkDataprocDriverDiskSizeValue = await page.locator('//*[@id="value-spark.dataproc.driver.disk.size"]//input').getAttribute('value');
        expect(sparkDataprocDriverDiskSizeValue).toBe('400g');
        const sparkDataprocDriverDiskTierValue = await page.locator('//*[@id="value-spark.dataproc.driver.disk.tier"]//input').getAttribute('value');
        expect(sparkDataprocDriverDiskTierValue).toBe('standard');
        const sparkExecutorCoresValue = await page.locator('//*[@id="value-spark.executor.cores"]//input').getAttribute('value');
        expect(sparkExecutorCoresValue).toBe('4');
        const sparkExecutorMemoryValue = await page.locator('//*[@id="value-spark.executor.memory"]//input').getAttribute('value');
        expect(sparkExecutorMemoryValue).toBe('12200m');
        const sparkExecutorMemoryOverheadValue = await page.locator('//*[@id="value-spark.executor.memoryOverhead"]//input').getAttribute('value');
        expect(sparkExecutorMemoryOverheadValue).toBe('1220m');
        const sparkDataprocExecutorDiskSizeValue = await page.locator('//*[@id="value-spark.dataproc.executor.disk.size"]//input').getAttribute('value');
        expect(sparkDataprocExecutorDiskSizeValue).toBe('400g');
        const sparkDataprocExecutorDiskTierValue = await page.locator('//*[@id="value-spark.dataproc.executor.disk.tier"]//input').getAttribute('value');
        expect(sparkDataprocExecutorDiskTierValue).toBe('standard');
        const sparkExecutorInstancesValue = await page.locator('//*[@id="value-spark.executor.instances"]//input').getAttribute('value');
        expect(sparkExecutorInstancesValue).toBe('2');

        // Expand Resource Autoscaling sub section and check the properties
        await page.locator('//*[@class="spark-properties-sub-header-parent"][2]/div[2]').click();
        await expect(page.locator('//*[@value="spark.dynamicAllocation.enabled"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dynamicAllocation.initialExecutors"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dynamicAllocation.minExecutors"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dynamicAllocation.maxExecutors"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dynamicAllocation.executorAllocationRatio"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.reducer.fetchMigratedShuffle.enabled"]')).toBeVisible();

        // Verify the default values of the properties keys in the Autoscaling subsection
        const sparkDAEnabledValue = await page.locator('//*[@id="value-spark.dynamicAllocation.enabled"]//input').getAttribute('value');
        expect(sparkDAEnabledValue).toBe('true');
        const sparkDAInitialExecutorsValue = await page.locator('//*[@id="value-spark.dynamicAllocation.initialExecutors"]//input').getAttribute('value');
        expect(sparkDAInitialExecutorsValue).toBe('2');
        const sparkDAMinExecutorsValue = await page.locator('//*[@id="value-spark.dynamicAllocation.minExecutors"]//input').getAttribute('value');
        expect(sparkDAMinExecutorsValue).toBe('2');
        const sparkDAMaxExecutorsValue = await page.locator('//*[@id="value-spark.dynamicAllocation.maxExecutors"]//input').getAttribute('value');
        expect(sparkDAMaxExecutorsValue).toBe('1000');
        const sparkDAExecutorARValue = await page.locator('//*[@id="value-spark.dynamicAllocation.executorAllocationRatio"]//input').getAttribute('value');
        expect(sparkDAExecutorARValue).toBe('0.3');
        const sparkRFMSEnabledValue = await page.locator('//*[@id="value-spark.reducer.fetchMigratedShuffle.enabled"]//input').getAttribute('value');
        expect(sparkRFMSEnabledValue).toBe('false');

        // Check the GPU subsection is unchecked by default
        const isChecked = await page.getByLabel('GPU').isChecked();
        expect(isChecked).toBe(false);

        // Check the GPU checkbox and validate the properties
        await page.getByLabel('GPU').check();
        await expect(page.locator('//*[@value="spark.dataproc.driverEnv.LANG"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.executorEnv.LANG"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.executor.compute.tier"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.dataproc.executor.resource.accelerator.type"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.plugins"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.task.resource.gpu.amount"]')).toBeVisible();
        await expect(page.locator('//*[@value="spark.shuffle.manager"]')).toBeVisible();

        // Verify the default values of the properties keys in the GPU subsection
        const sparDPDriverEnvLANGValue = await page.locator('//*[@id="value-spark.dataproc.driverEnv.LANG"]//input').getAttribute('value');
        expect(sparDPDriverEnvLANGValue).toBe('C.UTF-8');
        const sparkExecutorEnvLANGValue = await page.locator('//*[@id="value-spark.executorEnv.LANG"]//input').getAttribute('value');
        expect(sparkExecutorEnvLANGValue).toBe('C.UTF-8');
        const sparkDPEComputeTierValue = await page.locator('//*[@id="value-spark.dataproc.executor.compute.tier"]//input').getAttribute('value');
        expect(sparkDPEComputeTierValue).toBe('premium');
        const sparkDPERATypeValue = await page.locator('//*[@id="value-spark.dataproc.executor.resource.accelerator.type"]//input').getAttribute('value');
        expect(sparkDPERATypeValue).toBe('l4');
        const sparkPluginsValue = await page.locator('//*[@id="value-spark.plugins"]//input').getAttribute('value');
        expect(sparkPluginsValue).toBe('com.nvidia.spark.SQLPlugin');
        const sparkTaskRGPUAmountValue = await page.locator('//*[@id="value-spark.task.resource.gpu.amount"]//input').getAttribute('value');
        expect(sparkTaskRGPUAmountValue).toBe('0.25');
        const sparkShuffleManagerValue = await page.locator('//*[@id="value-spark.shuffle.manager"]//input').getAttribute('value');
        expect(sparkShuffleManagerValue).toBe('com.nvidia.spark.rapids.RapidsShuffleManager');

    });

    test('Can confirm Allocation subsection properties are removed when GPU is selected', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Goto menu and click on Google setting
        await page
            .getByLabel('main menu', { exact: true })
            .getByText('Settings')
            .click();
        const dataprocSettings = page.getByText('Google Dataproc Settings');
        const bigQuerySettings = page.getByText('Google BigQuery Settings');
        await dataprocSettings.or(bigQuerySettings).click();

        // Click on Create button
        await page.getByText('Create', { exact: true }).click();
        await page.getByText('Loading Runtime').waitFor({ state: "hidden" });

        // Expand Resource Allocation subsection and check the properties keys
        await page.locator('//*[@class="spark-properties-sub-header-parent"][1]/div[2]').click();

        // Check the GPU checkbox and validate Allocation subsection properties will be removed when GPU is checked
        await page.getByLabel('GPU').check();
        await expect(page.locator('//*[@value="spark.executor.memoryOverhead"]')).toBeHidden();
        await expect(page.locator('//*[@value="spark.dataproc.executor.disk.size"]')).toBeHidden();
    });

    test('Can verify by changing to non-L4 value', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Goto menu and click on Google setting
        await page
            .getByLabel('main menu', { exact: true })
            .getByText('Settings')
            .click();
        const dataprocSettings = page.getByText('Google Dataproc Settings');
        const bigQuerySettings = page.getByText('Google BigQuery Settings');
        await dataprocSettings.or(bigQuerySettings).click();

        // Click on Create button
        await page.getByText('Create', { exact: true }).click();
        await page.getByText('Loading Runtime').waitFor({ state: "hidden" });

        // Expand Resource Allocation subsection and check the properties keys
        await page.locator('//*[@class="spark-properties-sub-header-parent"][1]/div[2]').click();

        // After Changing to non-L4 card (like a100-40 or a100-80), the spark.dataproc.executor.disk.size field should be displayed
        await page.getByLabel('GPU').check();
        const sparkDPERATypeInput = page.locator('//*[@id="value-spark.dataproc.executor.resource.accelerator.type"]//input');
        await sparkDPERATypeInput.fill('a100-40');

        // Check Allocation subsection property spark.dataproc.executor.disk.size is visible
        await expect(page.locator('//*[@value="spark.dataproc.executor.disk.size"]')).toBeVisible();
    });
});

