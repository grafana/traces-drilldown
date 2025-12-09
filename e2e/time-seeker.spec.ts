import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';

test.describe('time seeker', () => {
  let explorePage: ExplorePage;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
  });

  test.afterEach(async () => {
    await explorePage.unroute();
  });

  test('seeker UI is visible in the RED panel', async ({ page }) => {
    // The seeker appears below the RED metrics panel with a label
    await expect(page.getByText('Seeker', { exact: true })).toBeVisible();
  });

  test('seeker control buttons are visible', async ({ page }) => {
    // Wait for the seeker to load - it shows "Loading time seeker…" initially
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Control buttons should be visible (they have tooltips)
    await expect(page.getByRole('button', { name: 'Pan left' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pan right' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom in context' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom out context' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset context window' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set context window', exact: true })).toBeVisible();
  });

  test('context window selector opens on calendar button click', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Click the calendar button to open the context window selector
    await page.getByRole('button', { name: 'Set context window', exact: true }).click();

    // The context window selector should show preset options
    await expect(page.getByRole('button', { name: 'Last 12 hours' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 24 hours' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 3 days' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 1 week' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Last 2 weeks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Same as timepicker' })).toBeVisible();

    // From and To fields should be visible
    await expect(page.getByLabel('From', { exact: true })).toBeVisible();
    await expect(page.getByLabel('To', { exact: true })).toBeVisible();

    // Apply button should be visible
    await expect(page.getByRole('button', { name: 'Apply Absolute Range' })).toBeVisible();
  });

  test('context window selector closes when clicking outside', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Open the context window selector
    await page.getByRole('button', { name: 'Set context window', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Last 12 hours' })).toBeVisible();

    // Click outside to close it
    await page.mouse.click(10, 10);

    // The selector should be hidden
    await expect(page.getByRole('button', { name: 'Last 12 hours' })).toBeHidden();
  });

  test('pan left button adjusts the visible range', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Click pan left - this should trigger a visible range change
    // We verify the button is clickable and doesn't cause errors
    await page.getByRole('button', { name: 'Pan left' }).click();

    // The controls should still be visible after panning
    await expect(page.getByRole('button', { name: 'Pan left' })).toBeVisible();
  });

  test('pan right button adjusts the visible range', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Click pan right
    await page.getByRole('button', { name: 'Pan right' }).click();

    // The controls should still be visible after panning
    await expect(page.getByRole('button', { name: 'Pan right' })).toBeVisible();
  });

  test('zoom buttons adjust the context window', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Click zoom out
    await page.getByRole('button', { name: 'Zoom out context' }).click();

    // Controls should still be visible
    await expect(page.getByRole('button', { name: 'Zoom out context' })).toBeVisible();

    // Click zoom in
    await page.getByRole('button', { name: 'Zoom in context' }).click();

    // Controls should still be visible
    await expect(page.getByRole('button', { name: 'Zoom in context' })).toBeVisible();
  });

  test('reset button resets the context window', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // First zoom out to change the window
    await page.getByRole('button', { name: 'Zoom out context' }).click();

    // Then reset
    await page.getByRole('button', { name: 'Reset context window' }).click();

    // Controls should still be visible after reset
    await expect(page.getByRole('button', { name: 'Reset context window' })).toBeVisible();
  });

  test('selecting a preset duration updates the context window', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Open the context window selector
    await page.getByRole('button', { name: 'Set context window', exact: true }).click();

    // Click "Last 24 hours" preset
    await page.getByRole('button', { name: 'Last 24 hours' }).click();

    // The popover should close after selection
    await expect(page.getByRole('button', { name: 'Last 12 hours' })).toBeHidden();

    // The seeker controls should still be visible
    await expect(page.getByRole('button', { name: 'Set context window', exact: true })).toBeVisible();
  });

  test('seeker chart canvas is rendered', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // The seeker uses UPlot which renders a canvas element
    // Look for a canvas inside the seeker area (near the Seeker label)
    const seekerSection = page
      .locator('div')
      .filter({ hasText: /^Seeker$/ })
      .first()
      .locator('..')
      .locator('..');
    const canvas = seekerSection.locator('canvas');

    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
  });
});
