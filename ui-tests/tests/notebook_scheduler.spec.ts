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
import { test, expect, galata } from '@jupyterlab/galata';

async function checkInputNotEmpty(page, label) {
  const input = page.getByLabel(label);
  const value = await input.inputValue();
  return value.trim() !== '';
}

test('Job Scheduler', async ({
  page
}) => {
  await page.getByRole('region', { name: 'notebook content' }).click();
  await page
    .locator(
      'div:nth-child(7) > .jp-Launcher-cardContainer > div:nth-child(3) > .jp-LauncherCard-icon'
    )
    .click();
  await page
    .getByLabel('Untitled.ipynb')
    .getByTitle('Job Scheduler')
    .getByRole('button')
    .click();
  await page.getByLabel('Job name*').click();
  await page.getByLabel('Job name*').fill('test-123');

  await page.getByLabel('Environment*').click();
  await page.getByRole('option').first().click();

  await page.getByRole('combobox', { name: 'Cluster*' }).click();
  await page.getByRole('option').first().click();

  const retryCountNotEmpty = await checkInputNotEmpty(page, 'Retry count');
  expect(retryCountNotEmpty).toBe(true);

  const retryDelayNotEmpty = await checkInputNotEmpty(
    page,
    'Retry delay (minutes)'
  );
  expect(retryDelayNotEmpty).toBe(true);
  const jobNameNotEmpty = await checkInputNotEmpty(page, 'Job name*');
  const environmentNotEmpty = await checkInputNotEmpty(page, 'Environment*');
  const clusterNotEmpty = await checkInputNotEmpty(page, 'Cluster*');

  const allFieldsFilled =
    jobNameNotEmpty &&
    environmentNotEmpty &&
    clusterNotEmpty &&
    retryCountNotEmpty &&
    retryDelayNotEmpty;
  if (!allFieldsFilled) {
    await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();
  } else {
    await expect(
      page.getByRole('button', { name: 'Create' })
    ).not.toBeDisabled();
  }
});
