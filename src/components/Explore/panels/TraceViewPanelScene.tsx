import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  sceneGraph,
  SceneObject,
  VizPanel,
} from '@grafana/scenes';
import { DataFrame, LoadingState, GrafanaTheme2, dateTimeFormat, DataQueryError } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { ErrorStateScene } from 'components/states/ErrorState/ErrorStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2 } from '@grafana/ui';
import { getDataSource, getTraceExplorationScene } from 'utils/utils';
import { TempoDatasource } from 'types';
import { TraceLogsActions } from 'tracesToLogs/TraceLogsActions';
import { getTraceServiceNames, getTraceTimeBoundsMs } from 'tracesToLogs/frames';
import { resolveTraceLogsTarget } from 'tracesToLogs/resolveTraceLogsTarget';
import { addCorrelationLinksTransformation, addTraceLogsLinksTransformation } from 'tracesToLogs/transformations';
import { TimeBoundsMs, TraceLogsTarget } from 'tracesToLogs/types';

const TRACE_BY_ID_QUERY_REF_ID = 'traceById';

interface TracePanelState extends SceneObjectState {
  panel?: SceneObject;
  traceId: string;
  spanId?: string;
  /** Resolved by the layered trace to logs lookup once trace data has arrived. */
  logsTarget?: TraceLogsTarget;
  logsBounds?: TimeBoundsMs;
  logsServiceNames?: string[];
  logsTempoDatasourceUid?: string;
}

export class TraceViewPanelScene extends SceneObjectBase<TracePanelState> {
  private async getTraceErrorMessage(errors: DataQueryError[], traceId: string): Promise<string> {
    const errorMessage = errors?.[0]?.message || '';
    const status = errors?.[0]?.status;

    if (status === 404 || errorMessage.toLowerCase().includes('not found')) {
      try {
        // Get the datasource to check timeShiftEnabled configuration
        // Ideally this error would be returned by the datasource, but it's not currently supported.
        const datasourceUid = getDataSource(getTraceExplorationScene(this));
        const datasource = await getDataSourceSrv().get(datasourceUid);

        // Check if the datasource has traceQuery.timeShiftEnabled set to true
        if (datasource) {
          const tempoDatasource = datasource as unknown as TempoDatasource;

          if (tempoDatasource.traceQuery?.timeShiftEnabled) {
            const timeRange = sceneGraph.getTimeRange(this).state.value;

            // Get time shift values from datasource configuration
            const spanStartTimeShift = tempoDatasource.traceQuery?.spanStartTimeShift;
            const spanEndTimeShift = tempoDatasource.traceQuery?.spanEndTimeShift;

            // Apply time shift to the time range
            const adjustedFromTime = timeRange.from.valueOf() - parseInt(spanStartTimeShift || '0', 10);
            const adjustedToTime = timeRange.to.valueOf() + parseInt(spanEndTimeShift || '0', 10);

            const formattedFromTime = dateTimeFormat(adjustedFromTime);
            const formattedToTime = dateTimeFormat(adjustedToTime);

            return `Trace with ID "${traceId}" couldn't be found. The data source is configured to use the selected time range when searching for traces and the trace might exist but not be within the selected time range of ${formattedFromTime} to ${formattedToTime}.`;
          }
        }
      } catch (dsError) {
        console.warn('Failed to check datasource configuration:', dsError);
      }

      return `Trace with ID "${traceId}" couldn't be found.`;
    }

    return errorMessage || 'An error occurred while loading the trace.';
  }
  /** Guards against re-resolving on every data emission, including our own reprocess. */
  private logsResolutionStarted = false;

  constructor(state: TracePanelState) {
    super({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [{ refId: TRACE_BY_ID_QUERY_REF_ID, query: state.traceId, queryType: 'traceql' }],
        }),
        transformations: [
          addCorrelationLinksTransformation(() => this.state.logsTempoDatasourceUid, TRACE_BY_ID_QUERY_REF_ID),
          addTraceLogsLinksTransformation(() => this.state.logsTarget, state.traceId),
        ],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      // Needed by both transformations and by the write back action, and only resolvable once the
      // object is part of the scene tree.
      this.setState({ logsTempoDatasourceUid: getDataSource(getTraceExplorationScene(this)) });

      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            // Rebuilding the panel resets trace view interaction state, so only build it once.
            if (!(this.state.panel instanceof VizPanel)) {
              this.setState({
                panel: this.getVizPanel().build(),
              });
            }

            this.resolveLogsTarget(data.data.series ?? []);
          } else if (data.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new LoadingStateScene({
                component: SkeletonComponent,
              }),
            });
          } else if (data.data?.state === LoadingState.Error) {
            this.getTraceErrorMessage(data.data?.errors || [], this.state.traceId)
              .then((errorMessage) => {
                this.setState({
                  panel: new ErrorStateScene({
                    message: errorMessage,
                  }),
                });
              })
              .catch((err) => {
                console.error('Failed to generate error message:', err);
                this.setState({
                  panel: new ErrorStateScene({
                    message: `Trace with ID "${this.state.traceId}" couldn't be found.`,
                  }),
                });
              });
          }
        })
      );
    });
  }

  /**
   * Works out where the logs for this trace live, once we know which services it touches.
   *
   * Runs once per trace: the result is cached and reprocessing the transformations emits another
   * `Done` state, which would otherwise re-enter here.
   */
  private resolveLogsTarget(frames: DataFrame[]) {
    const tempoDatasourceUid = this.state.logsTempoDatasourceUid;

    if (this.logsResolutionStarted || !tempoDatasourceUid || !frames.length) {
      return;
    }

    const serviceNames = getTraceServiceNames(frames);

    if (!serviceNames.length) {
      return;
    }

    this.logsResolutionStarted = true;

    const timeRange = sceneGraph.getTimeRange(this).state.value;
    const bounds = getTraceTimeBoundsMs(frames, {
      fromMs: timeRange.from.valueOf(),
      toMs: timeRange.to.valueOf(),
    });

    this.setState({ logsServiceNames: serviceNames, logsBounds: bounds });

    resolveTraceLogsTarget({
      tempoDatasourceUid,
      traceId: this.state.traceId,
      serviceNames,
      bounds,
    })
      .then((logsTarget) => {
        if (!logsTarget) {
          return;
        }

        this.setState({ logsTarget });

        // Only re-run the transformations when we are the ones adding span links. When the Tempo
        // data source is configured, core already renders them and there is nothing to inject.
        if (logsTarget.ownsSpanLinks) {
          const data = sceneGraph.getData(this);

          if (data instanceof SceneDataTransformer) {
            data.reprocessTransformations();
          }
        }
      })
      .catch((error) => {
        console.warn('Failed to resolve a logs target for the trace', error);
      });
  }

  private getVizPanel() {
    const panel = PanelBuilders.traces()
      .setHoverHeader(true)
      .setHeaderActions(<TraceLogsActions model={this} />);
    if (this.state.spanId) {
      panel.setOption('focusedSpanId' as any, this.state.spanId as any);
    }
    return panel;
  }

  public static Component = ({ model }: SceneComponentProps<TraceViewPanelScene>) => {
    const { panel } = model.useState();
    const styles = useStyles2(getStyles);

    if (!panel) {
      return;
    }

    return (
      <div className={styles.panelContainer}>
        <panel.Component model={panel} />
      </div>
    );
  };
}

const SkeletonComponent = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Skeleton count={1} width={60} />
        <Skeleton count={1} width={60} />
      </div>
      <Skeleton count={2} width={'80%'} />
      <div className={styles.map}>
        <Skeleton count={1} />
        <Skeleton count={1} height={70} />
      </div>

      <div className={styles.span}>
        <span className={styles.service1}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar1}>
          <Skeleton count={1} />
        </span>
      </div>
      <div className={styles.span}>
        <span className={styles.service2}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar2}>
          <Skeleton count={1} />
        </span>
      </div>
      <div className={styles.span}>
        <span className={styles.service3}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar3}>
          <Skeleton count={1} />
        </span>
      </div>
      <div className={styles.span}>
        <span className={styles.service4}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar4}>
          <Skeleton count={1} />
        </span>
      </div>
      <div className={styles.span}>
        <span className={styles.service5}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar5}>
          <Skeleton count={1} />
        </span>
      </div>
      <div className={styles.span}>
        <span className={styles.service6}>
          <Skeleton count={1} />
        </span>
        <span className={styles.bar6}>
          <Skeleton count={1} />
        </span>
      </div>
    </div>
  );
};

function getStyles(theme: GrafanaTheme2) {
  return {
    panelContainer: css({
      display: 'flex',
      height: '100%',

      '& [data-testid="data-testid panel content"] > div': {
        overflow: 'auto',
      },

      '& .show-on-hover': {
        display: 'none',
      },
    }),
    container: css({
      height: 'calc(100% - 32px)',
      width: 'calc(100% - 32px)',
      position: 'absolute',
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.weak}`,
      padding: '5px',
    }),
    header: css({
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
    }),
    map: css({
      marginTop: '20px',
      marginBottom: '20px',
    }),
    span: css({
      display: 'flex',
    }),
    service1: css({
      width: '25%',
    }),
    bar1: css({
      marginLeft: '5%',
      width: '70%',
    }),
    service2: css({
      width: '25%',
    }),
    bar2: css({
      marginLeft: '10%',
      width: '15%',
    }),
    service3: css({
      width: '20%',
      marginLeft: '5%',
    }),
    bar3: css({
      marginLeft: '10%',
      width: '65%',
    }),
    service4: css({
      width: '20%',
      marginLeft: '5%',
    }),
    bar4: css({
      marginLeft: '15%',
      width: '60%',
    }),
    service5: css({
      width: '15%',
      marginLeft: '10%',
    }),
    bar5: css({
      marginLeft: '20%',
      width: '35%',
    }),
    service6: css({
      width: '15%',
      marginLeft: '10%',
    }),
    bar6: css({
      marginLeft: '30%',
      width: '15%',
    }),
  };
}
