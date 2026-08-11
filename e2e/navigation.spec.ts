import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';
import { testIds } from '../src/utils/testIds';
import { Locator, Page } from '@playwright/test';

test.describe('navigating app', () => {
  let explorePage: ExplorePage;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
  });

  test.afterEach(async () => {
    await explorePage.unroute();
  });

  test('explore page should render successfully', async ({ page }) => {
    await expect(page.getByText('Data source')).toBeVisible();
    await explorePage.assertMissingData();
  });
});

test.describe('ensure back button works for main actions', () => {
  let explorePage: ExplorePage;

  test.beforeEach(async ({ page }) => {
    explorePage = new ExplorePage(page);
    await explorePage.gotoExplorePage();
    await explorePage.assertNotLoading();
  });

  test.afterEach(async () => {
    await explorePage.unroute();
  });

  test('clicking on errors panel, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNabigationWorks(page, 'rate', 'errors');
  });

  test('clicking on duration panel, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNabigationWorks(page, 'rate', 'duration');
  });
});

type MetricType = 'rate' | 'errors' | 'duration';

async function assertBackAndForwardNabigationWorks(page: Page, startMetric: MetricType, switchToMetric: MetricType) {
  const explorePage = new ExplorePage(page);
  await explorePage.assertNotLoading();

  assertREDPanelRadioVisible(page, startMetric);
  assertREDPanelRadioVisible(page, switchToMetric);

  assertCheckedForREDPanelRadio(page, startMetric);
  assertUnCheckedForREDPanelRadio(page, switchToMetric);

  await clickOnREDPanelRadio(page, switchToMetric);
  await explorePage.assertNotLoading();

  assertCheckedForREDPanelRadio(page, switchToMetric);
  assertUnCheckedForREDPanelRadio(page, startMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();

  await page.goBack();
  await explorePage.assertNotLoading();

  assertCheckedForREDPanelRadio(page, startMetric);
  assertUnCheckedForREDPanelRadio(page, switchToMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();

  await page.goForward();
  await explorePage.assertNotLoading();

  assertCheckedForREDPanelRadio(page, switchToMetric);
  assertUnCheckedForREDPanelRadio(page, startMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();
}

async function assertREDPanelRadioVisible(page: Page, metric: MetricType) {
  await expect(page.getByTestId(testIds.redPanel(metric))).toBeVisible();
  await expect(page.getByTestId(testIds.redPanel(metric)).getByRole('radio')).toBeVisible();
}

async function assertCheckedForREDPanelRadio(page: Page, metric: MetricType) {
  const isChecked = await page.getByTestId(testIds.redPanel(metric)).getByRole('radio').isChecked();
  return expect(isChecked, `expected radiobutton '${metric}' to be checked`).toBe(true);
}

async function assertUnCheckedForREDPanelRadio(page: Page, metric: MetricType) {
  const isChecked = await page.getByTestId(testIds.redPanel(metric)).getByRole('radio').isChecked();
  return expect(isChecked, `expected radiobutton '${metric}' to be unchecked`).toBe(false);
}

async function clickOnREDPanelRadio(page: Page, metric: MetricType) {
  await page.getByTestId(testIds.redPanel(metric)).getByRole('radio').click();
}
