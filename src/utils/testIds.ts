import { VariableValue } from '@grafana/scenes';
import { AttributeItem } from '../types';
import pluginJson from '../plugin.json';

export const testIds = {
  datasourceRegion: `${pluginJson.id} datasource-region`,
  controlsRegion: `${pluginJson.id} controls-region`,
  filtersRegion: `${pluginJson.id} filters-region`,
  traceIdInput: `${pluginJson.id} trace-id-input`,
  traceIdSubmit: `${pluginJson.id} trace-id-submit`,
  traceIdClear: `${pluginJson.id} trace-id-clear`,
  shareExploration: `${pluginJson.id} share-exploration`,
  traceDrawer: `${pluginJson.id} trace-drawer`,
  emptyState: `${pluginJson.id} empty-state`,
  errorState: `${pluginJson.id} error-state`,
  loadingState: `${pluginJson.id} loading-state`,
  ratePanel: `${pluginJson.id} rate-panel`,
  errorsPanel: `${pluginJson.id} errors-panel`,
  durationPanel: `${pluginJson.id} duration-panel`,
  breakdownContainer: `${pluginJson.id} breakdown container`,
  serviceStructureContainer: `${pluginJson.id} service structure container`,
  comparisonContainer: `${pluginJson.id} comparison container`,
  tracesContainer: `${pluginJson.id} traces container`,
  primarySignalOptionRootSpans: `${pluginJson.id} primary signal option root spans`,
  primarySignalOptionAllSpans: `${pluginJson.id} primary signal option all spans`,
  primarySignalOptionServerSpans: `${pluginJson.id} primary signal option server spans`,
  primarySignalOptionConsumerSpans: `${pluginJson.id} primary signal option consumer spans`,
  primarySignalOptionDatbaseCalls: `${pluginJson.id} primary signal option database calls`,
  primarySignalSelect: `${pluginJson.id} primary signal select`,
};

export function getTestIdFromMetric(metric: VariableValue | string): string {
  const value = String(metric);
  switch (value) {
    case 'rate':
      return testIds.ratePanel;
    case 'errors':
      return testIds.errorsPanel;
    case 'duration':
      return testIds.durationPanel;
  }

  return 'unknown-panel';
}

export function getTestIdFromAttribute(attribute: AttributeItem): string {
  if (!attribute?.value) {
    return `${pluginJson.id} unknown-attribute-item`;
  }
  return `${pluginJson.id} ${attribute.value}-attribute-item`;
}

// Values, rather than translated labels, keep tab anchors stable across metrics and locales.
export const actionViewTestIds = {
  breakdown: `${pluginJson.id} tab-breakdown`,
  structure: `${pluginJson.id} tab-structure`,
  comparison: `${pluginJson.id} tab-comparison`,
  exceptions: `${pluginJson.id} tab-exceptions`,
  traceList: `${pluginJson.id} tab-trace-list`,
  adaptiveTraces: `${pluginJson.id} tab-adaptive-traces`,
};

export function getTraceOpenTestId(traceId: string, spanId?: string): string {
  return `${pluginJson.id} open-trace-${traceId}${spanId ? `-span-${spanId}` : ''}`;
}
