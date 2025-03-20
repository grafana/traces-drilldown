import {
  CustomVariable,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  sceneGraph,
  SceneObject,
  VizPanelState,
} from '@grafana/scenes';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { map, Observable } from 'rxjs';
import { DataFrame, FieldType, LoadingState, PanelData, reduceField, ReducerID } from '@grafana/data';
import { getPanelConfig } from './allComparison';
import { GRID_TEMPLATE_COLUMNS, MetricFunction } from '../../../utils/shared';

export function buildAttributeComparison(
  scene: SceneObject,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions'],
  metric: MetricFunction
) {
  const timeRange = sceneGraph.getTimeRange(scene);
  const data = sceneGraph.getData(scene);
  const attribute = variable.getValueText();
  const attributeSeries = data.state.data?.series.find((d) => d.name === attribute);
  const splitFrames: DataFrame[] = [];
  const nameField = attributeSeries?.fields.find((f) => f.name === 'Value');
  const baselineField = attributeSeries?.fields.find((f) => f.name === 'Baseline');
  const selectionField = attributeSeries?.fields.find((f) => f.name === 'Selection');

  const panels: Record<string, SceneCSSGridItem> = {};

  if (nameField && baselineField && selectionField) {
    for (let i = 0; i < nameField.values.length; i++) {
      if (!nameField.values[i] || (!baselineField.values[i] && !selectionField.values[i])) {
        continue;
      }

      splitFrames.push({
        name: nameField.values[i].replace(/"/g, ''),
        length: 1,
        fields: [
          {
            name: 'Value',
            type: FieldType.string,
            values: ['Baseline', 'Comparison'],
            config: {},
          },
          {
            ...baselineField,
            values: [baselineField.values[i]],
            labels: {
              [attribute]: nameField.values[i],
            },
            config: {
              displayName: 'Baseline',
            },
          },
          {
            ...selectionField,
            values: [selectionField.values[i]],
          },
        ],
      });
    }
  }

  return new ByFrameRepeater({
    $data: new SceneDataTransformer({
      $data: new SceneDataNode({
        data: {
          timeRange: timeRange.state.value,
          state: LoadingState.Done,
          series: splitFrames,
        },
      }),
      transformations: [
        () => (source: Observable<DataFrame[]>) => {
          return source.pipe(
            map((data: DataFrame[]) => {
              data.forEach((a) => reduceField({ field: a.fields[2], reducers: [ReducerID.max] }));
              return data.sort((a, b) => {
                return (b.fields[2].state?.calcs?.max || 0) - (a.fields[2].state?.calcs?.max || 0);
              });
            })
          );
        },
      ],
    }),
    body: new SceneCSSGridLayout({
      templateColumns: GRID_TEMPLATE_COLUMNS,
      autoRows: '200px',
      isLazy: true,
      children: [],
    }),
    getLayoutChild: getLayoutChild(panels, getLabel, actionsFn, metric),
  });
}

const getLabel = (df: DataFrame) => {
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
      body: panel.build(),
    });
    if (frame.name) {
      panels[frame.name] = gridItem;
    }

    return gridItem;
  };
}
