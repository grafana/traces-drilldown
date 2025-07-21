import React from 'react';

import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
} from '@grafana/scenes';
import { DataFrame, GrafanaTheme2, LoadingState, PanelData, FieldType, DataLink } from '@grafana/data';
import { GraphDrawStyle, VisibilityMode, TableCellHeight } from '@grafana/schema';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import Skeleton from 'react-loading-skeleton';
import { useStyles2, useTheme2, TableCellDisplayMode, TableCustomCellOptions, Sparkline } from '@grafana/ui';
import { map, Observable } from 'rxjs';
import {
  EMPTY_STATE_ERROR_MESSAGE,
  EMPTY_STATE_ERROR_REMEDY_MESSAGE,
  explorationDS,
} from '../../../../../utils/shared';
import { getTraceByServiceScene, getFiltersVariable } from '../../../../../utils/utils';
import { buildExceptionsQuery } from 'components/Explore/queries/exceptions';
import { aggregateExceptions } from './ExceptionUtils';

export interface ExceptionsSceneState extends SceneObjectState {
  panel?: SceneFlexLayout;
  dataState: 'empty' | 'loading' | 'done';
  exceptionsCount?: number;
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
      transformations: [this.createTransformation()],
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
    if (data?.state === LoadingState.Loading || data?.state === LoadingState.NotStarted || !data?.state || (data?.state === LoadingState.Streaming && !data.series?.[0]?.length)) {      
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
    } else if ((data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) && (data.series.length === 0 || !data.series?.[0]?.length)) {    
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
    } else if ((data?.state === LoadingState.Done || data?.state === LoadingState.Streaming) && data.series.length > 0) {
      const exceptionsCount = this.calculateExceptionsCount(data);
     
      this.setState({
        dataState: 'done',
        exceptionsCount,
        panel: new SceneFlexLayout({
          children: [
            new SceneFlexItem({
              body: PanelBuilders.table()
                .setOption('cellHeight', TableCellHeight.Lg)
                .setHoverHeader(true)
                .setOverrides((builder) => {
                  return builder
                    .matchFieldsWithName('Service')
                    .overrideCustomFieldConfig('width', 200)
                    .matchFieldsWithName('Occurrences')
                    .overrideCustomFieldConfig('width', 120)
                    .matchFieldsWithName('Time Series')
                    .overrideCustomFieldConfig('width', 220)
                    .matchFieldsWithName('Last Seen')
                    .overrideCustomFieldConfig('width', 120)
                })
                .build(),
            }),
          ],
        }),
      });
    }
  }

  private createTransformation() {
    return () => (source: Observable<DataFrame[]>) => {
      return source.pipe(
        map((data: DataFrame[]) => {
          return data.map((df: DataFrame) => {          
            const messageField = df.fields.find((f) => f.name === 'exception.message');
            const typeField = df.fields.find((f) => f.name === 'exception.type');
            const serviceField = df.fields.find((f) => f.name === 'service.name');
            const timeField = df.fields.find((f) => f.name === 'time');
            const noData = !messageField || !messageField.values.length;

            let messages: string[] = [];
            let types: string[] = [];
            let occurrences: number[] = [];
            let lastSeenTimes: string[] = [];
            let services: string[] = [];
            let timeSeries: Array<Array<{time: number, count: number}>> = [];
            
            if (!noData) {
              const aggregated = aggregateExceptions(messageField, typeField, timeField, serviceField);
              messages = aggregated.messages;
              types = aggregated.types;
              occurrences = aggregated.occurrences;
              lastSeenTimes = aggregated.lastSeenTimes;
              services = aggregated.services;
              timeSeries = aggregated.timeSeries;
            }

            const options: TableCustomCellOptions = {
              type: TableCellDisplayMode.Custom,
              cellComponent: (props) => {
                const seriesData = props.value as Array<{time: number, count: number}>;
                return this.renderSparklineCell(seriesData);
              },
            };

            return {
              ...df,
              length: messages.length,
              fields: [
                {
                  name: 'Message',
                  type: FieldType.string,
                  values: messages,
                  config: {
                    links: messages.length > 0 ? [this.createDataLink()] : [],
                  },
                },
                {
                  name: 'Type',
                  type: FieldType.string,
                  values: types,
                  config: {},
                },
                {
                  name: 'Trace Service',
                  type: FieldType.string,
                  values: services,
                  config: {},
                },
                {
                  name: 'Occurrences',
                  type: FieldType.number,
                  values: occurrences,
                  config: {},
                },
                {
                  name: 'Time Series',
                  type: FieldType.other,
                  values: timeSeries,
                  config: {
                    custom: {
                      cellOptions: options
                    }
                  },
                },
                {
                  name: 'Last Seen',
                  type: FieldType.string,
                  values: lastSeenTimes,
                  config: {},
                },
              ],
            };
          });
        })
      );
    };
  }

  private renderSparklineCell = (seriesData: Array<{time: number, count: number}>) => {
    const styles = useStyles2(getStyles);
    
    const SparklineCell = () => {
      const theme = useTheme2();
      
      if (!seriesData || !seriesData.length) {
        return <div className={styles.sparklineMessage}>No data</div>;
      }

      const countValues = seriesData.map(point => point.count);
      const timeValues = seriesData.map(point => point.time);
      
      if (countValues.length <= 3) {
        return;
      }

      const validCountValues = countValues.filter(v => isFinite(v) && !isNaN(v));
      const validTimeValues = timeValues.filter(v => isFinite(v) && !isNaN(v));
      if (validCountValues.length < 2 || validTimeValues.length < 2) {
        return <div className={styles.sparklineMessage}>Invalid data</div>;
      }
      
      const minCount = Math.min(...validCountValues);
      const maxCount = Math.max(...validCountValues);
      const minTime = Math.min(...validTimeValues);
      const maxTime = Math.max(...validTimeValues);
      
      // Ensure valid ranges
      const countDelta = maxCount - minCount;
      const timeDelta = maxTime - minTime;
      
      // Handle edge cases where all values are the same
      const safeCountDelta = countDelta === 0 ? 1 : countDelta;
      const safeTimeDelta = timeDelta === 0 ? 1 : timeDelta;
      
      const sparklineData = {
        y: {
          name: 'count',
          type: FieldType.number,
          values: validCountValues,
          config: {},
          state: {
            range: {
              min: minCount,
              max: maxCount,
              delta: safeCountDelta,
            },
          },
        },
        x: {
          name: 'time',
          type: FieldType.time,
          values: validTimeValues,
          config: {},
          state: {
            range: {
              min: minTime,
              max: maxTime,
              delta: safeTimeDelta,
            },
          },
        },
      };

      return (
        <div className={styles.sparklineContainer}>
          <Sparkline
            width={180}
            height={20}
            sparkline={sparklineData}
            theme={theme}
            config={{
              custom: {
                drawStyle: GraphDrawStyle.Line,
                fillOpacity: 5,
                fillColor: theme.colors.background.secondary,
                lineWidth: 1,
                showPoints: VisibilityMode.Never,
              },
            }}
          />
        </div>
      );
    };

    return <SparklineCell />;
  };

  private createDataLink(): DataLink {
    return {
      title: 'View traces for this exception',
      url: '',
      onClick: (event: any) => {
        const rowIndex = event.origin?.rowIndex;
        if (rowIndex !== undefined) {
          const message = event.origin?.field?.values?.[rowIndex];
          if (message) {
            this.navigateToTracesWithFilter(message);
          }
        }
      },
    };
  }

  private navigateToTracesWithFilter = (exceptionMessage: string) => {
    const filtersVariable = getFiltersVariable(this);
    if (!filtersVariable) {return;}

    const traceByServiceScene = getTraceByServiceScene(this);
    traceByServiceScene?.setActionView('traceList');

    const currentFilters = filtersVariable.state.filters || [];
    const escapedMessage = this.escapeFilterValue(exceptionMessage);
    
    const existingFilterIndex = currentFilters.findIndex(
      filter => filter.key === 'event.exception.message'
    );
    
    const newFilter = {
      key: 'event.exception.message',
      operator: '=',
      value: escapedMessage,
    };

    const newFilters = existingFilterIndex >= 0
      ? currentFilters.map((f, i) => i === existingFilterIndex ? newFilter : f)
      : [...currentFilters, newFilter];
    
    filtersVariable.setState({ filters: newFilters });
  };
  
  private escapeFilterValue(value: string): string {
    return value
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .trim();
  }

  private calculateExceptionsCount(data?: PanelData): number {
    if (!data?.series?.[0]) { return 0 }
    
    const occurrencesField = data.series[0].fields.find(field => field.name === 'Occurrences');
    if (!occurrencesField?.values) { return 0 }
    
    return occurrencesField.values.reduce((total: number, value: number) => total + (value || 0), 0);
  }

  public getExceptionsCount(): number {
    return this.state.exceptionsCount || 0;
  }

  public static Component = ({ model }: SceneComponentProps<ExceptionsScene>) => {
    const styles = useStyles2(getStyles);
    const theme = useTheme2();
    const { panel, dataState } = model.useState();

    return (
      <div className={styles.container}>
        <div className={styles.description}>
          View exception details from errored traces for the current set of filters.
        </div>
        {dataState === 'loading' && (
          <div className={styles.loadingContainer}>
            <Skeleton
              count={10}
              height={40}
              baseColor={theme.colors.background.secondary}
              highlightColor={theme.colors.background.primary}
            />
          </div>
        )}
        {panel && <panel.Component model={panel} />}
      </div>
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
      height: '100%',
    }),
    description: css({
      fontSize: theme.typography.h6.fontSize,
      padding: `${theme.spacing(1)} 0`,
    }),
    loadingContainer: css({
      padding: theme.spacing(2),
    }),
    sparklineContainer: css({
      width: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    sparklineMessage: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      padding: theme.spacing(1),
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
