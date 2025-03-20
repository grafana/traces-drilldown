import { PanelBuilders, SceneCSSGridItem, SceneCSSGridLayout, SceneDataNode, VizPanelState } from '@grafana/scenes';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { DataFrame, PanelData } from '@grafana/data';
import { AxisPlacement } from '@grafana/ui';
import { TooltipDisplayMode } from '@grafana/schema';
import { HighestDifferencePanel } from './HighestDifferencePanel';
import { GRID_TEMPLATE_COLUMNS, MetricFunction } from '../../../utils/shared';

export const BaselineColor = '#5794F299';
export const SelectionColor = '#FF9930';

export function buildAllComparisonLayout(
  actionsFn: (df: DataFrame) => VizPanelState['headerActions'],
  metric: MetricFunction
) {
  const panels: Record<string, SceneCSSGridItem> = {};

  return new ByFrameRepeater({
    body: new SceneCSSGridLayout({
      templateColumns: GRID_TEMPLATE_COLUMNS,
      autoRows: '320px',
      children: [],
    }),
    getLayoutChild: getLayoutChild(panels, getFrameName, actionsFn, metric),
  });
}

const getFrameName = (df: DataFrame) => {
  return df.name || 'No name available';
};

function getLayoutChild(
  panels: Record<string, SceneCSSGridItem>,
  getTitle: (df: DataFrame) => string,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions'],
  metric: MetricFunction
) {
  return (data: PanelData, frame: DataFrame) => {
    const existingGridItem = frame.name ? panels[frame.name] : undefined;

    const dataNode = new SceneDataNode({
      data: {
        ...data,
        series: [
          {
            ...frame,
          },
        ],
      },
    });

    if (existingGridItem) {
      existingGridItem.state.body?.setState({ $data: dataNode });
      return existingGridItem;
    }

    const panel = getPanelConfig(metric).setTitle(getTitle(frame)).setData(dataNode);

    const actions = actionsFn(frame);
    if (actions) {
      panel.setHeaderActions(actions);
    }

    const gridItem = new SceneCSSGridItem({
      body: new HighestDifferencePanel({ frame, panel: panel.build() }),
    });
    if (frame.name) {
      panels[frame.name] = gridItem;
    }

    return gridItem;
  };
}

export function getPanelConfig(metric: MetricFunction) {
  return PanelBuilders.barchart()
    .setOption('legend', { showLegend: false })
    .setOption('tooltip', { mode: TooltipDisplayMode.Multi })
    .setMax(1)
    .setOverrides((overrides) => {
      overrides.matchFieldsWithName('Value').overrideCustomFieldConfig('axisPlacement', AxisPlacement.Hidden);
      overrides
        .matchFieldsWithName('Baseline')
        .overrideColor({
          mode: 'fixed',
          fixedColor: metric === 'duration' ? BaselineColor : 'semi-dark-green',
        })
        .overrideUnit('percentunit');
      overrides
        .matchFieldsWithName('Selection')
        .overrideColor({
          mode: 'fixed',
          fixedColor: metric === 'duration' ? SelectionColor : 'semi-dark-red',
        })
        .overrideUnit('percentunit');
    });
}
