import { expect, test } from '@grafana/plugin-e2e';
import { Page } from '@playwright/test';
import { ExplorePage } from './fixtures/explore';

/** Seeker time picker panel (@grafana/ui TimePickerContent). Quick options use visually hidden checkboxes — assert visible labels instead. */
function seekerTimePickerContent(page: Page) {
  return page.locator('#TimePickerContent').first();
}

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
    await expect(page.getByRole('button', { name: 'Focus selection' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Set range', exact: true })).toBeVisible();
  });

  test('context window selector opens on calendar button click', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Click the calendar button to open the context window selector
    await page.getByRole('button', { name: 'Set range', exact: true }).click();

    // Quick range inputs are opacity-0 (custom list); visible text is on the label
    const picker = seekerTimePickerContent(page);
    await expect(picker.getByText('Last 5 minutes', { exact: true })).toBeVisible();
    await expect(picker.getByText('Last 15 minutes', { exact: true })).toBeVisible();
    await expect(picker.getByText('Last 30 minutes', { exact: true })).toBeVisible();
    await expect(picker.getByText('Last 1 hour', { exact: true })).toBeVisible();

    // From and To fields should be visible
    await expect(page.getByLabel('From', { exact: true })).toBeVisible();
    await expect(page.getByLabel('To', { exact: true })).toBeVisible();

    // Apply button should be visible (@grafana/ui TimeRangeContent)
    await expect(page.getByRole('button', { name: 'Apply time range' })).toBeVisible();
  });

  test('context window selector closes when clicking outside', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Open the context window selector
    await page.getByRole('button', { name: 'Set range', exact: true }).click();
    const picker = seekerTimePickerContent(page);
    await expect(picker.getByText('Last 5 minutes', { exact: true })).toBeVisible();

    // Click outside to close it
    await page.mouse.click(10, 10);

    // The selector should be hidden
    await expect(picker).not.toBeVisible();
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
    await page.getByRole('button', { name: 'Focus selection' }).click();

    // Controls should still be visible after reset
    await expect(page.getByRole('button', { name: 'Focus selection' })).toBeVisible();
  });

  test('selecting a preset duration updates the context window', async ({ page }) => {
    // Wait for the seeker to load
    await expect(page.getByText('Loading time seeker…')).toBeHidden({ timeout: 30000 });

    // Open the context window selector
    await page.getByRole('button', { name: 'Set range', exact: true }).click();

    const picker = seekerTimePickerContent(page);
    await picker.getByText('Last 24 hours', { exact: true }).click();

    // The popover should close after selection
    await expect(picker).not.toBeVisible();

    // The seeker controls should still be visible
    await expect(page.getByRole('button', { name: 'Set range', exact: true })).toBeVisible();
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
