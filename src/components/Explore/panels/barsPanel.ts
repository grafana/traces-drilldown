import { PanelBuilders } from '@grafana/scenes';
import { DrawStyle, StackingMode, TooltipDisplayMode } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';

export const barsPanelConfig = (metric: MetricFunction) => {
  const isErrorsMetric = metric === 'errors' || false;
  
  const builder = PanelBuilders.timeseries()
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
        fixedColor: isErrorsMetric ? 'semi-dark-red' : 'green',
      });
    })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi });

  return builder;
};
