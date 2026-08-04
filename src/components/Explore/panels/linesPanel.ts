import { PanelBuilders } from '@grafana/scenes';
import { TooltipDisplayMode } from '@grafana/ui';

export const linesPanelConfig = (fixedColor?: string) => {
  const builder = PanelBuilders.timeseries()
    .setOption('annotations', { multiLane: true })
    .setOption('legend', { showLegend: false })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
    .setCustomFieldConfig('fillOpacity', 15);

  if (fixedColor) {
    builder.setOverrides((overrides) => {
      overrides.matchFieldsWithNameByRegex('.*').overrideColor({
        mode: 'fixed',
        fixedColor,
      });
    });
  }

  return builder;
};
