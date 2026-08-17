import { Page, expect } from '@playwright/test';
import { GrafanaPage, NavigateOptions, PluginTestCtx } from '@grafana/plugin-e2e';

import pluginJson from '../../src/plugin.json';
import { getTestIdFromMetric, testIds } from '../../src/utils/testIds';
import { MetricFunction } from '../../src/utils/shared';
import { AttributeItem } from '../../src/types';

export class TracesExplorePage extends GrafanaPage {
  constructor(readonly ctx: PluginTestCtx) {
    super(ctx);
  }

  async goto(options?: NavigateOptions) {
    await super.navigate(`/a/${pluginJson.id}/explore`, options);
  }

  async unroute() {
    await this.page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  async assertNotLoading() {
    const loading = this.page.getByText('Loading');
    await expect(loading).toHaveCount(0);
  }

  /** Wait for the explore view to be ready (header with Data source or Filters visible). */
  async waitForExploreReady(timeoutMs = 10000) {
    const headerOrFilters = this.page.getByText('Data source').or(this.page.getByText('Filters', { exact: true }));
    await expect(headerOrFilters.first()).toBeVisible({ timeout: timeoutMs });
  }

  async assertMissingData() {
    await expect(this.page.getByTestId(testIds.emptyState)).not.toBeVisible();
    await this.assertNoErrorState();
    await expect(this.page.getByTestId(testIds.loadingState)).not.toBeVisible();
  }

  async assertNoErrorState() {
    await expect(this.page.getByTestId(testIds.errorState)).not.toBeVisible();
  }

  get page(): Page {
    return this.ctx.page;
  }

  async assertREDPanelRadioVisible(metric: MetricFunction) {
    await expect(this.page.getByTestId(getTestIdFromMetric(metric))).toBeVisible();
    await expect(this.page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).toBeVisible();
  }

  async assertCheckedForREDPanelRadio(metric: MetricFunction) {
    // toBeChecked() is flaky here: `checked` property flickers during re-renders; the attribute is stable.
    await expect(this.page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).toHaveAttribute(
      'checked'
    );
  }

  async assertUnCheckedForREDPanelRadio(metric: MetricFunction) {
    // toBeChecked() is flaky here: `checked` property flickers during re-renders; the attribute is stable.
    await expect(this.page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first()).not.toHaveAttribute(
      'checked'
    );
  }

  async clickOnREDPanelRadio(metric: MetricFunction) {
    await this.page.getByTestId(getTestIdFromMetric(metric)).getByRole('radio').first().click();
  }

  getFilterNameFromAttribute(attribute: AttributeItem): string {
    return `Edit filter with key ${attribute.value}`;
  }

  async assertAdHocFilterEmpty(attribute: AttributeItem) {
    const name = this.getFilterNameFromAttribute(attribute);

    await expect(this.page.getByRole('button', { name })).not.toBeVisible();
    await expect(this.page.getByRole('button', { name })).toHaveCount(0);
  }

  async assertAdHocFilterPopulated(attribute: AttributeItem) {
    const name = this.getFilterNameFromAttribute(attribute);

    await expect(this.page.getByRole('button', { name })).toBeVisible();
    await expect(this.page.getByRole('button', { name })).toHaveCount(1);
  }

  async assertSelectedLabel(label: string) {
    await expect(this.page.getByText(`Selected: ${label}`)).toBeVisible();
  }

  async assertSelectedAttributes(selectedId: string, notSelectedId: string) {
    await expect(this.page.getByTestId(selectedId)).toBeVisible();
    await expect(this.page.getByTestId(selectedId)).toHaveAttribute('data-selected', 'true');
    await expect(this.page.getByTestId(notSelectedId)).toBeVisible();
    await expect(this.page.getByTestId(notSelectedId)).toHaveAttribute('data-selected', 'false');
  }
}
