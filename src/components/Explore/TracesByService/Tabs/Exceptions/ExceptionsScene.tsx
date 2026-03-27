import React from 'react';

import {
  SceneComponentProps,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { GrafanaTheme2, LoadingState, PanelData } from '@grafana/data';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { EmptyState } from 'components/states/EmptyState/EmptyState';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2, useTheme2 } from '@grafana/ui';
import {
  EMPTY_STATE_ERROR_MESSAGE,
  EMPTY_STATE_ERROR_REMEDY_MESSAGE,
  explorationDS,
  filterStreamingProgressTransformations,
} from '../../../../../utils/shared';
import { buildExceptionsQuery } from 'components/Explore/queries/exceptions';
import { aggregateExceptions } from './ExceptionUtils';
import { ExceptionsTable, ExceptionRow } from './ExceptionsTable';
import { getFiltersVariable, getTraceByServiceScene } from 'utils/utils';
import { addToFilters } from 'components/Explore/actions/AddToFiltersAction';

export interface ExceptionsSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  dataState: 'empty' | 'loading' | 'done';
  exceptionsCount?: number;
  exceptionRows?: ExceptionRow[];
}

export class ExceptionsScene extends SceneObjectBase<ExceptionsSceneState> {
  constructor(state: Partial<ExceptionsSceneState>) {
    super({
      $data: new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: explorationDS,
          queries: [buildExceptionsQuery()],
        }),
        transformations: [], // Will be set after construction
      }),
      dataState: 'empty',
      ...state,
    });

    const dataTransformer = this.state.$data as SceneDataTransformer;
    dataTransformer.setState({
      transformations: [...filterStreamingProgressTransformations],
    });

    this.addActivationHandler(() => {
      const dataTransformer = this.state.$data as SceneDataTransformer;

      this._subs.add(
        dataTransformer.subscribeToState((newState, prevState) => {
          if (newState.data !== prevState.data) {
            this.updatePanel(newState.data);
          }
        })
      );
    });
  }

  private updatePanel(data?: PanelData) {
    if (
      data?.state === LoadingState.Loading ||
      data?.state === LoadingState.NotStarted ||
      !data?.state ||
      (data?.state === LoadingState.Streaming && !data.series?.[0]?.length)
    ) {
      this.setState({
        dataState: 'loading',
        panel: new SceneFlexLayout({
          direction: 'row',
          children: [
            new LoadingStateScene({
              component: SkeletonComponent,
            }),
          ],
        }),
      });
    } else if (
      (data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) &&
      (data.series.length === 0 || !data.series?.[0]?.length)
    ) {
      this.setState({
        dataState: 'empty',
        exceptionsCount: 0,
        panel: new SceneFlexLayout({
          children: [
            new SceneFlexItem({
              body: new EmptyStateScene({
                message: EMPTY_STATE_ERROR_MESSAGE,
                remedyMessage: EMPTY_STATE_ERROR_REMEDY_MESSAGE,
                padding: '32px',
              }),
            }),
          ],
        }),
      });
    } else if (
      (data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) &&
      data.series.length > 0
    ) {
      const exceptionRows = this.extractExceptionRows(data);
      const exceptionsCount = exceptionRows.reduce((total, row) => total + row.occurrences, 0);

      this.setState({
        dataState: 'done',
        exceptionsCount,
        exceptionRows,
      });
    }
  }

  private extractExceptionRows(data: PanelData): ExceptionRow[] {
    const df = data.series[0];
    if (!df) {
      return [];
    }

    const messageField = df.fields.find((f) => f.name === 'exception.message');
    const typeField = df.fields.find((f) => f.name === 'exception.type');
    const serviceField = df.fields.find((f) => f.name === 'service.name');
    const timeField = df.fields.find((f) => f.name === 'time');

    if (!messageField || !messageField.values.length) {
      return [];
    }

    const aggregated = aggregateExceptions(messageField, typeField, timeField, serviceField);

    return aggregated.messages.map((message, index) => ({
      type: aggregated.types[index] || 'Unknown',
      message,
      service: aggregated.services[index] || '',
      lastSeen: aggregated.lastSeenTimes[index] || '',
      occurrences: aggregated.occurrences[index] || 0,
      timeSeries: aggregated.timeSeries[index] || [],
    }));
  }

  public getExceptionsCount(): number {
    return this.state.exceptionsCount || 0;
  }

  public static Component = ({ model }: SceneComponentProps<ExceptionsScene>) => {
    const styles = useStyles2(getStyles);
    const theme = useTheme2();
    const { dataState, exceptionRows } = model.useState();

    const handleFilterClick = (key: string, value: string, operator: '=' | '!=' = '=', append = false) => {
      const filtersVariable = getFiltersVariable(model);
      addToFilters(filtersVariable, key, value, operator, append);
      
      // Navigate to the errored traces tab
      const traceByServiceScene = getTraceByServiceScene(model);
      traceByServiceScene.setActionView('traceList');
    };

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.description}>
            View exception details from errored traces for the current set of filters.
          </div>
        </div>
        <div className={styles.content}>
          {dataState === 'loading' && (
            <div className={styles.loadingContainer}>
              <Skeleton
                count={10}
                height={120}
                baseColor={theme.colors.background.secondary}
                highlightColor={theme.colors.background.primary}
              />
            </div>
          )}
          {dataState === 'done' && exceptionRows && exceptionRows.length > 0 && (
            <div className={styles.tableWrapper}>
              <ExceptionsTable rows={exceptionRows} theme={theme} scene={model} onFilterClick={handleFilterClick} />
            </div>
          )}
          {dataState === 'empty' && (
            <div className={styles.emptyContainer}>
              <EmptyState
                message="No exceptions found"
                remedyMessage={EMPTY_STATE_ERROR_REMEDY_MESSAGE}
                padding={theme.spacing(4)}
              />
            </div>
          )}
        </div>
      </div>
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      minHeight: '100%',
    }),
    header: css({
      display: 'flex',
      flexDirection: 'column',
    }),
    description: css({
      fontSize: theme.typography.h6.fontSize,
      padding: `${theme.spacing(1)} 0 ${theme.spacing(2)} 0`,
    }),
    content: css({
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      height: 'calc(100vh - 550px)',
    }),
    loadingContainer: css({
      padding: theme.spacing(2),
      overflow: 'auto',
    }),
    tableWrapper: css({
      flex: 1,
      minHeight: 0,
    }),
    emptyContainer: css({
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
    }),
  };
};

const SkeletonComponent = () => {
  const styles = useStyles2(getSkeletonStyles);
  const theme = useTheme2();

  return (
    <div className={styles.container}>
      <Skeleton
        count={10}
        height={40}
        baseColor={theme.colors.background.secondary}
        highlightColor={theme.colors.background.primary}
      />
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      padding: theme.spacing(2),
    }),
  };
}

export function buildExceptionsScene() {
  return new SceneFlexItem({
    body: new ExceptionsScene({}),
  });
}
