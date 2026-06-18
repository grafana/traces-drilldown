import { css } from '@emotion/css';
import React, { useCallback, useEffect } from 'react';

import { GrafanaTheme2, AdHocVariableFilter } from '@grafana/data';
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
import { useReturnToPrevious } from '@grafana/runtime';
import { Icon, Stack, useStyles2, LinkButton, Input } from '@grafana/ui';
import { t, Trans } from '@grafana/i18n';

import {
  DATASOURCE_LS_KEY,
  EventTraceOpened,
  MetricFunction,
  VAR_DATASOURCE,
  VAR_GROUPBY,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
  VAR_PRIMARY_SIGNAL,
  VAR_SPAN_LIST_COLUMNS,
  VAR_DURATION_PERCENTILES,
  DEFAULT_QUERY_RANGE_HOURS,
} from '../../utils/shared';
import {
  getTraceExplorationScene,
  getFiltersVariable,
  getPrimarySignalVariable,
  getUrlForExploration,
} from '../../utils/utils';
import { TraceDrawerScene } from '../../components/Explore/TracesByService/TraceDrawerScene';
import { VariableHide } from '@grafana/schema';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import { getKgSceneProps } from '../../utils/kgAnnotations';
import { isKgAnnotationsFeatureEnabled } from '../../featureFlags/featureFlags';
import { PrimarySignalVariable } from './PrimarySignalVariable';
import { primarySignalOptions } from './primary-signals';
import { TraceQLIssueDetector, TraceQLConfigWarning } from '../../components/Explore/TraceQLIssueDetector';
import { TracesByServiceScene } from 'components/Explore/TracesByService/TracesByServiceScene';
import { actionViewsDefinitions } from 'components/Explore/TracesByService/Tabs/TabsBarScene';
import { ActionViewType, SharedExplorationState } from 'exposedComponents/types';
import { EntityAssertionsWidget } from '../../addedComponents/EntityAssertionsWidget/EntityAssertionsWidget';
import { SmartDrawer } from './SmartDrawer';
import { AttributeFiltersVariable } from './AttributeFiltersVariable';
import { DataLinksCustomContext } from './DataLinksCustomContext';
import { TimeSeekerScene } from 'components/Explore/seeker/TimeSeekerScene';
import { LoadSearchScene } from '../../components/Explore/SavedSearches/LoadSearchScene';
import { SaveSearchButton } from '../../components/Explore/SavedSearches/SaveSearchButton';
import { PluginInfo } from '../../components/App/header/PluginInfo';
import { AddToDashboardModal } from '../../components/Explore/actions/addToDashboard/AddToDashboardModal';
import { EventOpenAddToDashboard, type PanelDataRequestPayload } from '../../components/Explore/actions/addToDashboard';

export interface TraceExplorationState extends SharedExplorationState, SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];

  body: SceneObject;

  drawerScene?: TraceDrawerScene;
  timeSeekerScene?: TimeSeekerScene;

  // details scene
  traceId?: string;
  spanId?: string;

  issueDetector?: TraceQLIssueDetector;

  // Plugin configuration
  queryRangeHours?: number;
  loadSearchScene?: LoadSearchScene;

  isAddToDashboardModalOpen: boolean;
  addToDashboardPanelData?: PanelDataRequestPayload;
}

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['traceId', 'spanId'] });
  private _kgInitialized = false;

  public constructor(state: Partial<TraceExplorationState>) {
    // Get query range from state or use default
    // Note: queryRangeHours should be passed from React components using usePluginJsonData() hook
    // See: https://grafana.com/developers/plugin-tools/tutorials/build-an-app-plugin#configuration-page
    const queryRangeHours = state.queryRangeHours ?? DEFAULT_QUERY_RANGE_HOURS;

    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state as TraceExplorationState),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      body: new TraceExplorationScene({}),
      drawerScene: new TraceDrawerScene({}),
      timeSeekerScene: new TimeSeekerScene({ queryRangeHours }),
      issueDetector: new TraceQLIssueDetector(),
      loadSearchScene: state.loadSearchScene ?? new LoadSearchScene({}),
      isAddToDashboardModalOpen: false,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene(this.state) });
    }

    if (!this._kgInitialized) {
      this._kgInitialized = true;
      if (isKgAnnotationsFeatureEnabled()) {
        const kg = getKgSceneProps();
        if (kg) {
          this.setState({
            $data: this.state.$data ?? kg.$data,
            $behaviors: [...(this.state.$behaviors ?? []), ...kg.behaviors],
            controls: [kg.controls, ...this.state.controls],
          });
        }
      }
    }

    this._subs.add(
      this.subscribeToEvent(EventTraceOpened, (event) => {
        this.setState({ traceId: event.payload.traceId, spanId: event.payload.spanId });
      })
    );

    this._subs.add(
      this.subscribeToEvent(EventOpenAddToDashboard, (event) => {
        this.openAddToDashboardModal(event.payload.panelData);
      })
    );

    const datasourceVar = sceneGraph.lookupVariable(VAR_DATASOURCE, this) as DataSourceVariable;
    datasourceVar.subscribeToState((newState) => {
      if (newState.value) {
        localStorage.setItem(DATASOURCE_LS_KEY, newState.value.toString());
      }
    });

    if (this.state.issueDetector) {
      if (!this.state.issueDetector.isActive) {
        this.state.issueDetector.activate();
      }
    }

    this._subs.add(
      this.subscribeToState((newState, prevState) => {
        if (newState.hideRedPanels === prevState.hideRedPanels) {
          return;
        }
        const top = newState.topScene;
        if (top instanceof TracesByServiceScene) {
          top.updateBody();
        }
      })
    );
  }

  getUrlState() {
    return { traceId: this.state.traceId, spanId: this.state.spanId };
  }

  updateFromUrl(values: SceneObjectUrlValues) {
    const stateUpdate: Partial<TraceExplorationState> = {};

    if (values.traceId || values.spanId) {
      stateUpdate.traceId = values.traceId ? (values.traceId as string) : undefined;
      stateUpdate.spanId = values.spanId ? (values.spanId as string) : undefined;
    }

    this.setState(stateUpdate);
  }

  public getMetricVariable() {
    const variable = sceneGraph.lookupVariable(VAR_METRIC, this);
    if (!(variable instanceof CustomVariable)) {
      throw new Error('Metric variable not found');
    }

    if (!variable.getValue()) {
      variable.changeValueTo(this.state.initialMetric ?? 'rate');
    }

    return variable;
  }

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

  public openAddToDashboardModal(panelData: PanelDataRequestPayload) {
    reportAppInteraction(
      USER_EVENTS_PAGES.analyse_traces,
      USER_EVENTS_ACTIONS.analyse_traces.add_to_dashboard_modal_opened
    );
    this.setState({
      isAddToDashboardModalOpen: true,
      addToDashboardPanelData: panelData,
    });
  }

  public closeAddToDashboardModal(): void {
    this.setState({
      isAddToDashboardModalOpen: false,
      addToDashboardPanelData: undefined,
    });
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
    const {
      controls,
      topScene,
      drawerScene,
      traceId,
      issueDetector,
      embedded,
      $timeRange,
      isAddToDashboardModalOpen,
      addToDashboardPanelData,
    } = traceExploration.useState();

    const { hasIssue } = issueDetector?.useState() || {
      hasIssue: false,
    };
    const styles = useStyles2(getStyles);

    const timeRangeState = $timeRange?.useState();

    const onClose = useCallback(() => traceExploration.closeDrawer(), [traceExploration]);

    return (
      <div className={styles.container} id="trace-exploration">
        {hasIssue && issueDetector && <TraceQLConfigWarning detector={issueDetector} />}
        {embedded ? <EmbeddedHeader model={model} /> : <TraceExplorationHeader controls={controls} model={model} />}
        <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
        <DataLinksCustomContext embedded={embedded} timeRange={timeRangeState?.value}>
          <SmartDrawer
            isOpen={!!drawerScene && !!traceId}
            onClose={onClose}
            title={t('trace-exploration.drawer.view-trace', 'View trace {{traceId}}', { traceId })}
            embedded={embedded}
            forceNoDrawer={embedded}
          >
            {drawerScene && <drawerScene.Component model={drawerScene} />}
          </SmartDrawer>
        </DataLinksCustomContext>
        {isAddToDashboardModalOpen && addToDashboardPanelData && (
          <AddToDashboardModal
            panelData={addToDashboardPanelData}
            onClose={() => traceExploration.closeAddToDashboardModal()}
          />
        )}
      </div>
    );
  };
}

export const useServiceName = (model: SceneObject) => {
  const [serviceName, setServiceName] = React.useState<string>();
  const traceExploration = getTraceExplorationScene(model);
  const filtersVariable = getFiltersVariable(traceExploration);

  const getServiceNameFromFilters = (filters: AdHocVariableFilter[]) => {
    const serviceNameFilter = filters.find((f) => f.key === 'resource.service.name');
    return serviceNameFilter?.operator === '=' || serviceNameFilter?.operator === '=~'
      ? serviceNameFilter?.value?.replace(/"/g, '')
      : undefined;
  };

  useEffect(() => {
    setServiceName(getServiceNameFromFilters(filtersVariable.state.filters));

    const sub = filtersVariable.subscribeToState((newState) => {
      setServiceName(getServiceNameFromFilters(newState.filters));
    });

    return () => {
      sub.unsubscribe();
    };
  }, [filtersVariable]);

  return serviceName;
};

const EmbeddedHeader = ({ model }: SceneComponentProps<TraceExplorationScene>) => {
  const setReturnToPrevious = useReturnToPrevious();
  const traceExploration = getTraceExplorationScene(model);
  const explorationState = traceExploration.useState();
  const { returnToPreviousSource, embeddedMini, hideRedPanels } = explorationState;
  const styles = useStyles2(getStyles, true, embeddedMini);
  const filtersVariable = getFiltersVariable(traceExploration);
  const primarySignalVariable = getPrimarySignalVariable(traceExploration);
  const timeRangeControl = traceExploration.state.controls.find((control) => control instanceof SceneTimePicker);
  const refreshControl = traceExploration.state.controls.find((control) => control instanceof SceneRefreshPicker);

  const timeRangeState = traceExploration.state.$timeRange?.useState();
  const filtersVariableState = filtersVariable.useState();
  const metricVariableState = traceExploration.getMetricVariable().useState();
  const [explorationUrl, setExplorationUrl] = React.useState(() => getUrlForExploration(traceExploration));

  // Force the primary signal to be 'All Spans'
  primarySignalVariable?.changeValueTo(primarySignalOptions[1].value!);

  useEffect(() => {
    setExplorationUrl(getUrlForExploration(traceExploration));
  }, [timeRangeState, filtersVariableState, metricVariableState, traceExploration]);

  return (
    <div className={styles.headerContainer}>
      <Stack gap={1} alignItems={'center'} wrap={'wrap'} justifyContent="space-between">
        <primarySignalVariable.Component model={primarySignalVariable} />
        {filtersVariable && (
          <div>
            <filtersVariable.Component model={filtersVariable} />
          </div>
        )}
        <Stack gap={1} alignItems={'center'}>
          <LinkButton
            href={explorationUrl}
            variant="secondary"
            icon="arrow-right"
            onClick={() => {
              setReturnToPrevious(returnToPreviousSource || 'previous');
              reportAppInteraction(USER_EVENTS_PAGES.common, USER_EVENTS_ACTIONS.common.go_to_full_app_clicked);
            }}
          >
            <Trans i18nKey="trace-exploration.embedded-header.traces-drilldown">Traces Drilldown</Trans>
          </LinkButton>
          {timeRangeControl && !hideRedPanels && <timeRangeControl.Component model={timeRangeControl} />}
          {refreshControl && !hideRedPanels && <refreshControl.Component model={refreshControl} />}
        </Stack>
      </Stack>
    </div>
  );
};

interface TraceExplorationHeaderProps {
  controls: SceneObject[];
  model: SceneObject;
}

const TraceExplorationHeader = ({ controls, model }: TraceExplorationHeaderProps) => {
  const styles = useStyles2(getStyles);
  const serviceName = useServiceName(model);
  const traceExploration = getTraceExplorationScene(model);

  const { traceId } = traceExploration.useState();

  const [localTraceId, setLocalTraceId] = React.useState(traceId ?? '');

  const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, traceExploration);
  const filtersVariable = getFiltersVariable(traceExploration);
  const primarySignalVariable = getPrimarySignalVariable(traceExploration);

  useEffect(() => {
    setLocalTraceId(traceId ?? '');
  }, [traceId]);

  const onTraceIdSubmit = () => {
    if (localTraceId !== traceId) {
      traceExploration.setState({ traceId: localTraceId });
    }
  };

  return (
    <div className={styles.headerContainer}>
      <Stack gap={1} justifyContent={'space-between'} wrap={'wrap'}>
        <Stack gap={1} alignItems={'center'} wrap={'wrap'}>
          {dsVariable && (
            <Stack gap={0} alignItems={'center'}>
              <div className={styles.datasourceLabel}>
                <Trans i18nKey="trace-exploration.header.data-source">Data source</Trans>
              </div>
              <dsVariable.Component model={dsVariable} />
            </Stack>
          )}
        </Stack>
        <div className={styles.controls}>
          <EntityAssertionsWidget serviceName={serviceName || ''} model={model} />
          <SaveSearchButton sceneRef={model} />
          {traceExploration.state.loadSearchScene && (
            <traceExploration.state.loadSearchScene.Component model={traceExploration.state.loadSearchScene} />
          )}
          {controls.map((control) => (
            <control.Component key={control.state.key} model={control} />
          ))}
          <PluginInfo />
        </div>
      </Stack>
      <Stack gap={1} alignItems={'flex-start'} justifyContent={'space-between'}>
        <Stack gap={1} alignItems={'center'} wrap={'wrap'}>
          <Stack gap={0} alignItems={'center'}>
            <div className={styles.datasourceLabel}>
              <Trans i18nKey="trace-exploration.header.filters">Filters</Trans>
            </div>
            {primarySignalVariable && <primarySignalVariable.Component model={primarySignalVariable} />}
          </Stack>
          {filtersVariable && (
            <div>
              <filtersVariable.Component model={filtersVariable} />
            </div>
          )}
        </Stack>
        <Stack gap={0} alignItems={'center'}>
          <div className={styles.datasourceLabel}>
            <Trans i18nKey="trace-exploration.header.trace-id">Trace ID</Trans>
          </div>
          <Input
            placeholder={t('trace-exploration.header.trace-id-placeholder', 'Enter an ID and press Enter')}
            value={localTraceId ?? ''}
            suffix={
              <Stack direction="row" alignItems="center" gap={1} width="40px">
                {localTraceId && (
                  <>
                    <Icon name="times" onClick={() => setLocalTraceId('')} cursor="pointer" />
                    <Icon name="enter" onClick={onTraceIdSubmit} cursor="pointer" />
                  </>
                )}
              </Stack>
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setLocalTraceId(e.currentTarget.value);
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.blur();

                onTraceIdSubmit();
              }
            }}
          />
        </Stack>
      </Stack>
    </div>
  );
};

function getTopScene(state: TraceExplorationState) {
  const metric = state.initialMetric ?? 'rate';
  const requestedView = state.initialActionView;

  if (!requestedView) {
    return new TracesByServiceScene({});
  }

  const isKnownView = actionViewsDefinitions.some((view) => view.value === requestedView);
  if (!isKnownView) {
    return new TracesByServiceScene({});
  }

  if (state.allowedActionViews?.length && !state.allowedActionViews.includes(requestedView)) {
    return new TracesByServiceScene({});
  }

  if (requestedView === 'exceptions' && metric !== 'errors') {
    return new TracesByServiceScene({});
  }

  return new TracesByServiceScene({ actionView: requestedView as ActionViewType });
}

function getVariableSet(state: TraceExplorationState) {
  return new SceneVariableSet({
    variables: [
      new DataSourceVariable({
        name: VAR_DATASOURCE,
        label: t('trace-exploration.variable.data-source', 'Data source'),
        value: state.initialDS,
        pluginId: 'tempo',
        isReadOnly: state.embedded,
      }),
      new PrimarySignalVariable({
        name: VAR_PRIMARY_SIGNAL,
        isReadOnly: state.embedded,
      }),
      new AttributeFiltersVariable({
        initialFilters: state.initialFilters,
      }),
      new CustomVariable({
        name: VAR_METRIC,
        hide: VariableHide.hideVariable,
      }),
      new CustomVariable({
        name: VAR_GROUPBY,
        defaultToAll: false,
        value: state.initialGroupBy,
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
      new CustomVariable({
        name: VAR_DURATION_PERCENTILES,
        label: t('trace-exploration.variable.duration-percentiles', 'Duration Percentiles'),
        value: ['0.9'], // Default to 90th percentile
        isMulti: true,
        includeAll: false,
      }),
    ],
  });
}

function getStyles(theme: GrafanaTheme2, embedded?: boolean, embeddedMini?: boolean) {
  return {
    bodyContainer: css({
      label: 'bodyContainer',
      flexGrow: 1,
      display: 'flex',
      minHeight: '100%',
      flexDirection: 'column',
      minWidth: '380px',
    }),
    container: css({
      label: 'container',
      flexGrow: 1,
      display: 'flex',
      gap: theme.spacing(1),
      minHeight: '100%',
      flexDirection: 'column',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
      overflow: 'auto' /* Needed for sticky positioning */,
      maxHeight: '100%' /* Needed for sticky positioning */,
      position: 'relative', // Needed for the drawer to be positioned correctly
    }),
    drawerHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      paddingBottom: theme.spacing(2),
      marginBottom: theme.spacing(2),

      h3: {
        margin: 0,
      },
    }),
    drawerHeaderButtons: css({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: theme.spacing(1.5),
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
      backgroundColor: embedded ? theme.colors.background.primary : theme.colors.background.canvas,
      display: embeddedMini ? 'none' : 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      zIndex: 3,
      padding: `${theme.spacing(1.5)} 0 0 0`,
      gap: theme.spacing(1),
    }),
    datasourceLabel: css({
      label: 'datasourceLabel',
      fontSize: '12px',
      padding: `0 ${theme.spacing(1)}`,
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontWeight: theme.typography.fontWeightMedium,
      position: 'relative',
      right: -1,
      width: '90px',
    }),
    controls: css({
      label: 'controls',
      display: 'flex',
      gap: theme.spacing(1),
      zIndex: 3,
      flexWrap: 'wrap',
    }),
    tooltip: css({
      label: 'tooltip',
      fontSize: '14px',
      lineHeight: '22px',
      width: '180px',
      textAlign: 'center',
    }),
    filters: css({
      label: 'filters',
      marginTop: theme.spacing(1),
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
