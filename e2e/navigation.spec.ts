import { AttributeItem } from '../src/types';
import { MetricFunction } from '../src/utils/shared';
import { getTestIdFromAttribute, testIds } from '../src/utils/testIds';
import { expect, test } from './index';
import { RateTabs, TracesExplorePage } from './models/TracesExplore';

test.describe('navigating app', () => {
  test('explore page should render successfully', async ({ tracesExplorePage }) => {
    await tracesExplorePage.assertMissingData();
  });
});

test.describe('ensure back button works for main actions', () => {
  test('clicking on errors panel, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForMetrics(tracesExplorePage, 'rate', 'errors');
  });

  test('clicking on duration panel, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForMetrics(tracesExplorePage, 'rate', 'duration');
  });

  test('clicking on an include button, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForFilters(tracesExplorePage, 'include');
  });

  test('clicking on an exclude button, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForFilters(tracesExplorePage, 'exclude');
  });

  test('clicking on the "Service structure" tab, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForTabs(tracesExplorePage, 'Service structure');
  });

  test('clicking on the "Comparison" tab, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForTabs(tracesExplorePage, 'Comparison');
  });

  test('clicking on the "Traces" tab, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorksForTabs(tracesExplorePage, 'Traces');
  });
});

async function assertBackAndForwardNavigationWorksForMetrics(
  tracesExplorePage: TracesExplorePage,
  startMetric: MetricFunction,
  switchToMetric: MetricFunction
) {
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertREDPanelRadioVisible(startMetric);
  await tracesExplorePage.assertREDPanelRadioVisible(switchToMetric);

  await tracesExplorePage.assertCheckedForREDPanelRadio(startMetric);
  await tracesExplorePage.assertUnCheckedForREDPanelRadio(switchToMetric);

  await tracesExplorePage.clickOnREDPanelRadio(switchToMetric);
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertCheckedForREDPanelRadio(switchToMetric);
  await tracesExplorePage.assertUnCheckedForREDPanelRadio(startMetric);

  await tracesExplorePage.assertNoErrorState();

  await tracesExplorePage.page.goBack();
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertCheckedForREDPanelRadio(startMetric);
  await tracesExplorePage.assertUnCheckedForREDPanelRadio(switchToMetric);

  await tracesExplorePage.assertNoErrorState();

  await tracesExplorePage.page.goForward();
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertCheckedForREDPanelRadio(switchToMetric);
  await tracesExplorePage.assertUnCheckedForREDPanelRadio(startMetric);

  await tracesExplorePage.assertNoErrorState();
}

async function assertBackAndForwardNavigationWorksForFilters(
  tracesExplorePage: TracesExplorePage,
  toBeClicked: 'include' | 'exclude'
) {
  const serviceNameAttribute: AttributeItem = {
    label: 'service.name',
    scope: 'Resource',
    value: 'resource.service.name',
  };
  const spanNameAttribute: AttributeItem = { label: 'name', scope: 'Span', value: 'name' };
  const serviceNameTestId = getTestIdFromAttribute(serviceNameAttribute);
  const spanNameTestId = getTestIdFromAttribute(spanNameAttribute);

  await expect(tracesExplorePage.page.getByRole('button', { name: toBeClicked }).first()).toBeVisible();

  await tracesExplorePage.assertAdHocFilterEmpty(serviceNameAttribute);
  await tracesExplorePage.assertSelectedLabel('resource.service.name');
  await tracesExplorePage.assertSelectedAttributes(serviceNameTestId, spanNameTestId);
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.page.getByRole('button', { name: toBeClicked }).first().click();
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertAdHocFilterPopulated(serviceNameAttribute);
  await tracesExplorePage.assertSelectedLabel('name');
  await tracesExplorePage.assertSelectedAttributes(spanNameTestId, serviceNameTestId);

  await tracesExplorePage.page.goBack();
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertAdHocFilterEmpty(serviceNameAttribute);
  await tracesExplorePage.assertSelectedLabel('resource.service.name');
  await tracesExplorePage.assertSelectedAttributes(serviceNameTestId, spanNameTestId);

  await tracesExplorePage.page.goForward();
  await tracesExplorePage.assertNotLoading();

  await tracesExplorePage.assertAdHocFilterPopulated(serviceNameAttribute);
  await tracesExplorePage.assertSelectedLabel('name');
  await tracesExplorePage.assertSelectedAttributes(spanNameTestId, serviceNameTestId);
}

async function assertBackAndForwardNavigationWorksForTabs(tracesExplorePage: TracesExplorePage, tabToClick: RateTabs) {
  await tracesExplorePage.assertNotLoading();

  await assertBackAndForwardNavigationWorksForTabsInitialState(tracesExplorePage);

  await tracesExplorePage.getTab(tabToClick).click();
  await tracesExplorePage.assertNotLoading();

  await assertBackAndForwardNavigationWorksForTabsClickedState(tracesExplorePage, tabToClick);

  await tracesExplorePage.page.goBack();
  await tracesExplorePage.assertNotLoading();

  await assertBackAndForwardNavigationWorksForTabsInitialState(tracesExplorePage);

  await tracesExplorePage.page.goForward();
  await tracesExplorePage.assertNotLoading();

  await assertBackAndForwardNavigationWorksForTabsClickedState(tracesExplorePage, tabToClick);
}

async function assertBackAndForwardNavigationWorksForTabsInitialState(tracesExplorePage: TracesExplorePage) {
  await tracesExplorePage.assertTabSelected('Breakdown');
  await tracesExplorePage.assertTabNotSelected('Service structure');
  await tracesExplorePage.assertTabNotSelected('Comparison');
  await tracesExplorePage.assertTabNotSelected('Traces');

  await expect(tracesExplorePage.page.getByTestId(testIds.breakdownContainer)).toBeVisible();
  await expect(tracesExplorePage.page.getByTestId(testIds.serviceStructureContainer)).not.toBeVisible();
  await expect(tracesExplorePage.page.getByTestId(testIds.comparisonContainer)).not.toBeVisible();
  await expect(tracesExplorePage.page.getByTestId(testIds.tracesContainer)).not.toBeVisible();
}

async function assertBackAndForwardNavigationWorksForTabsClickedState(
  tracesExplorePage: TracesExplorePage,
  tabToClick: RateTabs
) {
  await tracesExplorePage.assertTabSelected(tabToClick);
  await tracesExplorePage.assertTabNotSelected('Breakdown');

  await expect(tracesExplorePage.page.getByTestId(testIds.breakdownContainer)).not.toBeVisible();

  if (tabToClick === 'Service structure') {
    await expect(tracesExplorePage.page.getByTestId(testIds.serviceStructureContainer)).toBeVisible();
  }

  if (tabToClick === 'Comparison') {
    await expect(tracesExplorePage.page.getByTestId(testIds.comparisonContainer)).toBeVisible();
  }

  if (tabToClick === 'Traces') {
    await expect(tracesExplorePage.page.getByTestId(testIds.tracesContainer)).toBeVisible();
  }
}
