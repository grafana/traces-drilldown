import { PanelBuilders } from '@grafana/scenes';
import { TooltipDisplayMode } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';
import { applyMetricSeriesColorOverrides } from '../seeker/getMetricColor';

export const linesPanelConfig = (metric?: MetricFunction) => {
  const builder = PanelBuilders.timeseries()
    .setOption('annotations', { multiLane: true })
    .setOption('legend', { showLegend: false })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
    .setCustomFieldConfig('fillOpacity', 15);

  if (metric) {
    builder.setOverrides((overrides) => {
      applyMetricSeriesColorOverrides(overrides, metric);
    });
  }

  return builder;
};
