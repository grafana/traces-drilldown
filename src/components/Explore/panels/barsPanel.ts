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
      if (isErrorsMetric) {
        overrides.matchFieldsWithNameByRegex('.*').overrideColor({
          mode: 'fixed',
          fixedColor: 'semi-dark-red',
        });
      } else {
        overrides.matchFieldsWithNameByRegex('(^unset$|.*status="unset".*)').overrideColor({
          mode: 'fixed',
          fixedColor: 'green',
        });
        overrides.matchFieldsWithNameByRegex('(^ok$|.*status="ok".*)').overrideColor({
          mode: 'fixed',
          fixedColor: 'dark-green',
        });
      }
    })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi });

  return builder;
};
