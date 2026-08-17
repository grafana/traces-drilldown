import { AttributeItem } from '../src/types';
import { MetricFunction } from '../src/utils/shared';
import { getTestIdFromAttribute } from '../src/utils/testIds';
import { expect, test } from './index';
import { TracesExplorePage } from './models/TracesExplore';

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
