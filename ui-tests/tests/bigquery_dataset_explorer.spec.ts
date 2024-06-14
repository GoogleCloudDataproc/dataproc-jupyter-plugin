import { test, expect, galata } from '@jupyterlab/galata';

test('bigquery-dataset-explorer', async ({ page }) => {
  const tabExists = await page.isVisible(
    'role=tab[name="Dataset Explorer - BigQuery"]'
  );
  if (tabExists) {
    await page
      .getByRole('tab', { name: 'Dataset Explorer - BigQuery' })
      .click();
    await page
      .locator('div:nth-child(2) > div > .caret-icon > .icon-white > svg')
      .first()
      .click();
    await page
      .locator(
        'div:nth-child(2) > div > .caret-icon > .icon-white > svg > g > path'
      )
      .first()
      .click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page.locator('div[role="treeitem"][aria-level="1"]').first().click();
    await page
      .locator('div:nth-child(3) > div > .caret-icon > .icon-white > svg')
      .click();
    await page
      .locator(
        'div:nth-child(3) > div > .caret-icon > .icon-white > svg > g > path'
      )
      .click();
    await page.locator('div[role="treeitem"][aria-level="2"]').first().click();
    await page.getByText('Schema', { exact: true }).click();
    await page.getByText('Preview', { exact: true }).click();
    await page.getByText('Details').click();
  }
});
