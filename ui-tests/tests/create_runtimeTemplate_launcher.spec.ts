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

test.describe('Serverless notebook from launcher screen', () => {

    test('Sanity: Can perform field validation', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Severless New Runtime Template
        await page
            .locator('.jp-LauncherCard:visible', {
                hasText: 'New Runtime Template'
            })
            .click();
        await page.getByText('Loading Runtime').waitFor({ state: "detached" });

        await page.getByLabel('Display name*').click();
        await page.getByLabel('Display name*').fill('testing246');
        await page.getByLabel('Display name*').clear();
        await expect(page.getByText('Name is required')).toBeVisible(); // Error should appear for empty Display name

        // Fill Display name and check if error is hidden
        await page.getByLabel('Display name*').fill('testing246');
        await expect(page.getByText('Name is required')).toBeHidden();

        await page.getByLabel('Runtime ID*').clear();
        await expect(page.getByText('ID is required')).toBeVisible(); // Error should appear for empty Runtime ID

        // Fill Runtime ID and check if error is hidden
        await page.getByLabel('Runtime ID*').fill('runtime123');
        await expect(page.getByText('ID is required')).toBeHidden();

        await page.getByLabel('Description*').fill('test description');
        await page.getByLabel('Description*').clear();
        await expect(page.getByText('Description is required')).toBeVisible(); // Error should appear for empty Description

        // Fill Description and check if error is hidden
        await page.getByLabel('Description*').fill('test description');
        await expect(page.getByText('Description is required')).toBeHidden();

        await page.getByLabel('Runtime version*').clear();
        await expect(page.getByText('Version is required')).toBeVisible(); // Error should appear for empty Runtime version

        // Fill Runtime version and check if error is hidden
        await page.getByLabel('Runtime version*').fill('2.2');
        await expect(page.getByText('Version is required')).toBeHidden();

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

        // Delete added property
        await page.locator('.labels-delete-icon').click();

        // Check labels section
        await expect(page.getByText('Labels',{ exact: true })).toBeVisible();
        await expect(page.locator('//label[text()="Key 1*"]/following-sibling::div/input[@value="client"]')).toBeVisible();
        await expect(page.locator('//label[text()="Value 1"]/following-sibling::div/input[@value="bigquery-jupyter-plugin"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'ADD LABEL' })).toBeVisible();
        await page.getByRole('button', { name: 'ADD LABEL' }).click();
        await expect(page.getByText('key is required')).toBeVisible(); // Key field should be required

        // Fill the key field and ensure the error is hidden
        await page.getByLabel('Key 2*').first().fill('key');
        await expect(page.getByText('key is required')).toBeHidden(); // Error should disappear after entering the key
        await page.getByLabel('Value 2').first().click();

        // Delete added label
        await page.locator('.labels-delete-icon').click();

    });

    test('Sanity: Can create serverless notebook', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Click on Severless New Runtime Template
        await page
            .locator('.jp-LauncherCard:visible', {
                hasText: 'New Runtime Template'
            })
            .click();
        await page.getByText('Loading Runtime').waitFor({ state: "detached" });

        // Generate formatted current date string
        const now = new Date();
        const pad = (num: number) => String(num).padStart(2, '0');
        const dateTimeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}:${pad(now.getSeconds())}`;

        // Create template name
        const templateName = 'auto-test-' + dateTimeStr;

        // Fill the template details
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
        await page.waitForTimeout(5000);

        // Check the created notebook on launcher screen
        await expect(page
            .locator('.jp-LauncherCard:visible', {
                hasText: templateName +' on Serverless Spark (Remote)'
            })).toBeVisible();
    });

    // Navigate to config setup page and click on create template button
    async function navigateToRuntimeTemplate(page) {
        await page.getByLabel('main menu', { exact: true }).getByText('Settings').click();
        const dataprocSettings = page.getByText('Google Dataproc Settings');
        const bigQuerySettings = page.getByText('Google BigQuery Settings');
        await dataprocSettings.or(bigQuerySettings).click();
        await page.getByText('Create', { exact: true }).click();
        await page.getByText('Loading Runtime').waitFor({ state: "hidden" });
    }

    // Check if spark properties are visible
    async function checkSparkProperties(page) {
        const properties = [
            'spark.driver.cores', 'spark.driver.memory', 'spark.driver.memoryOverhead',
            'spark.dataproc.driver.disk.size', 'spark.dataproc.driver.disk.tier',
            'spark.executor.cores', 'spark.executor.memory', 'spark.executor.memoryOverhead',
            'spark.dataproc.executor.disk.size', 'spark.dataproc.executor.disk.tier',
            'spark.executor.instances'
        ];
        for (const prop of properties) {
            await expect(page.locator(`//*[@value="${prop}"]`)).toBeVisible();
        }
    }

    // Check if default values for properties match expected values
    async function checkPropertiesValue(page, values) {
        for (const [id, value] of Object.entries(values)) {
            const actualValue = await page.locator(`//*[@id="value-${id}"]//input`).getAttribute('value');
            expect(actualValue).toBe(value);
        }
    }

    test('Can check all spark properties are displayed', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        await navigateToRuntimeTemplate(page);

        // Verify sections and subsections presence
        const sections = ['Spark Properties', 'Resource Allocation', 'Autoscaling', 'GPU'];
        for (const section of sections) {
            await expect(page.getByText(section, { exact: true })).toBeVisible();
        }

        // Expand and check properties in Resource Allocation subsection
        await page.locator('//*[@id="resource-allocation-expand-icon"]').click();
        await page.mouse.wheel(0, 300); // Scroll down to reveal properties
        await checkSparkProperties(page);

        // Verify default values in Resource Allocation subsection
        const allocationValues = {
            'spark.driver.cores': '4',
            'spark.driver.memory': '12200m',
            'spark.driver.memoryOverhead': '1220m',
            'spark.dataproc.driver.disk.size': '400g',
            'spark.dataproc.driver.disk.tier': 'standard',
            'spark.executor.cores': '4',
            'spark.executor.memory': '12200m',
            'spark.executor.memoryOverhead': '1220m',
            'spark.dataproc.executor.disk.size': '400g',
            'spark.dataproc.executor.disk.tier': 'standard',
            'spark.executor.instances': '2'
        };
        await checkPropertiesValue(page, allocationValues);

        // Expand and check properties in Resource Autoscaling subsection
        await page.locator('//*[@id="autoscaling-expand-icon"]').click();
        await page.mouse.wheel(0, 300); // Scroll down to reveal properties
        const autoscalingProps = [
            'spark.dynamicAllocation.enabled', 'spark.dynamicAllocation.initialExecutors',
            'spark.dynamicAllocation.minExecutors', 'spark.dynamicAllocation.maxExecutors',
            'spark.dynamicAllocation.executorAllocationRatio', 'spark.reducer.fetchMigratedShuffle.enabled'
        ];
        for (const prop of autoscalingProps) {
            await expect(page.locator(`//*[@value="${prop}"]`)).toBeVisible();
        }

        // Verify default values in Resource Autoscaling subsection
        const autoscalingValues = {
            'spark.dynamicAllocation.enabled': 'true',
            'spark.dynamicAllocation.initialExecutors': '2',
            'spark.dynamicAllocation.minExecutors': '2',
            'spark.dynamicAllocation.maxExecutors': '1000',
            'spark.dynamicAllocation.executorAllocationRatio': '0.3',
            'spark.reducer.fetchMigratedShuffle.enabled': 'false'
        };
        await checkPropertiesValue(page, autoscalingValues);

        // Verify GPU subsection is unchecked by default
        const isChecked = await page.getByLabel('GPU').isChecked();
        expect(isChecked).toBe(false);

        // Check GPU checkbox and validate properties are visible
        await page.getByLabel('GPU').check();
        const gpuProps = [
            'spark.dataproc.driverEnv.LANG', 'spark.executorEnv.LANG', 'spark.dataproc.executor.compute.tier',
            'spark.dataproc.executor.resource.accelerator.type', 'spark.plugins', 'spark.task.resource.gpu.amount',
            'spark.shuffle.manager'
        ];
        for (const prop of gpuProps) {
            await expect(page.locator(`//*[@value="${prop}"]`)).toBeVisible();
        }

        // Verify default values in GPU subsection
        const gpuValues = {
            'spark.dataproc.driverEnv.LANG': 'C.UTF-8',
            'spark.executorEnv.LANG': 'C.UTF-8',
            'spark.dataproc.executor.compute.tier': 'premium',
            'spark.dataproc.executor.resource.accelerator.type': 'l4',
            'spark.plugins': 'com.nvidia.spark.SQLPlugin',
            'spark.task.resource.gpu.amount': '0.25',
            'spark.shuffle.manager': 'com.nvidia.spark.rapids.RapidsShuffleManager'
        };
        await checkPropertiesValue(page, gpuValues);
    });

    test('Can check allocation subsection properties changes when GPU is selected and unselected', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        await navigateToRuntimeTemplate(page);

        // Expand Resource Allocation subsection
        await page.locator('//*[@id="resource-allocation-expand-icon"]').click();

        // Check GPU checkbox and validate the properties
        await page.getByLabel('GPU').check();

        let sDEDiskTierValue = {
            'spark.dataproc.executor.disk.tier': 'premium',
        };
        await checkPropertiesValue(page, sDEDiskTierValue);

        const hiddenProps = ['spark.executor.memoryOverhead', 'spark.dataproc.executor.disk.size'];
        for (const prop of hiddenProps) {
            await expect(page.locator(`//*[@value="${prop}"]`)).toBeHidden();
        }

        // Uncheck GPU checkbox and validate the properties
        await page.getByLabel('GPU').uncheck();

        sDEDiskTierValue = {
            'spark.dataproc.executor.disk.tier': 'standard',
        };
        await checkPropertiesValue(page, sDEDiskTierValue);

        const visibleProps = ['spark.executor.memoryOverhead', 'spark.dataproc.executor.disk.size'];
        for (const prop of visibleProps) {
            await expect(page.locator(`//*[@value="${prop}"]`)).toBeVisible();
        }
    });

    test('Can verify by changing to non-L4 value', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        await navigateToRuntimeTemplate(page);

        // Expand Resource Allocation subsection
        await page.locator('//*[@class="spark-properties-sub-header-parent"][1]/div[2]').click();

        // Change GPU type to non-L4 value and validate properties are visible
        await page.getByLabel('GPU').check();
        const sparkDPERATypeInput = page.locator('//*[@id="value-spark.dataproc.executor.resource.accelerator.type"]//input');
        await sparkDPERATypeInput.fill('a100-40');

        // Check Allocation subsection property is visible
        await expect(page.locator('//*[@value="spark.dataproc.executor.disk.size"]')).toBeVisible();

    });

});
