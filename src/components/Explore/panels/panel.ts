import { PanelBuilders } from '@grafana/scenes';
import { DrawStyle, StackingMode, TooltipDisplayMode } from '@grafana/ui';

export const panelConfig = () => {
  return PanelBuilders.timeseries()
    .setOption('legend', { showLegend: false })
    .setCustomFieldConfig('drawStyle', DrawStyle.Line)
    .setCustomFieldConfig('stacking', { mode: StackingMode.Normal })
    .setCustomFieldConfig('fillOpacity', 15)
    .setCustomFieldConfig('axisLabel', 'Rate')
    .setOverrides((overrides) => {
      overrides.matchFieldsWithNameByRegex('.*"?error"?.*').overrideColor({
        mode: 'fixed',
        fixedColor: 'semi-dark-red',
      });
      overrides.matchFieldsWithNameByRegex('.*"?unset"?.*').overrideColor({
        mode: 'fixed',
        fixedColor: 'green',
      });
      overrides.matchFieldsWithNameByRegex('.*"?ok"?.*').overrideColor({
        mode: 'fixed',
        fixedColor: 'dark-green',
      });
    })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi });
};
