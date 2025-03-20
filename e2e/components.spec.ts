import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';

test.describe('components', () => {
  let explorePage: ExplorePage;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
  });

  test.afterEach(async () => {
    await explorePage.unroute();
  });

  test('in header are visible', async ({ page }) => {
    await expect(page.getByText('Data source')).toBeVisible();
    await expect(page.getByText('Preview')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Need help' })).toBeVisible();
    await expect(page.getByTestId('data-testid TimePicker Open Button')).toBeVisible();
    await expect(page.getByTestId('data-testid RefreshPicker run button')).toBeVisible();
    await expect(page.getByTestId('data-testid RefreshPicker interval button')).toBeVisible();
  });

  test('in filters bar are visible', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Root spans' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All spans' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filter by label values' })).toBeVisible();
  });

  test('for RED metrics are visible', async ({ page }) => {
    await expect(page.getByText('Span rate')).toBeVisible();
    await expect(page.getByTestId('data-testid Panel header ').locator('canvas')).toBeVisible();
    await expect(page.getByTestId('data-testid Panel header Histogram by duration').locator('canvas')).toBeVisible();
    await expect(page.getByTestId('data-testid Panel header Errors rate')).toBeVisible();
  });

  test('for tabs are visible', async ({ page }) => {
    await expect(page.getByTestId('data-testid Tab Breakdown')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Service structure')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Comparison')).toBeVisible();
    await expect(page.getByTestId('data-testid Tab Traces')).toBeVisible();
  });

  test('for breakdown tab are visible', async ({ page }) => {
    await expect(page.getByText('Attributes are ordered by')).toBeVisible();
    await expect(page.getByText('Scope')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Resource', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Span', exact: true })).toBeVisible();
    await expect(page.getByText('Group by')).toBeVisible();
    await expect(page.getByLabel('service.name')).toBeVisible();
    await expect(
      page
        .locator('div')
        .filter({ hasText: /^Other attributes$/ })
        .nth(1)
    ).toBeVisible();
    await expect(page.getByText('View', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Single')).toBeVisible();
    await expect(page.getByLabel('Grid')).toBeVisible();
    await expect(page.getByLabel('Rows')).toBeVisible();
    await expect(page.getByPlaceholder('Search')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'mythical-requester' })).toBeVisible();
  });
});
