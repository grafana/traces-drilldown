import { TestFixture } from '@playwright/test';
import { PlaywrightArgs } from '@grafana/plugin-e2e';
import { TracesExplorePage } from '../models/TracesExplore';

type TracesExplorePageFixture = TestFixture<TracesExplorePage, PlaywrightArgs>;

export const tracesExplorePage: TracesExplorePageFixture = async (
  { page, selectors, grafanaVersion, request },
  use,
  testInfo
) => {
  const tracesExplorePage = new TracesExplorePage({ page, selectors, grafanaVersion, request, testInfo });
  // fixture setup
  await tracesExplorePage.goto();
  await tracesExplorePage.waitForExploreReady();
  await tracesExplorePage.assertNotLoading();

  await use(tracesExplorePage);

  // fixture teardown
  await tracesExplorePage.unroute();
};
