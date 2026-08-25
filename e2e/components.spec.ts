import { expect, test } from './index';

test.describe('components', () => {
  test('in header are visible', async ({ tracesExplorePage, selectors }) => {
    await expect(tracesExplorePage.page.getByText('Data source')).toBeVisible();
    await expect(tracesExplorePage.page.getByTestId('plugin-info-button')).toBeVisible();
    // Toolbar time picker only — seeker also mounts TimeRangeInput with the same test id
    await expect(tracesExplorePage.page.getByRole('button', { name: /Time range selected/ })).toBeVisible();
    await expect(tracesExplorePage.getByGrafanaSelector(selectors.components.RefreshPicker.runButtonV2)).toBeVisible();
    await expect(
      tracesExplorePage.getByGrafanaSelector(selectors.components.RefreshPicker.intervalButtonV2)
    ).toBeVisible();
  });

  test('in filters bar are visible', async ({ tracesExplorePage }) => {
    await expect(tracesExplorePage.page.getByText('Root spans')).toBeVisible();
    await expect(tracesExplorePage.page.getByText('All spans')).toBeVisible();
    await expect(tracesExplorePage.page.getByRole('combobox').first()).toBeVisible();
  });

  test('for RED metrics are visible', async ({ tracesExplorePage, selectors }) => {
    await expect(tracesExplorePage.page.getByText('Span rate')).toBeVisible({ timeout: 20000 });
    await expect(
      tracesExplorePage.getByGrafanaSelector(selectors.components.Panels.Panel.title('')).locator('canvas')
    ).toBeVisible({
      timeout: 20000,
    });
    // Duration mini-panel is an empty-state image until Tempo has histogram data (cold mythical stack).
    const durationHistogram = tracesExplorePage.getByGrafanaSelector(
      selectors.components.Panels.Panel.title('Histogram by duration')
    );
    await expect(durationHistogram).toBeVisible({ timeout: 30000 });
    await expect(durationHistogram.locator('canvas')).toBeVisible();
  });

  test('for tabs are visible', async ({ tracesExplorePage, selectors }) => {
    await expect(tracesExplorePage.getByGrafanaSelector(selectors.components.Tab.title('Breakdown'))).toBeVisible();
    await expect(
      tracesExplorePage.getByGrafanaSelector(selectors.components.Tab.title('Service structure'))
    ).toBeVisible();
    await expect(tracesExplorePage.getByGrafanaSelector(selectors.components.Tab.title('Comparison'))).toBeVisible();
    await expect(tracesExplorePage.getByGrafanaSelector(selectors.components.Tab.title('Traces'))).toBeVisible();
  });

  test('for breakdown tab are visible', async ({ tracesExplorePage }) => {
    await expect(tracesExplorePage.page.getByText('Attributes are ordered by')).toBeVisible();
    await expect(tracesExplorePage.page.getByRole('tab', { name: 'Favorites' })).toBeVisible();
    await expect(tracesExplorePage.page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(tracesExplorePage.page.getByRole('tab', { name: 'Resource' })).toBeVisible();
    await expect(tracesExplorePage.page.getByRole('tab', { name: 'Span' })).toBeVisible();

    await expect(tracesExplorePage.page.getByTitle('service.name')).toBeVisible();

    await expect(tracesExplorePage.page.getByText('View', { exact: true })).toBeVisible();
    await expect(tracesExplorePage.page.getByLabel('Single')).toBeVisible();
    await expect(tracesExplorePage.page.getByLabel('Grid')).toBeVisible();
    await expect(tracesExplorePage.page.getByLabel('Rows')).toBeVisible();

    // Breakdown grid filter (ByFrameRepeater); debounced ~250ms before panels re-render.
    const breakdownPanelSearch = tracesExplorePage.page.locator('#searchFieldInput');
    await expect(breakdownPanelSearch).toBeVisible({ timeout: 20000 });
    await breakdownPanelSearch.fill('mythical');
    await expect(
      tracesExplorePage.page.locator('#trace-exploration').getByText('mythical-server', { exact: true })
    ).toBeVisible({
      timeout: 20000,
    });
  });
});
