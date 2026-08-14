import { MetricFunction } from '../src/utils/shared';
import { test } from './index';
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
    await assertBackAndForwardNavigationWorks(tracesExplorePage, 'rate', 'errors');
  });

  test('clicking on duration panel, browser back and browser forward should work as expected', async ({
    tracesExplorePage,
  }) => {
    await assertBackAndForwardNavigationWorks(tracesExplorePage, 'rate', 'duration');
  });
});

async function assertBackAndForwardNavigationWorks(
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
