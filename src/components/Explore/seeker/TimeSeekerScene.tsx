import React, { useCallback, useRef, useState } from 'react';
import { AbsoluteTimeRange, GrafanaTheme2, LoadingState, TimeRange, dateTime } from '@grafana/data';
import {
  SceneObjectState,
  SceneObjectBase,
  SceneComponentProps,
  SceneQueryRunner,
  SceneTimeRange,
  sceneGraph,
} from '@grafana/scenes';
import { Text, useStyles2, Spinner, Stack } from '@grafana/ui';
import { css } from '@emotion/css';

import { TimeSeeker } from './TimeSeeker';
import { getTraceExplorationScene } from 'utils/utils';
import { explorationDS, MetricFunction } from 'utils/shared';
import { getMetricsTempoQuery } from '../queries/generateMetricsQuery';
import { BatchDataCache } from './BatchCache';

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TimeSeekerSceneState extends SceneObjectState {}

export class TimeSeekerScene extends SceneObjectBase<TimeSeekerSceneState> {
  private batchCache: BatchDataCache = new BatchDataCache();
  private currentMetric: MetricFunction | null = null;
  private visibleRange: AbsoluteTimeRange | null = null;

  constructor(state: Partial<TimeSeekerSceneState> = {}) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const traceExploration = getTraceExplorationScene(this);
    const metricVar = traceExploration.getMetricVariable();

    // Subscribe to metric changes - need to clear cache
    this._subs.add(
      metricVar.subscribeToState((newState) => {
        const newMetric = newState.value as MetricFunction;
        if (this.currentMetric !== newMetric) {
          this.currentMetric = newMetric;
          this.batchCache.clearCache();
          this.loadNextBatch();
        }
      })
    );

    this.currentMetric = metricVar.state.value as MetricFunction;

    // Cleanup on deactivation
    return () => {
      this.batchCache.clearCache();
    };
  }

  /**
   * Update the visible range and trigger batch loading if needed.
   */
  public updateVisibleRange(visibleFrom: number, visibleTo: number): void {
    this.visibleRange = { from: visibleFrom, to: visibleTo };

    if (!this.currentMetric) {
      return;
    }

    // Check if metric changed
    this.batchCache.checkMetricChange(this.currentMetric);

    // Load next batch if needed
    this.loadNextBatch();
  }

  /**
   * Load the next batch that's needed for the visible range.
   */
  private loadNextBatch(): void {
    if (!this.visibleRange || !this.currentMetric) {
      return;
    }

    // Check if there's already a batch loading
    if (this.batchCache.getLoadingBatchId() !== null) {
      return;
    }

    const nextBatch = this.batchCache.getNextBatchToLoad(this.visibleRange.from, this.visibleRange.to);
    if (!nextBatch) {
      return;
    }

    // Mark batch as loading
    this.batchCache.setLoadingBatch(nextBatch.batchId);

    // Create query
    const query = getMetricsTempoQuery({ metric: this.currentMetric, sample: true });

    // Create time range for this batch
    const $timeRange = new SceneTimeRange({
      from: dateTime(nextBatch.from).toISOString(),
      to: dateTime(nextBatch.to).toISOString(),
    });

    // Create a transformer that caches the result and merges with existing data
    const batchId = nextBatch.batchId;
    const batchFrom = nextBatch.from;
    const batchTo = nextBatch.to;
    const cache = this.batchCache;
    const loadNextBatchFn = this.loadNextBatch.bind(this);
    const forceRenderFn = () => this.forceRender();

    // Update the $data with new query runner
    this.setState({
      $data: new SceneQueryRunner({
        datasource: explorationDS,
        queries: [{ ...query, step: '30s' }],
        $timeRange,
      }),
    });

    // Subscribe to data updates
    const data = sceneGraph.getData(this);
    this._subs.add(
      data.subscribeToState((state) => {
        if (state.data?.state === LoadingState.Done || state.data?.state === LoadingState.Streaming) {
          // Store the new batch data
          if (state.data.series.length > 0 && cache.getLoadingBatchId() === batchId) {
            cache.storeBatch(batchId, batchFrom, batchTo, state.data.series);
            forceRenderFn();

            // Load next batch if needed
            setTimeout(() => loadNextBatchFn(), 0);
          }
        } else if (state.data?.state === LoadingState.Error) {
          // Clear loading state on error
          cache.setLoadingBatch(null);
          forceRenderFn();
        }
      })
    );
  }

  /**
   * Get concatenated data for the visible range from cache.
   */
  public getCachedData(): { series: any[]; loading: boolean } {
    if (!this.visibleRange) {
      return { series: [], loading: false };
    }

    const series = this.batchCache.getCachedData(this.visibleRange.from, this.visibleRange.to);
    const loading = !this.batchCache.isFullyLoaded(this.visibleRange.from, this.visibleRange.to);

    return { series, loading };
  }

  /**
   * Get loading ranges for UI display.
   */
  public getLoadingRanges(): Array<{ from: number; to: number }> {
    if (!this.visibleRange) {
      return [];
    }
    return this.batchCache.getLoadingRanges(this.visibleRange.from, this.visibleRange.to);
  }

  private buildContextRange(selectionTimeRange?: TimeRange): AbsoluteTimeRange {
    if (!selectionTimeRange) {
      const now = Date.now();
      return {
        from: now - DEFAULT_WINDOW_MS,
        to: now,
      };
    }

    const selectionFrom = selectionTimeRange.from.valueOf();
    const selectionTo = selectionTimeRange.to.valueOf();
    const selectionMid = (selectionFrom + selectionTo) / 2;
    const halfWindow = DEFAULT_WINDOW_MS / 2;
    let from = selectionMid - halfWindow;
    let to = selectionMid + halfWindow;
    const now = Date.now();

    if (to > now) {
      const shift = to - now;
      to = now;
      from -= shift;
    }

    return { from, to };
  }

  public static Component = ({ model }: SceneComponentProps<TimeSeekerScene>) => {
    const styles = useStyles2(getStyles);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const [, forceUpdate] = useState(0);

    // Store forceRender callback on the model
    React.useEffect(() => {
      model.forceRender = () => forceUpdate((n) => n + 1);
    }, [model]);

    const traceExploration = getTraceExplorationScene(model);
    const metricVar = traceExploration.getMetricVariable();
    const { value: metricValue } = metricVar.useState();
    const sceneTimeRange = traceExploration.state.$timeRange;
    const sceneTimeRangeState = sceneTimeRange?.useState();
    const selectionTimeRange = sceneTimeRangeState?.value;

    // Track visible range for batch loading
    const [visibleRange, setVisibleRange] = useState<AbsoluteTimeRange>(() => {
      const contextRange = model.buildContextRange(selectionTimeRange);
      return contextRange;
    });

    // Update visible range when selection changes (initial load)
    React.useEffect(() => {
      const contextRange = model.buildContextRange(selectionTimeRange);
      setVisibleRange(contextRange);
    }, [model, selectionTimeRange]);

    // Trigger batch loading when visible range changes
    React.useEffect(() => {
      model.updateVisibleRange(visibleRange.from, visibleRange.to);
    }, [model, visibleRange.from, visibleRange.to]);

    React.useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          // Subtract the text and gap width
          const newWidth = entry.contentRect.width - 48;
          setWidth(newWidth > 0 ? newWidth : 0);
        }
      });

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, []);

    const onRangeChange = useCallback(
      (range: AbsoluteTimeRange) => {
        if (!sceneTimeRange) {
          return;
        }

        const nextRange: TimeRange = {
          from: dateTime(range.from),
          to: dateTime(range.to),
          raw: {
            from: dateTime(range.from),
            to: dateTime(range.to),
          },
        };

        sceneTimeRange.onTimeRangeChange(nextRange);
      },
      [sceneTimeRange]
    );

    // Callback when TimeSeeker's visible range changes (pan/zoom on context)
    const onVisibleRangeChange = useCallback((range: AbsoluteTimeRange) => {
      setVisibleRange(range);
    }, []);

    // Get cached data and loading state
    const { series, loading } = model.getCachedData();
    const loadingRanges = model.getLoadingRanges();
    const hasData = series.length > 0;

    // Build panel data from cached series
    const seekerData = React.useMemo(() => {
      if (!hasData) {
        return null;
      }

      const timeRange = selectionTimeRange ?? {
        from: dateTime(visibleRange.from),
        to: dateTime(visibleRange.to),
        raw: {
          from: dateTime(visibleRange.from),
          to: dateTime(visibleRange.to),
        },
      };

      return {
        state: loading ? LoadingState.Loading : LoadingState.Done,
        series,
        timeRange,
        structureRev: 1,
      };
    }, [hasData, series, loading, visibleRange, selectionTimeRange]);

    // Don't render anything if no data yet
    if (!seekerData) {
      return (
        <div className={styles.container} ref={containerRef}>
          <div className={styles.placeholder}>
            <Spinner size={16} />
            <Text variant="bodySmall" color="secondary">
              Loading time seeker…
            </Text>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container} ref={containerRef}>
        {width > 0 && (
          <Stack direction="row" rowGap={1} alignItems="center">
            <Text variant="bodySmall" color="secondary">
              Seeker
            </Text>
            <TimeSeeker
              data={seekerData}
              width={width}
              metric={metricValue as MetricFunction}
              onChangeTimeRange={onRangeChange}
              onVisibleRangeChange={onVisibleRangeChange}
              loadingRanges={loadingRanges}
            />
          </Stack>
        )}
      </div>
    );
  };

  // This will be set by the component to trigger re-renders
  public forceRender: () => void = () => {};
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(0, 1, 1, 1),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),

  seekerContainer: css({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  }),
  placeholder: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    color: theme.colors.text.secondary,
  }),
});
