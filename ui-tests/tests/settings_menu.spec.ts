import { test } from '@jupyterlab/galata';

test.describe('Settings Menu', () => {
  test('Settings Menu is visible and clickable', async ({ page }) => {
    await page
      .getByLabel('main', { exact: true })
      .getByText('Settings')
      .click();
    await page.getByText('Cloud Dataproc Settings').click();
  });
});
