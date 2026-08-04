import { PanelBuilders } from '@grafana/scenes';
import { DrawStyle, StackingMode, TooltipDisplayMode } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';
import { getMetricColorName } from '../seeker/getMetricColor';

export const barsPanelConfig = (metric: MetricFunction, axisWidth?: number) => {
  const builder = PanelBuilders.timeseries()
    .setOption('annotations', { multiLane: true })
    .setOption('legend', { showLegend: false })
    .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
    .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
    .setCustomFieldConfig('fillOpacity', 75)
    .setCustomFieldConfig('lineWidth', 0)
    .setCustomFieldConfig('pointSize', 0)
    .setCustomFieldConfig('axisLabel', 'Rate')
    .setOverrides((overrides) => {
      overrides.matchFieldsWithNameByRegex('.*').overrideColor({
        mode: 'fixed',
        fixedColor: getMetricColorName(metric),
      });
    })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi });

  if (axisWidth !== undefined) {
    builder.setCustomFieldConfig('axisWidth', axisWidth);
  }

  return builder;
};
