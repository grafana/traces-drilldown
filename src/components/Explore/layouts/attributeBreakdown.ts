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
  VizPanel,
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
            // No fixed metric color — default palette keeps multi-series distinguishable.
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
        getLayoutChild: getLayoutChild(
          scene,
          panels,
          getLabelValue,
          variable,
          metric,
          actionsFn,
          onBreakdownCreateAlert
        ),
      }),
      new ByFrameRepeater({
        body: new SceneCSSGridLayout({
          templateColumns: '1fr',
          autoRows: '200px',
          isLazy: true,
          children: [],
        }),
        groupBy: true,
        getLayoutChild: getLayoutChild(
          scene,
          panels,
          getLabelValue,
          variable,
          metric,
          actionsFn,
          onBreakdownCreateAlert
        ),
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
        annotations: undefined,
        series: [
          {
            ...frame,
            fields: frame.fields.sort((a, b) => a.labels?.status?.localeCompare(b.labels?.status || '') || 0),
          },
        ],
      },
    });

    const scopedQuery = generateMetricsQueryForBreakdownTile(metric, variable.getValueText(), frame);
    const traceExploration = getTraceExplorationScene(scene);
    const query = scopedQuery ? sceneGraph.interpolate(traceExploration, scopedQuery) : undefined;

    const alertTargets: AlertPanelTarget[] = scopedQuery
      ? [
          {
            refId: 'A',
            query: scopedQuery,
            queryType: 'traceql',
            tableType: 'spans',
            limit: 100,
            spss: 10,
            filters: [],
          },
        ]
      : [];

    const menuState = { query, alertTargets, onBreakdownCreateAlert };
    if (existingGridItem) {
      const panel = existingGridItem.state.body;
      if (panel instanceof VizPanel) {
        let menu: PanelMenu | undefined;
        if (scopedQuery) {
          menu = panel.state.menu instanceof PanelMenu ? panel.state.menu : new PanelMenu(menuState);
          menu.setState(menuState);
        }
        panel.setState({
          $data: dataNode,
          menu,
          showMenuAlways: Boolean(menu),
        });
      }
      return existingGridItem;
    }

    const panel = (metric === 'duration' ? linesPanelConfig(metric).setUnit('s') : barsPanelConfig(metric))
      .setTitle(getTitle(frame, variable.getValueText()))
      .setData(dataNode);

    if (scopedQuery) {
      panel.setMenu(new PanelMenu(menuState)).setShowMenuAlways(true);
    }

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
