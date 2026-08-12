import { expect, test } from '@grafana/plugin-e2e';
import { ExplorePage } from './fixtures/explore';
import { getTestIdFromMetric, testIds } from '../src/utils/testIds';
import type { Page } from '@playwright/test';

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
    await assertBackAndForwardNavigationWorks(page, 'rate', 'errors');
  });

  test('clicking on duration panel, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNavigationWorks(page, 'rate', 'duration');
  });
});

type MetricType = 'rate' | 'errors' | 'duration';

async function assertBackAndForwardNavigationWorks(page: Page, startMetric: MetricType, switchToMetric: MetricType) {
  const explorePage = new ExplorePage(page);
  await explorePage.assertNotLoading();

  await assertREDPanelRadioVisible(page, startMetric);
  await assertREDPanelRadioVisible(page, switchToMetric);

  await assertCheckedForREDPanelRadio(page, startMetric);
  await assertUnCheckedForREDPanelRadio(page, switchToMetric);

  await clickOnREDPanelRadio(page, switchToMetric);
  await explorePage.assertNotLoading();

  await assertCheckedForREDPanelRadio(page, switchToMetric);
  await assertUnCheckedForREDPanelRadio(page, startMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();

  await page.goBack();
  await explorePage.assertNotLoading();

  await assertCheckedForREDPanelRadio(page, startMetric);
  await assertUnCheckedForREDPanelRadio(page, switchToMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();

  await page.goForward();
  await explorePage.assertNotLoading();

  await assertCheckedForREDPanelRadio(page, switchToMetric);
  await assertUnCheckedForREDPanelRadio(page, startMetric);

  await expect(page.getByTestId(testIds.errorState)).not.toBeVisible();
}

async function assertREDPanelRadioVisible(page: Page, metric: MetricType) {
  await expect(page.getByTestId(getTestIdFromMetric(metric))).toBeVisible();
  await expect(page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).toBeVisible();
}

async function assertCheckedForREDPanelRadio(page: Page, metric: MetricType) {
  // toBeChecked() is flaky here: `checked` property flickers during re-renders; the attribute is stable.
  await expect(page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).toHaveAttribute('checked');
}

async function assertUnCheckedForREDPanelRadio(page: Page, metric: MetricType) {
  // toBeChecked() is flaky here: `checked` property flickers during re-renders; the attribute is stable.
  await expect(page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).not.toHaveAttribute('checked');
}

async function clickOnREDPanelRadio(page: Page, metric: MetricType) {
  await page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first().click();
}
