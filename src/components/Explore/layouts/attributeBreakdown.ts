import {
  CustomVariable,
  SceneCSSGridItem,
  SceneCSSGridLayout,
  SceneDataNode,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  VizPanelState,
} from '@grafana/scenes';
import { t } from '@grafana/i18n';
import { LayoutSwitcher } from '../LayoutSwitcher';
import { explorationDS, GRID_TEMPLATE_COLUMNS, MetricFunction } from '../../../utils/shared';
import { ByFrameRepeater } from '../ByFrameRepeater';
import { getLabelValue, getOpenTrace, getTraceExplorationScene } from '../../../utils/utils';
import { map, Observable } from 'rxjs';
import { DataFrame, PanelData, reduceField, ReducerID } from '@grafana/data';
import { generateMetricsQueryForBreakdownTile, getMetricsTempoQuery } from '../queries/generateMetricsQuery';
import { barsPanelConfig } from '../panels/barsPanel';
import { linesPanelConfig } from '../panels/linesPanel';
import { StepQueryRunner } from '../queries/StepQueryRunner';
import { syncYAxis } from '../behaviors/syncYaxis';
import { exemplarsTransformations } from '../../../utils/exemplars';
import type { AlertPanelTarget } from '../actions/createAlert/getPanelDataForAlert';
import { PanelMenu, type PanelMenuCreateAlertHandler } from '../panels/PanelMenu';

export function buildNormalLayout(
  scene: SceneObject,
  variable: CustomVariable,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions'],
  onBreakdownCreateAlert?: PanelMenuCreateAlertHandler
) {
  const traceExploration = getTraceExplorationScene(scene);
  const metric = traceExploration.getMetricVariable().getValue() as MetricFunction;
  const query = getMetricsTempoQuery({ metric, groupByKey: variable.getValueText() });
  const panels: Record<string, SceneCSSGridItem> = {};

  return new LayoutSwitcher({
    $behaviors: [syncYAxis()],
    $data: new SceneDataTransformer({
      $data: new StepQueryRunner({
        maxDataPoints: 64,
        datasource: explorationDS,
        queries: [query],
      }),
      transformations: [
        ...exemplarsTransformations(getOpenTrace(scene)),
        () => (source: Observable<DataFrame[]>) => {
          return source.pipe(
            map((data: DataFrame[]) => {
              data.forEach((a) => reduceField({ field: a.fields[1], reducers: [ReducerID.max] }));
              return data.sort((a, b) => {
                return (b.fields[1].state?.calcs?.max || 0) - (a.fields[1].state?.calcs?.max || 0);
              });
            })
          );
        },
      ],
    }),
    options: [
      { value: 'single', label: t('attribute-breakdown.layout-single', 'Single') },
      { value: 'grid', label: t('attribute-breakdown.layout-grid', 'Grid') },
      { value: 'rows', label: t('attribute-breakdown.layout-rows', 'Rows') },
    ],
    active: 'grid',
    layouts: [
      new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            minHeight: 300,
            body: (metric === 'duration' ? linesPanelConfig().setUnit('s') : linesPanelConfig()).build(),
          }),
        ],
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: GRID_TEMPLATE_COLUMNS,
          autoRows: '200px',
          isLazy: true,
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(scene, panels, getLabelValue, variable, metric, actionsFn, onBreakdownCreateAlert),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          isLazy: true,
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(scene, panels, getLabelValue, variable, metric, actionsFn, onBreakdownCreateAlert),
      }),
    ],
  });
}

export function getLayoutChild(
  scene: SceneObject,
  panels: Record<string, SceneCSSGridItem>,
  getTitle: (df: DataFrame, labelName: string) => string,
  variable: CustomVariable,
  metric: MetricFunction,
  actionsFn: (df: DataFrame) => VizPanelState['headerActions'],
  onBreakdownCreateAlert?: PanelMenuCreateAlertHandler
) {
  return (data: PanelData, frame: DataFrame) => {
    const existingGridItem = frame.name ? panels[frame.name] : undefined;

    const dataNode = new SceneDataNode({
      data: {
        ...data,
        annotations: data.annotations?.filter((a) => a.refId === frame.refId),
        series: [
          {
            ...frame,
            fields: frame.fields.sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0),
          },
        ],
      },
    });

    if (existingGridItem) {
      existingGridItem.state.body?.setState({ $data: dataNode });
      return existingGridItem;
    }

    const scopedQuery = generateMetricsQueryForBreakdownTile(metric, variable.getValueText(), frame);
    const traceExploration = getTraceExplorationScene(scene);
    const query = sceneGraph.interpolate(traceExploration, scopedQuery);

    const alertTargets: AlertPanelTarget[] = [
      {
        refId: 'A',
        query,
        queryType: 'traceql',
        tableType: 'spans',
        limit: 100,
        spss: 10,
        filters: [],
      },
    ];

    // Duration uses semi-dark-blue to stay in the neutral (non-status) family while
    // remaining distinguishable from the rate panels (blue).
    const panel = (metric === 'duration' ? linesPanelConfig('semi-dark-blue').setUnit('s') : barsPanelConfig(metric))
      .setTitle(getTitle(frame, variable.getValueText()))
      .setMenu(
        new PanelMenu({
          query,
          alertTargets,
          onBreakdownCreateAlert,
        })
      )
      .setData(dataNode);

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
