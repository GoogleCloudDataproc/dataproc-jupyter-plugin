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

test.describe('Notebook Template tests', () => {

    // Set a common timeout for all tests
    const timeout = 5 * 60 * 1000;

    // Function to navigate to Notebook Template page
    async function navigateToNotebookTemplates(page) {
        await page.locator('//*[@data-category="Google Cloud Resources" and @title="Notebook Templates"]').click();
        await page.getByText('Loading Templates').waitFor({ state: "detached" });
        await page.getByText('Loading Notebook Templates').waitFor({ state: "detached" });
    }

    test('Sanity: Can verify notebook templates page', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Notebook Templates page
        await navigateToNotebookTemplates(page);

        // Check if notebook template table is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Check search field is present
            await expect(page.getByPlaceholder('Filter Table')).toBeVisible();

            // Check table headers
            await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
            await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();

            // Check list of notebook tempaltes are displayed
            const templatesCount = await page.locator('//table[@class="clusters-list-table"]//tr').count();
            expect(templatesCount).toBeGreaterThan(0);

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });

    test('Can confirm the details by opening a notebook template', async ({ page }) => {
        test.setTimeout(timeout);

        // Navigate to Notebook Templates page
        await navigateToNotebookTemplates(page);

        // Check if notebook template table is present
        const tableExists = await page.locator('//table[@class="clusters-list-table"]').isVisible();
        if (tableExists) {
            // Get the nptebook template name
            const templateName = await page.getByRole('cell').nth(1).textContent();

            // Open 1st notebook template to use
            await page.locator("//div[text()='Use this template']").first().click();

            // Check if 'Select Kernel' dialog is appears on the screen and take the action
            const isDialogPresent = await page.locator('//dialog[@aria-modal="true"]').isVisible();
            if (isDialogPresent) {
                await page.getByRole('button', { name: 'Select Kernel' }).click();
            }

            // Check all the fields are present to use the template
            await expect(page.getByRole('heading', { name: templateName! })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Create a duplicate of this cell below' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Move this cell up (Ctrl+Shift+up)' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Move this cell down (Ctrl+Shift+Down)' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Insert a cell above (A)' })).toBeVisible();
            await expect(page.getByLabel('Cells', { exact: true }).getByRole('button', { name: 'Insert a cell below (B)' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Delete this cell (D, D)' })).toBeVisible();

        } else {
            await expect(page.getByText('No rows to display')).toBeVisible();
        }
    });
});