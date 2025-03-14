import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2 } from '@grafana/data';
import {
  CustomVariable,
  DataSourceVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
} from '@grafana/scenes';
import { LocationService } from '@grafana/runtime';
import { Badge, Button, Drawer, Dropdown, Icon, Menu, Stack, Tooltip, useStyles2 } from '@grafana/ui';

import { TracesByServiceScene } from '../../components/Explore/TracesByService/TracesByServiceScene';
import {
  DATASOURCE_LS_KEY,
  MetricFunction,
  VAR_DATASOURCE,
  VAR_GROUPBY,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
  VAR_SPAN_LIST_COLUMNS,
} from '../../utils/shared';
import { getTraceExplorationScene, getFilterSignature, getFiltersVariable } from '../../utils/utils';
import { TraceDrawerScene } from '../../components/Explore/TracesByService/TraceDrawerScene';
import { FilterByVariable } from 'components/Explore/filters/FilterByVariable';
import { getSignalForKey, primarySignalOptions } from './primary-signals';
import { VariableHide } from '@grafana/schema';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import { BookmarkIcon } from 'pages/Home/bookmarks/BookmarkIcon';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];

  body: SceneObject;

  drawerScene?: TraceDrawerScene;
  primarySignal?: string;

  // details scene
  traceId?: string;
  spanId?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  locationService: LocationService;
}

const version = process.env.VERSION;
const buildTime = process.env.BUILD_TIME;
const commitSha = process.env.COMMIT_SHA;
const compositeVersion = `v${version} - ${buildTime?.split('T')[0]} (${commitSha})`;

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['primarySignal', 'traceId', 'spanId', 'metric'] });

  public constructor(state: { locationService: LocationService } & Partial<TraceExplorationState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.initialFilters),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      body: new TraceExplorationScene({}),
      drawerScene: new TraceDrawerScene({}),
      primarySignal: state.primarySignal ?? primarySignalOptions[0].value,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene() });
    }

    const datasourceVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable;
    datasourceVar.subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });
    this.subscribeToState((newState, oldState) => {
      if (newState.primarySignal && newState.primarySignal !== oldState.primarySignal) {
        this.updateFiltersWithPrimarySignal(newState.primarySignal, oldState.primarySignal);
      }
    });
  }

  public updateFiltersWithPrimarySignal(newSignal?: string, oldSignal?: string) {
    let signal = newSignal ?? this.state.primarySignal;

    const filtersVar = getFiltersVariable(this);
    let filters = filtersVar.state.filters;
    // Remove previous filter for primary signal
    if (oldSignal) {
      filters = filters.filter((f) => getFilterSignature(f) !== getFilterSignature(getSignalForKey(oldSignal)?.filter));
    }
    // Add new filter
    const newFilter = getSignalForKey(signal)?.filter;
    if (newFilter) {
      filters.unshift(newFilter);
    }
    filtersVar.setState({ filters });
  }

  getUrlState() {
    return { primarySignal: this.state.primarySignal, traceId: this.state.traceId, spanId: this.state.spanId };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<TraceExplorationState> = {};

    if (values.traceId || values.spanId) {
      stateUpdate.traceId = values.traceId ? (values.traceId as string) : undefined;
      stateUpdate.spanId = values.spanId ? (values.spanId as string) : undefined;
    }

    if (values.primarySignal && values.primarySignal !== this.state.primarySignal) {
      stateUpdate.primarySignal = values.primarySignal as string;
    }

    this.setState(stateUpdate);
  }

  public getMetricVariable() {
    const variable = sceneGraph.lookupVariable(VAR_METRIC, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Metric variable not found');
    }

    if (!variable.getValue()) {
      variable.changeValueTo('rate');
    }

    return variable;
  }

  public onChangePrimarySignal = (signal: string) => {
    if (!signal || this.state.primarySignal === signal) {
      return;
    }

    this._urlSync.performBrowserHistoryAction(() => {
      this.setState({ primarySignal: signal });
    });
  };

  public onChangeMetricFunction = (metric: string) => {
    const variable = this.getMetricVariable();
    if (!metric || variable.getValue() === metric) {
      return;
    }

    variable.changeValueTo(metric, undefined, true);
  };

  public getMetricFunction() {
    return this.getMetricVariable().getValue() as MetricFunction;
  }

  public closeDrawer() {
    this.setState({ traceId: undefined, spanId: undefined });
  }

  static Component = ({ model }: SceneComponentProps<TraceExploration>) => {
    const { body } = model.useState();
    const styles = useStyles2(getStyles);

    return <div className={styles.bodyContainer}> {body && <body.Component model={body} />} </div>;
  };
}

export class TraceExplorationScene extends SceneObjectBase {
  static Component = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
    const traceExploration = getTraceExplorationScene(model);
    const { controls, topScene, drawerScene, traceId } = traceExploration.useState();
    const styles = useStyles2(getStyles);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, traceExploration);
    const filtersVariable = getFiltersVariable(traceExploration);

    const menu = (
      <Menu>
        <div className={styles.menu}>
          <Menu.Item
            label="Give feedback"
            ariaLabel="Give feedback"
            icon={'comment-alt-message'}
            url="https://grafana.qualtrics.com/jfe/form/SV_9LUZ21zl3x4vUcS"
            target="_blank"
            onClick={() =>
              reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.global_docs_link_clicked)
            }
          />
          <Menu.Item
            label="Documentation"
            ariaLabel="Documentation"
            icon={'external-link-alt'}
            url="https://grafana.com/docs/grafana/next/explore/simplified-exploration/traces/"
            target="_blank"
            onClick={() =>
              reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.feedback_link_clicked)
            }
          />
        </div>
      </Menu>
    );

    return (
      <>
        <div className={styles.container}>
          <div className={styles.headerContainer}>
            <Stack gap={2} justifyContent={'space-between'} wrap={'wrap'}>
              {dsVariable && (
                <Stack gap={1} alignItems={'center'}>
                  <div className={styles.datasourceLabel}>Data source</div>
                  <dsVariable.Component model={dsVariable} />
                </Stack>
              )}
              <div className={styles.controls}>
                <BookmarkIcon model={model} />

                <Tooltip content={<PreviewTooltip text={compositeVersion} />} interactive>
                  <span className={styles.preview}>
                    <Badge text="&nbsp;Preview" color="blue" icon="rocket" />
                  </span>
                </Tooltip>

                <Dropdown overlay={menu} onVisibleChange={() => setMenuVisible(!menuVisible)}>
                  <Button variant="secondary" icon="info-circle">
                    Need help
                    <Icon className={styles.helpIcon} name={menuVisible ? 'angle-up' : 'angle-down'} size="lg" />
                  </Button>
                </Dropdown>
                {controls.map((control) => (
                  <control.Component key={control.state.key} model={control} />
                ))}
              </div>
            </Stack>
            <div className={styles.filters}>
              {filtersVariable && <filtersVariable.Component model={filtersVariable} />}
            </div>
          </div>
          <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
        </div>
        {drawerScene && traceId && (
          <Drawer title={`View trace ${traceId}`} size={'lg'} onClose={() => traceExploration.closeDrawer()}>
            <drawerScene.Component model={drawerScene} />
          </Drawer>
        )}
      </>
    );
  };
}

const PreviewTooltip = ({ text }: { text: string }) => {
  const styles = useStyles2(getStyles);

  return (
    <Stack direction={'column'} gap={2}>
      <div className={styles.tooltip}>{text}</div>
    </Stack>
  );
};

function getTopScene() {
  return new TracesByServiceScene({});
}

function getVariableSet(initialDS?: string, initialFilters?: AdHocVariableFilter[]) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: 'Data source',
        value: initialDS,
        pluginId: 'tempo',
      }),
      new FilterByVariable({
        initialFilters,
      }),
      new CustomVariable({
        name: VAR_METRIC,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_GROUPBY,
        defaultToAll: false,
      }),
      new CustomVariable({
        name: VAR_SPAN_LIST_COLUMNS,
        defaultToAll: false,
      }),
      new CustomVariable({
        name: VAR_LATENCY_THRESHOLD,
        defaultToAll: false,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_LATENCY_PARTIAL_THRESHOLD,
        defaultToAll: false,
        hide: VariableHide.hideVariable,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2) {
  return {
    bodyContainer: css({
      label: 'bodyContainer',
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
    }),
    container: css({
      label: 'container',
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(2),
      minHeight: '100%',
      flexDirection: 'column',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
      overflow: 'auto' /* Needed for sticky positioning */,
      height: '1px' /* Needed for sticky positioning */,
    }),
    body: css({
      label: 'body',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    headerContainer: css({
      label: 'headerContainer',
      backgroundColor: theme.colors.background.canvas,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      zIndex: 3,
      padding: `${theme.spacing(1.5)} 0`,
    }),
    datasourceLabel: css({
      label: 'datasourceLabel',
      fontSize: '12px',
    }),
    controls: css({
      label: 'controls',
      display: 'flex',
      gap: theme.spacing(1),
      zIndex: 3,
      flexWrap: 'wrap',
    }),
    menu: css({
      label: 'menu',
      'svg, span': {
        color: theme.colors.text.link,
      },
    }),
    preview: css({
      label: 'preview',
      cursor: 'help',

      '> div:first-child': {
        padding: '5.5px',
      },
    }),
    tooltip: css({
      label: 'tooltip',
      fontSize: '14px',
      lineHeight: '22px',
      width: '180px',
      textAlign: 'center',
    }),
    helpIcon: css({
      label: 'helpIcon',
      marginLeft: theme.spacing(1),
    }),
    filters: css({
      label: 'filters',
      backgroundColor: theme.colors.background.primary,
      marginTop: theme.spacing(1),
    }),
  };
}
