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

import { expect, test, galata } from '@jupyterlab/galata';

test.describe('Launcher screen', () => {
    test('Sanity: Can verify all the sections', async ({ page }) => {
        test.setTimeout(5 * 60 * 1000);

        // Fetch Dataproc plugin settings
        const issues = await page.request.get('http://localhost:8888/dataproc-plugin/settings');
        expect(issues.ok()).toBeTruthy();

        // Parse response and check BigQuery integration is enabled
        const response = await issues.json();

        // Check if the BigQuery integration is enabled
        if (response.enable_bigquery_integration) {
            await expect(page.getByRole('heading', { name: 'BigQuery Notebooks' })).toBeVisible();
        } else {
            expect(response.enable_bigquery_integration).toBe(false);
        }

        // Check visibility and validate Dataproc Serverless Notebooks section with new runtime template card is available
        let sectionVisible = await page.getByRole('heading', { name: 'Dataproc Serverless Notebooks' }).isVisible();
        if (sectionVisible) {
            await expect(page.getByRole('heading', { name: 'Dataproc Serverless Notebooks' })).toBeVisible();
            await expect(page.locator('.jp-LauncherCard:visible', { hasText: 'New Runtime Template' })).toBeVisible();
        } else {
            throw new Error("Dataproc Serverless Notebooks section is missing");
        }

        // Check visibility and validate Dataproc Cluster Notebooks section
        sectionVisible = await page.getByRole('heading', { name: 'Dataproc Cluster Notebooks' }).isVisible();
        if (sectionVisible) {
            await expect(page.getByRole('heading', { name: 'Dataproc Cluster Notebooks' })).toBeVisible(); 
            await expect(page.locator('[data-category="Dataproc Cluster Notebooks"][title*="Apache Toree - Scala on"]').first()).toBeVisible(); 
            await expect(page.locator('[data-category="Dataproc Cluster Notebooks"][title*="R on"]').first()).toBeVisible(); 
            await expect(page.locator('[data-category="Dataproc Cluster Notebooks"][title*="PySpark on"]').first()).toBeVisible(); 
            await expect(page.locator('[data-category="Dataproc Cluster Notebooks"][title*="Python 3 on"]').first()).toBeVisible();
        } else {
            //throw new Error("Dataproc Cluster Notebooks section is missing");
            console.log("Dataproc Cluster Notebooks section is missing");
        }

        // Verify Google Cloud Resources section along with cards is available
        await expect(page.getByRole('heading', { name: 'Google Cloud Resources' })).toBeVisible();
        await expect(page.locator('[data-category="Google Cloud Resources"][title="Clusters"]')).toBeVisible();
        await expect(page.locator('[data-category="Google Cloud Resources"][title="Serverless"]')).toBeVisible();
        await expect(page.locator('[data-category="Google Cloud Resources"][title="Notebook Templates"]')).toBeVisible();
        await expect(page.locator('[data-category="Google Cloud Resources"][title="Scheduled Jobs"]')).toBeVisible();

    });
});
