import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';

test.describe('components', () => {
  let explorePage: ExplorePage;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
    await explorePage.waitForExploreReady(10000);
  });

  test.afterEach(async () => {
    if (explorePage) {
      await explorePage.unroute();
    }
  });

  test('in header are visible', async ({ page }) => {
    await expect(page.getByText('Data source')).toBeVisible();
    await expect(page.getByRole('button', { name: /Need help/i })).toBeVisible();
    await expect(page.getByTestId('data-testid TimePicker Open Button')).toBeVisible();
    await expect(page.getByTestId('data-testid RefreshPicker run button')).toBeVisible();
    await expect(page.getByTestId('data-testid RefreshPicker interval button')).toBeVisible();
  });

  test('in filters bar are visible', async ({ page }) => {
    await expect(page.getByText('Root spans')).toBeVisible();
    await expect(page.getByText('All spans')).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('for RED metrics are visible', async ({ page }) => {
    await expect(page.getByText('Span rate')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('data-testid Panel header ').locator('canvas')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('data-testid Panel header Histogram by duration').locator('canvas')).toBeVisible({
      timeout: 20000,
    });
  });

  test('for tabs are visible', async ({ page }) => {
    await expect(page.getByTestId('data-testid Tab Breakdown')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Service structure')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Comparison')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Traces')).toBeVisible();
  });

  test('for breakdown tab are visible', async ({ page }) => {
    await expect(page.getByText('Attributes are ordered by')).toBeVisible();
    await expect(page.getByText('Resource', { exact: true })).toBeVisible();
    await expect(page.getByText('Span', { exact: true })).toBeVisible();
    await expect(page.getByText('View', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Single')).toBeVisible();
    await expect(page.getByLabel('Grid')).toBeVisible();
    await expect(page.getByLabel('Rows')).toBeVisible();
    await expect(page.getByPlaceholder('Search attributes...')).toBeVisible();
  });
});
