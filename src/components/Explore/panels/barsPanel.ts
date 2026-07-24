import { PanelBuilders } from '@grafana/scenes';
import { DrawStyle, StackingMode, TooltipDisplayMode } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';

export const barsPanelConfig = (metric: MetricFunction, axisWidth?: number) => {
  const isErrorsMetric = metric === 'errors' || false;
  
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
        // Rate is neutral throughput (all spans); use a neutral blue and reserve
        // green for an explicit success signal.
        fixedColor: isErrorsMetric ? 'semi-dark-red' : 'blue',
      });
    })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi });

  if (axisWidth !== undefined) {
    builder.setCustomFieldConfig('axisWidth', axisWidth);
  }

  return builder;
};
