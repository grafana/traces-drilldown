import { PanelBuilders } from '@grafana/scenes';
import { TooltipDisplayMode } from '@grafana/ui';

export const linesPanelConfig = () => {
  return PanelBuilders.timeseries()
    .setOption('annotations', { multiLane: true })
    .setOption('legend', { showLegend: false })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
    .setCustomFieldConfig('fillOpacity', 15);
};
