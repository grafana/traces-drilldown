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
import { LoadingState, GrafanaTheme2 } from '@grafana/data';
import { explorationDS } from 'utils/shared';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2 } from '@grafana/ui';

export interface TracePanelState extends SceneObjectState {
  panel?: SceneObject;
  traceId: string;
  spanId?: string;
}

export class TraceViewPanelScene extends SceneObjectBase<TracePanelState> {
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
