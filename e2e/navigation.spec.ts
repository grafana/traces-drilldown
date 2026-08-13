import { expect, test } from '@grafana/plugin-e2e';
import type { Page } from '@playwright/test';
import { AttributeItem } from '../src/types';
import { ExplorePage } from './fixtures/explore';
import { getTestIdFromAttribute, getTestIdFromMetric, testIds } from '../src/utils/testIds';

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
    await assertBackAndForwardNavigationWorksForMetrics(page, 'rate', 'errors');
  });

  test('clicking on duration panel, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNavigationWorksForMetrics(page, 'rate', 'duration');
  });

  test('clicking on an include button, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNavigationWorksForFilters(page, 'include');
  });

  test('clicking on an exclude button, browser back and browser forward should work as expected', async ({ page }) => {
    await assertBackAndForwardNavigationWorksForFilters(page, 'exclude');
  });
});

type MetricType = 'rate' | 'errors' | 'duration';

async function assertBackAndForwardNavigationWorksForMetrics(
  page: Page,
  startMetric: MetricType,
  switchToMetric: MetricType
) {
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

async function assertBackAndForwardNavigationWorksForFilters(page: Page, toBeClicked: 'include' | 'exclude') {
  const explorePage = new ExplorePage(page);
  const serviceNameAttribute: AttributeItem = {
    label: 'service.name',
    scope: 'Resource',
    value: 'resource.service.name',
  };
  const spanNameAttribute: AttributeItem = { label: 'name', scope: 'Span', value: 'name' };
  const serviceNameTestId = getTestIdFromAttribute(serviceNameAttribute);
  const spanNameTestId = getTestIdFromAttribute(spanNameAttribute);

  await expect(page.getByRole('button', { name: toBeClicked }).first()).toBeVisible();

  await assertAdHocFilterEmpty(page, serviceNameAttribute);
  await assertSelectedLabel(page, 'resource.service.name');
  await assertSelectedAttributes(page, serviceNameTestId, spanNameTestId);
  await explorePage.assertNotLoading();

  await page.getByRole('button', { name: toBeClicked }).first().click();
  await explorePage.assertNotLoading();

  await assertAdHocFilterPopulated(page, serviceNameAttribute);
  await assertSelectedLabel(page, 'name');
  await assertSelectedAttributes(page, spanNameTestId, serviceNameTestId);

  await page.goBack();
  await explorePage.assertNotLoading();

  await assertAdHocFilterEmpty(page, serviceNameAttribute);
  await assertSelectedLabel(page, 'resource.service.name');
  await assertSelectedAttributes(page, serviceNameTestId, spanNameTestId);

  await page.goForward();
  await explorePage.assertNotLoading();

  await assertAdHocFilterPopulated(page, serviceNameAttribute);
  await assertSelectedLabel(page, 'name');
  await assertSelectedAttributes(page, spanNameTestId, serviceNameTestId);
}

function getFilterNameFromAttribute(attribute: AttributeItem): string {
  return `Edit filter with key ${attribute.value}`;
}

async function assertAdHocFilterEmpty(page: Page, attribute: AttributeItem) {
  const name = getFilterNameFromAttribute(attribute);

  await expect(page.getByRole('button', { name })).not.toBeVisible();
  await expect(page.getByRole('button', { name })).toHaveCount(0);
}

async function assertAdHocFilterPopulated(page: Page, attribute: AttributeItem) {
  const name = getFilterNameFromAttribute(attribute);

  await expect(page.getByRole('button', { name })).toBeVisible();
  await expect(page.getByRole('button', { name })).toHaveCount(1);
}

async function assertSelectedLabel(page: Page, label: string) {
  await expect(page.getByText(`Selected: ${label}`)).toBeVisible();
}

async function assertSelectedAttributes(page: Page, selectedId: string, notSelectedId: string) {
  await expect(page.getByTestId(selectedId)).toBeVisible();
  await expect(page.getByTestId(selectedId)).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId(notSelectedId)).toBeVisible();
  await expect(page.getByTestId(notSelectedId)).toHaveAttribute('data-selected', 'false');
}
