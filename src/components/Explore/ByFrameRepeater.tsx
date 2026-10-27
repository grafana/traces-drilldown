import React, { useEffect, useRef } from 'react';

import { DataFrame, FieldType, GrafanaTheme2, LoadingState, PanelData, sortDataFrame } from '@grafana/data';
import { t } from '@grafana/i18n';
import {
  LazyLoader,
  SceneComponentProps,
  SceneCSSGridLayout,
  SceneFlexItem,
  sceneGraph,
  SceneLayout,
  SceneObject,
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

export const PAGE_SIZE = 24;

interface ByFrameRepeaterState extends SceneObjectState {
  body: SceneLayout;
  groupBy?: boolean;

  getLayoutChild(data: PanelData, frame: DataFrame, frameIndex: number): SceneFlexItem;

  searchQuery?: string;
  visibleCount?: number;
  totalCount?: number;
}

export class ByFrameRepeater extends SceneObjectBase<ByFrameRepeaterState> {
  private repeated?: { data: PanelData; frames: DataFrame[] };

  public constructor(state: ByFrameRepeaterState) {
    super(state);

    this.addActivationHandler(() => {
      const data = sceneGraph.getData(this);

      this._subs.add(
        data.subscribeToState((data) => {
          if (data.data?.state === LoadingState.Done || data.data?.state === LoadingState.Streaming) {
            if (data.data.series.length === 0 && data.data?.state !== LoadingState.Streaming) {
              this.setBodyChildren([
                new SceneFlexItem({
                  body: new EmptyStateScene({
                    message: EMPTY_STATE_ERROR_MESSAGE,
                    remedyMessage: EMPTY_STATE_ERROR_REMEDY_MESSAGE,
                    padding: '32px',
                  }),
                }),
              ]);
            } else if (data.data?.state === LoadingState.Done) {
              this.renderFilteredData(this.getFilteredData(this.state.searchQuery));
            }
          } else if (data.data?.state === LoadingState.Error) {
            this.setBodyChildren([
              new SceneCSSGridLayout({
                children: [
                  new ErrorStateScene({
                    message: data.data.errors?.[0]?.message ?? 'An error occurred in the query',
                  }),
                ],
              }),
            ]);
          } else {
            this.setBodyChildren([
              new SceneCSSGridLayout({
                children: [
                  new LoadingStateScene({
                    component: () => SkeletonComponent(8),
                  }),
                ],
              }),
            ]);
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
    this.setState({ visibleCount: PAGE_SIZE });
    this.renderFilteredData(this.getFilteredData(searchQuery));
  }, 250);

  public onShowMore = () => {
    const visibleCount = this.state.visibleCount ?? PAGE_SIZE;
    if (!this.repeated || visibleCount >= (this.state.totalCount ?? 0)) {
      return;
    }

    const { data, frames } = this.repeated;
    const nextCount = visibleCount + PAGE_SIZE;
    const added = frames
      .slice(visibleCount, nextCount)
      .map((frame, i) => this.state.getLayoutChild(data, frame, visibleCount + i));

    this.setState({ visibleCount: nextCount });
    this.state.body.setState({ children: [...this.state.body.state.children, ...added] });
    this.publishSeries();
  };

  private publishSeries() {
    const series = sceneGraph.getData(this).state.data?.series;
    if (series) {
      this.publishEvent(new EventTimeseriesDataReceived({ series }), true);
    }
  }

  public onHintInViewChange = (isInView: boolean) => {
    if (isInView) {
      this.onShowMore();
    }
  };

  private getFilteredData(searchQuery?: string) {
    const data = sceneGraph.getData(this).state.data;
    return { ...data, series: data?.series.filter(doesQueryMatchDataFrameLabels(searchQuery)) ?? [] } as PanelData;
  }

  private setBodyChildren(children: SceneObject[], totalCount = 0) {
    this.setState({ totalCount });
    this.state.body.setState({ children });
  }

  private renderFilteredData(filtered: PanelData) {
    if (filtered.series && filtered.series.length > 0) {
      this.performRepeat(filtered);
    } else {
      this.setBodyChildren([
        new SceneFlexItem({
          body: new EmptyStateScene({
            message: t('by-frame-repeater.no-data-for-search', 'No data for search term'),
            padding: '32px',
          }),
        }),
      ]);
      this.publishSeries();
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
    const frames = this.state.groupBy ? this.groupSeriesBy(data, getGroupByVariable(this).getValueText()) : data.series;
    const nonEmpty = frames.filter(hasNonZeroValues);
    const visibleCount = this.state.visibleCount ?? PAGE_SIZE;
    const children = nonEmpty
      .slice(0, visibleCount)
      .map((frame, frameIndex) => this.state.getLayoutChild(data, frame, frameIndex));

    this.repeated = { data, frames: nonEmpty };
    this.setBodyChildren(children, nonEmpty.length);
    this.publishSeries();
  }

  public static Component = ({ model }: SceneComponentProps<ByFrameRepeater>) => {
    const { body, searchQuery, visibleCount = PAGE_SIZE, totalCount = 0 } = model.useState();
    const styles = useStyles2(getStyles);
    const shown = Math.min(visibleCount, totalCount);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      scrollRef.current?.scrollTo({ top: 0 });
    }, [searchQuery]);

    return (
      <div className={styles.container}>
        <Search searchQuery={searchQuery ?? ''} onSearchQueryChange={model.onSearchQueryChange} />
        <div ref={scrollRef} className={styles.scrollContainer}>
          <body.Component model={body} />
          {shown < totalCount && (
            // key re-checks visibility after each page
            <LazyLoader key={String(visibleCount)} mode="query" onChange={model.onHintInViewChange}>
              <div className={styles.hint}>
                {t(
                  'by-frame-repeater.partial-results-hint',
                  'Showing {{shown}} of {{total}}. Scroll to load more or search to narrow down.',
                  { shown, total: totalCount }
                )}
              </div>
            </LazyLoader>
          )}
        </div>
      </div>
    );
  };
}

export const hasNonZeroValues = (frame: DataFrame) =>
  frame.fields.filter((f) => f.type === FieldType.number).some((f) => f.values.some((v) => Boolean(v)));

function getStyles(theme: GrafanaTheme2) {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      ['& div:nth-child(2)']: {
        overflow: 'auto',
      },
    }),
    // stops scroll anchoring from loading pages in a loop
    scrollContainer: css({
      flexGrow: 1,
      overflowAnchor: 'none',
    }),
    hint: css({
      display: 'flex',
      justifyContent: 'center',
      padding: theme.spacing(2, 0),
      color: theme.colors.text.secondary,
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
      borderRadius: theme.shape.radius.lg ?? theme.shape.radius.default,
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
