import React from 'react';

import { DataFrame, FieldType, GrafanaTheme2, LoadingState, PanelData, sortDataFrame } from '@grafana/data';
import {
  SceneComponentProps,
  SceneCSSGridLayout,
  SceneFlexItem,
  sceneGraph,
  SceneLayout,
  SceneObjectBase,
  SceneObjectState,
} from '@grafana/scenes';
import { EmptyStateScene } from 'components/states/EmptyState/EmptyStateScene';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import Skeleton from 'react-loading-skeleton';
import { LoadingStateScene } from 'components/states/LoadingState/LoadingStateScene';
import { ErrorStateScene } from 'components/states/ErrorState/ErrorStateScene';
import { debounce } from 'lodash';
import { Search } from './Search';
import { getGroupByVariable } from 'utils/utils';
import {
  EMPTY_STATE_ERROR_MESSAGE,
  EMPTY_STATE_ERROR_REMEDY_MESSAGE,
  EventTimeseriesDataReceived,
  GRID_TEMPLATE_COLUMNS,
} from '../../utils/shared';
import { cloneDataFrame } from '../../utils/frames';

interface ByFrameRepeaterState extends SceneObjectState {
  body: SceneLayout;
  groupBy?: boolean;

  getLayoutChild(data: PanelData, frame: DataFrame, frameIndex: number): SceneFlexItem;

  searchQuery?: string;
}

export class ByFrameRepeater extends SceneObjectBase<ByFrameRepeaterState> {
  public constructor(state: ByFrameRepeaterState) {
    super(state);

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done || data.data?.state === LoadingState.Streaming) {
            if (data.data.series.length === 0 && data.data?.state !== LoadingState.Streaming) {
              this.state.body.setState({
                children: [
                  new SceneFlexItem({
                    body: new EmptyStateScene({
                      message: EMPTY_STATE_ERROR_MESSAGE,
                      remedyMessage: EMPTY_STATE_ERROR_REMEDY_MESSAGE,
                      padding: '32px',
                    }),
                  }),
                ],
              });
            } else {
              const filtered = {
                ...data.data,
                series: data.data?.series.filter(doesQueryMatchDataFrameLabels(this.state.searchQuery)),
              };
              this.renderFilteredData(filtered as PanelData);
              this.publishEvent(new EventTimeseriesDataReceived({ series: data.data.series }), true);
            }
          } else if (data.data?.state === LoadingState.Error) {
            this.state.body.setState({
              children: [
                new SceneCSSGridLayout({
                  children: [
                    new ErrorStateScene({
                      message: data.data.errors?.[0]?.message ?? 'An error occurred in the query',
                    }),
                  ],
                }),
              ],
            });
          } else {
            this.state.body.setState({
              children: [
                new SceneCSSGridLayout({
                  children: [
                    new LoadingStateScene({
                      component: () => SkeletonComponent(8),
                    }),
                  ],
                }),
              ],
            });
          }
        })
      );

      this.subscribeToState((newState, prevState) => {
        if (newState.searchQuery !== prevState.searchQuery) {
          this.onSearchQueryChangeDebounced(newState.searchQuery ?? '');
        }
      });

      if (data.state.data) {
        this.performRepeat(data.state.data);
      }
    });
  }

  private onSearchQueryChange = (evt: React.SyntheticEvent<HTMLInputElement>) => {
    this.setState({ searchQuery: evt.currentTarget.value });
  };

  private onSearchQueryChangeDebounced = debounce((searchQuery: string) => {
    const data = sceneGraph.getData(this);
    const filtered = {
      ...data.state.data,
      series: data.state.data?.series.filter(doesQueryMatchDataFrameLabels(searchQuery)),
    };
    this.renderFilteredData(filtered as PanelData);
  }, 250);

  private renderFilteredData(filtered: PanelData) {
    if (filtered.series && filtered.series.length > 0) {
      this.performRepeat(filtered as PanelData);
    } else {
      this.state.body.setState({
        children: [
          new SceneFlexItem({
            body: new EmptyStateScene({
              message: 'No data for search term',
              padding: '32px',
            }),
          }),
        ],
      });
    }
  }

  private groupSeriesBy(data: PanelData, groupBy: string) {
    const groupedData = data.series.reduce(
      (acc, series) => {
        const key = series.fields.find((f) => f.type === FieldType.number)?.labels?.[groupBy];
        if (!key) {
          return acc;
        }
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(series);
        return acc;
      },
      {} as Record<string, DataFrame[]>
    );

    const newSeries = [];
    for (const key in groupedData) {
      const frames = groupedData[key].sort((a, b) => a.name?.localeCompare(b.name!) || 0);
      const mainFrame = cloneDataFrame(frames[0]);
      frames.slice(1, frames.length).forEach((frame) => mainFrame.fields.push(frame.fields[1]));
      newSeries.push(sortDataFrame(mainFrame, 0));
    }
    return newSeries;
  }

  private performRepeat(data: PanelData) {
    const newChildren: SceneFlexItem[] = [];
    let frames = data.series;

    if (this.state.groupBy) {
      frames = this.groupSeriesBy(data, getGroupByVariable(this).getValueText());
    }

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const currentFrame = frames[frameIndex];
      // Skip frames with no data
      const sum = currentFrame.fields
        .filter((f) => f.type === FieldType.number)
        .reduce((sum, f) => sum + f.values.reduce((vSum, v) => vSum + (v || 0), 0) || 0, 0);
      if (sum === 0) {
        continue;
      }
      // Build the layout child
      const layoutChild = this.state.getLayoutChild(data, frames[frameIndex], frameIndex);
      newChildren.push(layoutChild);
    }

    this.state.body.setState({ children: newChildren });
  }

  public static Component = ({ model }: SceneComponentProps<ByFrameRepeater>) => {
    const { body, searchQuery } = model.useState();
    const styles = useStyles2(getStyles);

    return (
      <div className={styles.container}>
        <Search searchQuery={searchQuery ?? ''} onSearchQueryChange={model.onSearchQueryChange} />
        <body.Component model={body} />
      </div>
    );
  };
}

function getStyles() {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
    }),
  };
}

export const SkeletonComponent = (repeat: number) => {
  const styles = useStyles2(getSkeletonStyles);

  return (
    <div className={styles.container}>
      {[...Array(repeat)].map((_, i) => (
        <div className={styles.itemContainer} key={i}>
          <div className={styles.header}>
            <div className={styles.title}>
              <Skeleton count={1} />
            </div>
            <div className={styles.action}>
              <Skeleton count={1} />
            </div>
          </div>
          <div className={styles.yAxis}>
            {[...Array(2)].map((_, i) => (
              <div className={styles.yAxisItem} key={i}>
                <Skeleton count={1} />
              </div>
            ))}
          </div>
          <div className={styles.xAxis}>
            {[...Array(2)].map((_, i) => (
              <div className={styles.xAxisItem} key={i}>
                <Skeleton count={1} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

function getSkeletonStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'grid',
      gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
      gridAutoRows: '200px',
      rowGap: theme.spacing(1),
      columnGap: theme.spacing(1),
    }),
    itemContainer: css({
      backgroundColor: theme.colors.background.primary,
      border: `1px solid ${theme.colors.background.secondary}`,
      padding: '5px',
    }),
    header: css({
      display: 'flex',
      justifyContent: 'space-between',
    }),
    title: css({
      width: '100px',
    }),
    action: css({
      width: '60px',
    }),
    yAxis: css({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-around',
      marginTop: '35px',
    }),
    yAxisItem: css({
      width: '60px',
      height: '55px',
    }),
    xAxis: css({
      display: 'flex',
      justifyContent: 'space-evenly',
    }),
    xAxisItem: css({
      width: '55px',
    }),
  };
}

export const doesQueryMatchDataFrameLabels = (searchQuery?: string) => (dataFrame: DataFrame) => {
  const pattern = searchQuery?.trim();
  if (!pattern) {
    return true;
  }

  const regex = new RegExp(pattern, 'i');

  return dataFrame.fields.some((f) => (!f.labels ? false : Object.values(f.labels).find((label) => regex.test(label))));
};
