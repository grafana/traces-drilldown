import React from 'react';

import {
  DashboardCursorSync,
  GrafanaTheme2,
  MetricFindValue,
  dateTime,
  DataFrame,
  GetTagResponse,
} from '@grafana/data';
import {
  behaviors,
  SceneComponentProps,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
  SceneTimeRange,
} from '@grafana/scenes';

import { REDPanel } from './REDPanel';
import {
  MakeOptional,
  explorationDS,
  VAR_FILTERS_EXPR,
  VAR_DATASOURCE_EXPR,
  MetricFunction,
  ComparisonSelection,
  ALL,
  VAR_LATENCY_THRESHOLD_EXPR,
  filterStreamingProgressTransformations,
} from '../../../utils/shared';
import { getDataSourceSrv } from '@grafana/runtime';
import { TabsBarScene, actionViewsDefinitions } from './Tabs/TabsBarScene';
import { isEqual } from 'lodash';
import {
  getDatasourceVariable,
  getGroupByVariable,
  getSpanListColumnsVariable,
  getTraceExplorationScene,
} from 'utils/utils';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from '../../../utils/analytics';
import { MiniREDPanel } from './MiniREDPanel';
import { Icon, LinkButton, Stack, Tooltip, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { getDefaultSelectionForMetric } from '../../../utils/comparison';
import { map, Observable } from 'rxjs';
import { ActionViewType } from 'exposedComponents/types';

export interface TraceSceneState extends SceneObjectState {
  body: SceneFlexLayout;
  actionView?: ActionViewType;

  attributes?: string[];
  selection?: ComparisonSelection;
  hasSetView?: boolean;
}

export class TracesByServiceScene extends SceneObjectBase<TraceSceneState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['actionView', 'selection'] });

  public constructor(state: MakeOptional<TraceSceneState, 'body'>) {
    super({
      body: state.body ?? new SceneFlexLayout({ children: [] }),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    // Get the initial actionView from URL if it exists i.e. coming from a bookmark
    const params = new URLSearchParams(window.location.search);
    const urlActionView = params.get('actionView');
    if (urlActionView && actionViewsDefinitions.find((v) => v.value === urlActionView)) {
      this.setState({ actionView: urlActionView as ActionViewType });
    }

    this.updateBody();

    const exploration = getTraceExplorationScene(this);
    const metricVariable = exploration.getMetricVariable();
    this._subs.add(
      metricVariable.subscribeToState((newState, prevState) => {
        if (newState.value !== prevState.value) {
          const selection = getDefaultSelectionForMetric(newState.value as MetricFunction);
          if (selection) {
            this.setState({ selection });
          }
          this.updateQueryRunner(newState.value as MetricFunction);
          this.updateBody();
        }
      })
    );

    this._subs.add(
      this.subscribeToState((newState, prevState) => {
        const timeRange = sceneGraph.getTimeRange(this);
        const selectionFrom = newState.selection?.timeRange?.from;
        // clear selection if it's out of time range
        if (selectionFrom && selectionFrom < timeRange.state.value.from.unix()) {
          this.setState({ selection: undefined });
        }

        // Set group by to All when starting a comparison
        if (!isEqual(newState.selection, prevState.selection)) {
          const groupByVar = getGroupByVariable(this);
          groupByVar.changeValueTo(ALL);
          this.updateQueryRunner(metricVariable.getValue() as MetricFunction);
        }
      })
    );

    this._subs.add(
      getDatasourceVariable(this).subscribeToState(() => {
        this.updateAttributes();
      })
    );

    this._subs.add(
      getSpanListColumnsVariable(this).subscribeToState(() => {
        this.updateQueryRunner(metricVariable.getValue() as MetricFunction);
      })
    );

    this.updateQueryRunner(metricVariable.getValue() as MetricFunction);
    this.updateAttributes();
  }

  updateBody() {
    const traceExploration = getTraceExplorationScene(this);
    const metric = traceExploration.getMetricVariable().getValue();
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === this.state.actionView);

    this.setState({
      body: buildGraphScene(
        metric as MetricFunction,
        actionViewDef ? [actionViewDef?.getScene(metric as MetricFunction)] : undefined
      ),
    });

    if (this.state.actionView === undefined) {
      this.setActionView('breakdown');
    }
  }

  private async updateAttributes() {
    const ds = await getDataSourceSrv().get(VAR_DATASOURCE_EXPR, { __sceneObject: { value: this } });

    if (!ds) {
      return;
    }

    ds.getTagKeys?.().then((tagKeys: GetTagResponse | MetricFindValue[]) => {
      let keys: MetricFindValue[] = [];
      if ('data' in tagKeys) {
        keys = (tagKeys as GetTagResponse).data;
      } else {
        keys = tagKeys;
      }
      const attributes = keys.map((l) => l.text);
      if (attributes !== this.state.attributes) {
        this.setState({ attributes });
      }
    });
  }

  getUrlState() {
    return {
      actionView: this.state.actionView,
      selection: this.state.selection ? JSON.stringify(this.state.selection) : undefined,
    };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    if (typeof values.actionView === 'string') {
      if (this.state.actionView !== values.actionView) {
        const actionViewDef = actionViewsDefinitions.find((v) => v.value === values.actionView);
        if (actionViewDef) {
          this.setActionView(actionViewDef.value);
        }
      }
    } else if (values.actionView === null) {
      this.setActionView('breakdown');
    }

    if (typeof values.selection === 'string') {
      const newSelection = JSON.parse(values.selection);
      if (!isEqual(newSelection, this.state.selection)) {
        this.setState({ selection: newSelection });
      }
    }
  }

  onUserUpdateSelection(newSelection: ComparisonSelection) {
    this._urlSync.performBrowserHistoryAction(() => {
      this.setState({ selection: newSelection });
    });
  }

  public setActionView(actionView?: ActionViewType) {
    const { body } = this.state;
    const actionViewDef = actionViewsDefinitions.find((v) => v.value === actionView);
    const traceExploration = getTraceExplorationScene(this);
    const metric = traceExploration.getMetricVariable().getValue();

    if (body.state.children.length > 1) {
      if (actionViewDef) {
        body.setState({
          children: [...body.state.children.slice(0, 2), actionViewDef.getScene(metric as MetricFunction)],
        });
        reportAppInteraction(USER_EVENTS_PAGES.analyse_traces, USER_EVENTS_ACTIONS.analyse_traces.action_view_changed, {
          oldAction: this.state.actionView,
          newAction: actionView,
        });
        this.setState({ actionView: actionViewDef.value });
      }
    }
  }

  private updateQueryRunner(metric: MetricFunction) {
    const selection = this.state.selection;
    const columns = getSpanListColumnsVariable(this).getValue()?.toString() ?? '';

    this.setState({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildQuery(metric, columns, selection)],
          $timeRange: timeRangeFromSelection(selection),
        }),
        transformations: [...filterStreamingProgressTransformations, ...spanListTransformations],
      }),
    });
  }

  static Component = ({ model }: SceneComponentProps<TracesByServiceScene>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <>
        <div className={styles.title}>
          <Tooltip content={<MetricTypeTooltip />} placement={'right-start'} interactive>
            <span className={styles.hand}>
              Select metric type <Icon name={'info-circle'} />
            </span>
          </Tooltip>
        </div>
        <body.Component model={body} />
      </>
    );
  };
}

const MetricTypeTooltip = () => {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction={'column'} gap={1}>
      <div className={styles.tooltip.title}>RED metrics for traces</div>
      <span className={styles.tooltip.subtitle}>
        Explore rate, errors, and duration (RED) metrics generated from traces by Tempo.
      </span>
      <div className={styles.tooltip.text}>
        <div>
          <span className={styles.tooltip.emphasize}>Rate</span> - Spans per second that match your filter, useful to
          find unusual spikes in activity
        </div>
        <div>
          <span className={styles.tooltip.emphasize}>Errors</span> -Spans that are failing, overall issues in tracing
          ecosystem
        </div>
        <div>
          <span className={styles.tooltip.emphasize}>Duration</span> - Amount of time those spans take, represented as a
          heat map (responds time, latency)
        </div>
      </div>

      <div className={styles.tooltip.button}>
        <LinkButton
          icon="external-link-alt"
          fill="solid"
          size={'sm'}
          target={'_blank'}
          href={
            'https://grafana.com/docs/grafana-cloud/visualizations/simplified-exploration/traces/concepts/#rate-error-and-duration-metrics'
          }
          onClick={() =>
            reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.metric_docs_link_clicked)
          }
        >
          Read documentation
        </LinkButton>
      </div>
    </Stack>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    title: css({
      label: 'title',
      display: 'flex',
      gap: theme.spacing.x0_5,
      fontSize: theme.typography.bodySmall.fontSize,
      paddingBottom: theme.spacing.x0_5,
      alignItems: 'center',
    }),
    hand: css({
      label: 'hand',
      cursor: 'pointer',
    }),
    tooltip: {
      label: 'tooltip',
      title: css({
        fontSize: '14px',
        fontWeight: 500,
      }),
      subtitle: css({
        marginBottom: theme.spacing.x1,
      }),
      text: css({
        label: 'text',
        color: theme.colors.text.secondary,

        div: {
          marginBottom: theme.spacing.x0_5,
        },
      }),
      emphasize: css({
        label: 'emphasize',
        color: theme.colors.text.primary,
      }),
      button: css({
        marginBottom: theme.spacing.x0_5,
      }),
    },
  };
}

const MAIN_PANEL_HEIGHT = 240;
export const MINI_PANEL_HEIGHT = (MAIN_PANEL_HEIGHT - 8) / 2;

export function buildQuery(type: MetricFunction, columns: string, selection?: ComparisonSelection) {
  const selectQuery = columns !== '' ? ` | select(${columns})` : '';
  let typeQuery = '';
  switch (type) {
    case 'errors':
      typeQuery = ' && status = error';
      break;
    case 'duration':
      if (selection) {
        const duration = [];
        if (selection.duration?.from.length) {
          duration.push(`duration >= ${selection.duration.from}`);
        }
        if (selection.duration?.to.length) {
          duration.push(`duration <= ${selection.duration.to}`);
        }
        if (duration.length) {
          typeQuery += '&& ' + duration.join(' && ');
        }
      }
      if (!typeQuery.length) {
        typeQuery = `&& duration > ${VAR_LATENCY_THRESHOLD_EXPR}`;
      }
      break;
  }
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}${typeQuery}}${selectQuery}`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 200,
    spss: 10,
    filters: [],
  };
}

function timeRangeFromSelection(selection?: ComparisonSelection) {
  const fromTimerange = (selection?.timeRange?.from || 0) * 1000;
  const toTimerange = (selection?.timeRange?.to || 0) * 1000;
  return fromTimerange && toTimerange
    ? new SceneTimeRange({
        from: fromTimerange.toFixed(0),
        to: toTimerange.toFixed(0),
        value: {
          from: dateTime(fromTimerange),
          to: dateTime(toTimerange),
          raw: { from: dateTime(fromTimerange), to: dateTime(toTimerange) },
        },
      })
    : undefined;
}

function buildGraphScene(metric: MetricFunction, children?: SceneObject[]) {
  const secondaryPanel =
    metric === 'rate'
      ? new MiniREDPanel({ metric: 'errors' })
      : new MiniREDPanel({
          metric: 'rate',
        });

  const tertiaryPanel =
    metric === 'duration'
      ? new MiniREDPanel({
          metric: 'errors',
        })
      : new MiniREDPanel({ metric: 'duration' });

  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [
      new behaviors.CursorSync({
        key: 'metricCrosshairSync',
        sync: DashboardCursorSync.Crosshair,
      }),
    ],
    children: [
      new SceneFlexLayout({
        direction: 'row',
        ySizing: 'content',
        children: [
          new SceneFlexItem({
            minHeight: MAIN_PANEL_HEIGHT,
            maxHeight: MAIN_PANEL_HEIGHT,
            width: '60%',
            body: new REDPanel({}),
          }),
          new SceneFlexLayout({
            direction: 'column',
            minHeight: MAIN_PANEL_HEIGHT,
            maxHeight: MAIN_PANEL_HEIGHT,
            children: [
              new SceneFlexItem({
                minHeight: MINI_PANEL_HEIGHT,
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,

                body: secondaryPanel,
              }),
              new SceneFlexItem({
                minHeight: MINI_PANEL_HEIGHT,
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,

                ySizing: 'fill',

                body: tertiaryPanel,
              }),
            ],
          }),
        ],
      }),
      new SceneFlexItem({
        ySizing: 'content',
        body: new TabsBarScene({}),
      }),
      ...(children || []),
    ],
  });
}

const spanListTransformations = [
  () => (source: Observable<DataFrame[]>) => {
    return source.pipe(
      map((data: DataFrame[]) => {
        return data.map((df) => ({
          ...df,
          fields: df.fields.filter((f) => !f.name.startsWith('nestedSet')),
        }));
      })
    );
  },
  {
    id: 'sortBy',
    options: {
      fields: {},
      sort: [
        {
          field: 'Duration',
          desc: true,
        },
      ],
    },
  },
  {
    id: 'organize',
    options: {
      indexByName: {
        'Start time': 0,
        status: 1,
        'Trace Service': 2,
        'Trace Name': 3,
        Duration: 4,
        'Span ID': 5,
        'span.http.method': 6,
        'span.http.request.method': 7,
        'span.http.path': 8,
        'span.http.route': 9,
        'span.http.status_code': 10,
        'span.http.response.status_code': 11,
      },
    },
  },
];
