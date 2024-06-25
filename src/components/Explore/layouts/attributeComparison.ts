import {
  CustomVariable,
  PanelBuilders,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  VizPanelState,
} from '@grafana/scenes';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { GRID_TEMPLATE_COLUMNS } from '../../../pages/Explore/SelectStartingPointScene';
import { map, Observable } from 'rxjs';
import { DataFrame, FieldType, LoadingState, reduceField, ReducerID } from '@grafana/data';
import { getLayoutChild } from './allComparison';

export function buildAttributeComparison(
  scene: SceneObject,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions']
) {
  const timeRange = sceneGraph.getTimeRange(scene);
  const data = sceneGraph.getData(scene);
  const attribute = variable.getValueText();
  const attributeSeries = data.state.data?.series.find((d) => d.name === attribute);
  const splitFrames: DataFrame[] = [];
  const nameField = attributeSeries?.fields.find((f) => f.name === 'Value');
  const baselineField = attributeSeries?.fields.find((f) => f.name === 'Baseline');
  const selectionField = attributeSeries?.fields.find((f) => f.name === 'Selection');

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

  return new LayoutSwitcher({
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
    options: [
      { value: 'single', label: 'Single' },
      { value: 'grid', label: 'Grid' },
      { value: 'rows', label: 'Rows' },
    ],
    active: 'grid',
    layouts: [
      new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            minHeight: 300,
            body: PanelBuilders.timeseries().build(),
          }),
        ],
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getLabel, actionsFn),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          children: [],
        }),
        getLayoutChild: getLayoutChild(getLabel, actionsFn),
      }),
    ],
  });
}

const getLabel = (df: DataFrame) => {
  return df.name || 'No name available';
};
