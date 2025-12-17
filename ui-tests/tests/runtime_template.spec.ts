
import { test, expect } from '@jupyterlab/galata';

test.describe('Runtime Template UI', () => {
  test('Create Runtime Template - Add Label Input Focus', async ({ page }) => {
    // Wait for the launcher to be visible
    await page.locator('.jp-Launcher-body').waitFor();

    // Open the "New Runtime Template" page from the Launcher
    // Playwright automatically scrolls the element into view before clicking
    const card = page.locator('.jp-LauncherCard', { hasText: 'New Runtime Template' });
    await card.click();

    // Wait for the form to appear. 
    // The title is "Serverless Runtime Template"
    await page.getByTestId('loader').waitFor({ state: 'detached' });
    await expect(page.getByText('Serverless Runtime Template')).toBeVisible();

    // --- Test Spark Properties (Others) ---
    // Click "ADD PROPERTY" first
    const addPropertyButton = page.getByRole('button', { name: 'ADD PROPERTY' });
    await addPropertyButton.click();

    // Find the container (grandparent of the button) to scope our search
    const propertiesSection = addPropertyButton.locator('..').locator('..');
    
    // Count existing keys to determine the new key number
    const propKeyCount = await propertiesSection.getByLabel(/Key \d+/).count();
    const propKeyInput = propertiesSection.getByLabel(`Key ${propKeyCount}`);

    const testPropKey = 'test-property-key';
    await propKeyInput.click();
    await propKeyInput.type(testPropKey, { delay: 100 });
    await expect(propKeyInput).toHaveValue(testPropKey);

    // Test Value input
    const propValueInput = propertiesSection.getByLabel(`Value ${propKeyCount}`);
    const testPropValue = 'test-property-value';
    await propValueInput.click();
    await propValueInput.type(testPropValue, { delay: 100 });
    await expect(propValueInput).toHaveValue(testPropValue);

    // --- Test Labels ---
    // Click "ADD LABEL" first
    const addLabelButton = page.getByRole('button', { name: 'ADD LABEL' });
    await addLabelButton.click();

    // Find the container (grandparent of the button) to scope our search
    const labelsSection = addLabelButton.locator('..').locator('..');

    // Count existing keys to determine the new key number
    const labelKeyCount = await labelsSection.getByLabel(/Key \d+/).count();
    const labelKeyInput = labelsSection.getByLabel(`Key ${labelKeyCount}`);
    
    const testLabelKey = 'test-label-key';
    await labelKeyInput.click();
    await labelKeyInput.type(testLabelKey, { delay: 100 }); 
    await expect(labelKeyInput).toHaveValue(testLabelKey);

    // Test Value input
    const labelValueInput = labelsSection.getByLabel(`Value ${labelKeyCount}`);
    const testLabelValue = 'test-label-value';
    await labelValueInput.click();
    await labelValueInput.type(testLabelValue, { delay: 100 });
    await expect(labelValueInput).toHaveValue(testLabelValue);
  });
});
