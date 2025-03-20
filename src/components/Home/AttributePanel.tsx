import React from 'react';

import {
  SceneComponentProps,
  SceneFlexLayout,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { GrafanaTheme2, LoadingState } from '@grafana/data';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { MINI_PANEL_HEIGHT } from 'components/Explore/TracesByService/TracesByServiceScene';
import { AttributePanelScene } from './AttributePanelScene';
import Skeleton from 'react-loading-skeleton';
import { getErrorMessage, getNoDataMessage } from 'utils/utils';
import { getMinimumsForDuration, getYBuckets } from 'components/Explore/TracesByService/REDPanel';

export type HomepagePanelType = 'errored-services' | 'slowest-services' | 'slowest-traces';

export interface AttributePanelState extends SceneObjectState {
  panel?: SceneFlexLayout;
  query: {
    query: string;
    step?: string;
  };
  title: string;
  type: HomepagePanelType;
  renderDurationPanel?: boolean;
  filter?: string;
}

export class AttributePanel extends SceneObjectBase<AttributePanelState> {
  constructor(state: AttributePanelState) {
    super({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ refId: 'A', queryType: 'traceql', tableType: 'spans', limit: 10, ...state.query, exemplars: 0 }],
      }),
      ...state,
    });

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done || data.data?.state === LoadingState.Streaming) {
            if (
              data.data?.state === LoadingState.Done &&
              (data.data.series.length === 0 || data.data.series[0].length === 0)
            ) {
              this.setState({
                panel: new SceneFlexLayout({
                  children: [
                    new AttributePanelScene({
                      message: getNoDataMessage(state.title.toLowerCase()),
                      title: state.title,
                      type: state.type,
                    }),
                  ],
                }),
              });
            } else if (data.data.series.length > 0) {
              if (state.type !== 'slowest-traces' || state.renderDurationPanel) {
                this.setState({
                  panel: new SceneFlexLayout({
                    children: [
                      new AttributePanelScene({
                        series: data.data.series,
                        title: state.title,
                        type: state.type,
                      }),
                    ],
                  }),
                });
              } else if (data.data?.state === LoadingState.Done) {
                let yBuckets = getYBuckets(data.data?.series ?? []);
                if (yBuckets?.length) {
                  const { minDuration } = getMinimumsForDuration(yBuckets);

                  this.setState({
                    panel: new SceneFlexLayout({
                      children: [
                        new AttributePanel({
                          query: {
                            query: `{nestedSetParent<0 && duration > ${minDuration} ${state.filter ?? ''}}`,
                          },
                          title: state.title,
                          type: state.type,
                          renderDurationPanel: true,
                        }),
                      ],
                    }),
                  });
                }
              }
            }
          } else if (data.data?.state === LoadingState.Error) {
            this.setState({
              panel: new SceneFlexLayout({
                children: [
                  new AttributePanelScene({
                    message: getErrorMessage(data),
                    title: state.title,
                    type: state.type,
                  }),
                ],
              }),
            });
          } else {
            this.setState({
              panel: new SceneFlexLayout({
                direction: 'column',
                maxHeight: MINI_PANEL_HEIGHT,
                height: MINI_PANEL_HEIGHT,
                children: [
                  new LoadingStateScene({
                    component: () => SkeletonComponent(),
                  }),
                ],
              }),
            });
          }
        })
      );
    });
  }

  public static Component = ({ model }: SceneComponentProps<AttributePanel>) => {
    const { panel } = model.useState();
    const styles = useStyles2(getStyles);

    if (!panel) {
      return;
    }

    return (
      <div className={styles.container}>
        <panel.Component model={panel} />
      </div>
    );
  };
}

function getStyles() {
  return {
    container: css({
      minWidth: '350px',
      width: '-webkit-fill-available',
    }),
  };
}

export const SkeletonComponent = () => {
  const styles = useStyles2(getSkeletonStyles);

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <Skeleton count={1} width={200} />
      </div>
      <div className={styles.tracesContainer}>
        {[...Array(11)].map((_, i) => (
          <div className={styles.row} key={i}>
            <div className={styles.rowLeft}>
              <Skeleton count={1} />
            </div>
            <div className={styles.rowRight}>
              <Skeleton count={1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      border: `1px solid ${theme.isDark ? theme.colors.border.medium : theme.colors.border.weak}`,
      borderRadius: theme.spacing(0.5),
      marginBottom: theme.spacing(4),
      width: '100%',
    }),
    title: css({
      color: theme.colors.text.secondary,
      backgroundColor: theme.colors.background.secondary,
      fontSize: '1.3rem',
      padding: `${theme.spacing(1.5)} ${theme.spacing(2)}`,
      textAlign: 'center',
    }),
    tracesContainer: css({
      padding: `13px ${theme.spacing(2)}`,
    }),
    row: css({
      display: 'flex',
      justifyContent: 'space-between',
    }),
    rowLeft: css({
      margin: '7px 0',
      width: '150px',
    }),
    rowRight: css({
      width: '50px',
    }),
  };
}
