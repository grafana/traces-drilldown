import React from 'react';

import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  PanelBuilders,
  SceneQueryRunner,
  sceneGraph,
  SceneObject,
} from '@grafana/scenes';
import { LoadingState, GrafanaTheme2, dateTimeFormat } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { ErrorStateScene } from 'components/states/ErrorState/ErrorStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2 } from '@grafana/ui';
import { getDataSource, getTraceExplorationScene } from 'utils/utils';

export interface TracePanelState extends SceneObjectState {
  panel?: SceneObject;
  traceId: string;
  spanId?: string;
}

export class TraceViewPanelScene extends SceneObjectBase<TracePanelState> {
  private async getTraceErrorMessage(error: any, traceId: string): Promise<string> {
    const errorMessage = error?.message || '';
    const status = error?.status;

    if (status === 404 || errorMessage.toLowerCase().includes('not found')) {
      try {
        // Get the datasource to check timeShiftEnabled configuration
        // Ideally this error would be returned by the datasource, but it's not currently supported.
        const datasourceUid = getDataSource(getTraceExplorationScene(this));
        const datasource = await getDataSourceSrv().get(datasourceUid);

        // Check if the datasource has traceQuery.timeShiftEnabled set to true
        if (datasource && (datasource as any).traceQuery?.timeShiftEnabled) {
          const timeRange = sceneGraph.getTimeRange(this).state.value;

          // Get timeshift values from datasource configuration
          const spanStartTimeShift = (datasource as any).spanStartTimeShift || 0;
          const spanEndTimeShift = (datasource as any).spanEndTimeShift || 0;

          // Apply timeshift to the time range
          const adjustedFromTime = timeRange.from.valueOf() - spanStartTimeShift;
          const adjustedToTime = timeRange.to.valueOf() + spanEndTimeShift;

          const formattedFromTime = dateTimeFormat(adjustedFromTime);
          const formattedToTime = dateTimeFormat(adjustedToTime);

          return `Trace with ID "${traceId}" couldn't be found. The data source is configured to use the selected time range when searching for traces and the trace might exist but not be within the selected time range of ${formattedFromTime} to ${formattedToTime}.`;
        }
      } catch (dsError) {
        console.warn('Failed to check datasource configuration:', dsError);
      }

      return `Trace with ID "${traceId}" couldn't be found.`;
    }

    return errorMessage || 'An error occurred while loading the trace.';
  }
  constructor(state: TracePanelState) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ refId: 'A', query: state.traceId, queryType: 'traceql' }],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done) {
            this.setState({
              panel: this.getVizPanel().build(),
            });
          } else if (data.data?.state === LoadingState.Loading) {
            this.setState({
              panel: new LoadingStateScene({
                component: SkeletonComponent,
              }),
            });
          } else if (data.data?.state === LoadingState.Error) {
            this.getTraceErrorMessage(data.data?.error, this.state.traceId)
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

  private getVizPanel() {
    const panel = PanelBuilders.traces().setHoverHeader(true);
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
