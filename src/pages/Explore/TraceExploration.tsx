import { css } from '@emotion/css';
import React from 'react';

import { AdHocVariableFilter, GrafanaTheme2, LoadingState, PluginExtensionLink } from '@grafana/data';
import {
  AdHocFiltersVariable,
  CustomVariable,
  DataSourceVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectUrlSyncConfig,
  SceneObjectUrlValues,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
} from '@grafana/scenes';
import { config } from '@grafana/runtime';
import { Badge, Button, Drawer, Dropdown, Icon, IconButton, Menu, Stack, Tooltip, useStyles2 } from '@grafana/ui';

import { TracesByServiceScene } from '../../components/Explore/TracesByService/TracesByServiceScene';
import {
  DATASOURCE_LS_KEY,
  EventTraceOpened,
  explorationDS,
  MetricFunction,
  VAR_DATASOURCE,
  VAR_FILTERS,
  VAR_GROUPBY,
  VAR_LATENCY_PARTIAL_THRESHOLD,
  VAR_LATENCY_THRESHOLD,
  VAR_METRIC,
  VAR_PRIMARY_SIGNAL,
  VAR_SPAN_LIST_COLUMNS,
} from '../../utils/shared';
import { getTraceExplorationScene, getFiltersVariable, getPrimarySignalVariable, getDataSource } from '../../utils/utils';
import { TraceDrawerScene } from '../../components/Explore/TracesByService/TraceDrawerScene';
import { primarySignalOptions } from './primary-signals';
import { VariableHide } from '@grafana/schema';
import { reportAppInteraction, USER_EVENTS_ACTIONS, USER_EVENTS_PAGES } from 'utils/analytics';
import { PrimarySignalVariable } from './PrimarySignalVariable';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { TraceQLIssueDetector, TraceQLConfigWarning } from '../../components/Explore/TraceQLIssueDetector';
import { AddToInvestigationButton } from 'components/Explore/actions/AddToInvestigationButton';
import { ADD_TO_INVESTIGATION_MENU_TEXT, getInvestigationLink } from 'components/Explore/panels/PanelMenu';

export interface TraceExplorationState extends SceneObjectState {
  topScene?: SceneObject;
  controls: SceneObject[];

  body: SceneObject;

  drawerScene?: TraceDrawerScene;

  // details scene
  traceId?: string;
  spanId?: string;

  // just for the starting data source
  initialDS?: string;
  initialFilters?: AdHocVariableFilter[];

  issueDetector?: TraceQLIssueDetector;

  investigationLink?: PluginExtensionLink;
  addToInvestigationButton?: AddToInvestigationButton;
}

const version = process.env.VERSION;
const buildTime = process.env.BUILD_TIME;
const commitSha = process.env.COMMIT_SHA;
const compositeVersion = `v${version} - ${buildTime?.split('T')[0]} (${commitSha})`;

export class TraceExploration extends SceneObjectBase<TraceExplorationState> {
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['primarySignal', 'traceId', 'spanId', 'metric'] });

  public constructor(state: Partial<TraceExplorationState>) {
    super({
      $timeRange: state.$timeRange ?? new SceneTimeRange({}),
      $variables: state.$variables ?? getVariableSet(state.initialDS, state.initialFilters),
      controls: state.controls ?? [new SceneTimePicker({}), new SceneRefreshPicker({})],
      body: new TraceExplorationScene({}),
      drawerScene: new TraceDrawerScene({}),
      issueDetector: new TraceQLIssueDetector(),
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  public _onActivate() {
    if (!this.state.topScene) {
      this.setState({ topScene: getTopScene() });
    }

    this._subs.add(
      this.subscribeToEvent(EventTraceOpened, (event) => {
        this.setupInvestigationButton(event.payload.traceId);
        this.setState({ traceId: event.payload.traceId, spanId: event.payload.spanId });
      })
    );

    if (this.state.traceId) {
      this.setupInvestigationButton(this.state.traceId);
    }

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
      variable.changeValueTo('rate');
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

  private setupInvestigationButton(traceId: string) {
    const traceExploration = getTraceExplorationScene(this);
    const dsUid = getDataSource(traceExploration);

    const queryRunner = new SceneQueryRunner({
      datasource: { uid: dsUid },
      queries: [{ 
        refId: 'A', 
        query: traceId, 
        queryType: 'traceql',
      }],
    });

    const addToInvestigationButton = new AddToInvestigationButton({
      query: traceId,
      type: 'trace',
      dsUid,
      $data: queryRunner,
    });
    
    addToInvestigationButton.activate();
    this.setState({ addToInvestigationButton });
    this._subs.add(
      addToInvestigationButton.subscribeToState(() => {
        this.updateInvestigationLink();
      })
    );
        
    queryRunner.activate();
    
    this._subs.add(
      queryRunner.subscribeToState((state) => {
        if (state.data?.state === LoadingState.Done && state.data?.series?.length > 0) {
          const serviceNameField = state.data.series[0]?.fields?.find((f) => f.name === 'serviceName');
          
          if (serviceNameField && serviceNameField.values[0]) {
            addToInvestigationButton.setState({
              ...addToInvestigationButton.state,
              labelValue: `${serviceNameField.values[0]}`,
            });
          }
        }
      })
    );
    
    addToInvestigationButton.setState({
      ...addToInvestigationButton.state,
      labelValue: traceId,
    });
  }

  private async updateInvestigationLink() {
    const { addToInvestigationButton } = this.state;
    if (!addToInvestigationButton) { 
      return;
    }

    const link = await getInvestigationLink(addToInvestigationButton);
    if (link) {
      this.setState({ investigationLink: link });
    }
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
    const { controls, topScene, drawerScene, traceId, issueDetector, investigationLink, addToInvestigationButton } = traceExploration.useState();
    const { hasIssue } = issueDetector?.useState() || {
      hasIssue: false,
    };
    const styles = useStyles2(getStyles);
    const [menuVisible, setMenuVisible] = React.useState(false);

    const dsVariable = sceneGraph.lookupVariable(VAR_DATASOURCE, traceExploration);
    const filtersVariable = getFiltersVariable(traceExploration);
    const primarySignalVariable = getPrimarySignalVariable(traceExploration);

    const menu = (
      <Menu>
        <div className={styles.menu}>
          {config.feedbackLinksEnabled && (
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
          )}
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

    const addToInvestigationClicked = (e: React.MouseEvent) => {
      if (investigationLink?.onClick) {
        investigationLink.onClick(e);
      }
      
      reportAppInteraction(
        USER_EVENTS_PAGES.analyse_traces,
        USER_EVENTS_ACTIONS.analyse_traces.add_to_investigation_trace_view_clicked
      );
      
      setTimeout(() => traceExploration.closeDrawer(), 100);
    };

    return (
      <>
        <div className={styles.container}>
          <div className={styles.headerContainer}>
            {hasIssue && issueDetector && <TraceQLConfigWarning detector={issueDetector} />}
            <Stack gap={1} justifyContent={'space-between'} wrap={'wrap'}>
              <Stack gap={1} alignItems={'center'} wrap={'wrap'}>
                {dsVariable && (
                  <Stack gap={0} alignItems={'center'}>
                    <div className={styles.datasourceLabel}>Data source</div>
                    <dsVariable.Component model={dsVariable} />
                  </Stack>
                )}
              </Stack>

              <div className={styles.controls}>
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
            <Stack gap={1} alignItems={'center'} wrap={'wrap'}>
              <Stack gap={0} alignItems={'center'}>
                <div className={styles.datasourceLabel}>Filters</div>
                {primarySignalVariable && <primarySignalVariable.Component model={primarySignalVariable} />}
              </Stack>
              {filtersVariable && (
                <div>
                  <filtersVariable.Component model={filtersVariable} />
                </div>
              )}
            </Stack>
          </div>
          <div className={styles.body}>{topScene && <topScene.Component model={topScene} />}</div>
        </div>
        {drawerScene && traceId && (
          <Drawer size={'lg'} onClose={() => traceExploration.closeDrawer()}>
            <div className={styles.drawerHeader}>
              <h3>View trace {traceId}</h3>
                <div className={styles.drawerHeaderButtons}>
                  {addToInvestigationButton && investigationLink && (
                    <Button
                      variant='secondary'
                      size='sm'
                      icon='plus-square'
                      onClick={addToInvestigationClicked}
                    >
                      {ADD_TO_INVESTIGATION_MENU_TEXT}
                    </Button>
                  )}
                  <IconButton 
                    name='times' 
                    onClick={() => traceExploration.closeDrawer()} 
                    tooltip='Close drawer'
                  />
                </div>
            </div>
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
      new PrimarySignalVariable({
        name: VAR_PRIMARY_SIGNAL,
        value: primarySignalOptions[0].value,
      }),
      new AdHocFiltersVariable({
        addFilterButtonText: 'Add filter',
        hide: VariableHide.hideLabel,
        name: VAR_FILTERS,
        datasource: explorationDS,
        layout: 'combobox',
        filters: initialFilters ?? [],
        allowCustomValue: true,
        expressionBuilder: renderTraceQLLabelFilters,
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
      gap: theme.spacing(1),
      minHeight: '100%',
      flexDirection: 'column',
      padding: `0 ${theme.spacing(2)} ${theme.spacing(2)} ${theme.spacing(2)}`,
      overflow: 'auto', /* Needed for sticky positioning */
      maxHeight: '100%' /* Needed for sticky positioning */
    }),
    drawerHeader: css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      paddingBottom: theme.spacing(2),
      marginBottom: theme.spacing(2),
    }),
    drawerHeaderButtons: css({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: theme.spacing(1.5),
      padding: `0 0 ${theme.spacing(1)} 0`,
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
      marginTop: theme.spacing(1),
      display: 'flex',
      gap: theme.spacing(1),
    }),
  };
}
