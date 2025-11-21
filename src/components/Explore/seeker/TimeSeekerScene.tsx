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
import { Alert, Text, useStyles2, IconButton, Spinner } from '@grafana/ui';
import { css } from '@emotion/css';

import { TimeSeeker } from './TimeSeeker';
import { getTraceExplorationScene } from 'utils/utils';
import { MetricFunction } from 'utils/shared';
import { StreamingIndicator } from '../StreamingIndicator';
import { getMetricsTempoQuery } from '../queries/generateMetricsQuery';

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface TimeSeekerSceneState extends SceneObjectState {
  isCollapsed?: boolean;
}

export class TimeSeekerScene extends SceneObjectBase<TimeSeekerSceneState> {
  constructor(state: Partial<TimeSeekerSceneState> = {}) {
    super({
      isCollapsed: false,
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private _onActivate() {
    const traceExploration = getTraceExplorationScene(this);
    const metricVar = traceExploration.getMetricVariable();

    // Only subscribe to metric changes - datasource, filters, and primarySignal
    // are handled automatically by the SceneQueryRunner through variable interpolation
    this._subs.add(
      metricVar.subscribeToState(() => {
        this.updateQueryRunner();
      })
    );

    // Initial query runner setup
    this.updateQueryRunner();
  }

  private updateQueryRunner() {
    const traceExploration = getTraceExplorationScene(this);
    const metricVar = traceExploration.getMetricVariable();
    const sceneTimeRange = traceExploration.state.$timeRange;

    const metricValue = metricVar.state.value as MetricFunction;
    const selectionTimeRange = sceneTimeRange?.state.value;

    if (!metricValue) {
      return;
    }

    // Build context range (24h centered on selection)
    const contextRange = this.buildContextRange(selectionTimeRange);

    // Create query - datasource and filters are handled automatically via explorationDS
    const query = getMetricsTempoQuery({ metric: metricValue, sample: true });

    // Create time range for the query
    const $timeRange = new SceneTimeRange({
      from: dateTime(contextRange.from).toISOString(),
      to: dateTime(contextRange.to).toISOString(),
    });

    // Update or create query runner
    // The datasource uses explorationDS which automatically interpolates VAR_DATASOURCE_EXPR
    // The query uses VAR_FILTERS_EXPR which automatically includes primarySignal and filters
    this.setState({
      $data: new SceneQueryRunner({
        datasource: { uid: '${ds}' }, // Uses the datasource variable
        queries: [{ ...query, step: '30s' }],
        $timeRange,
      }),
    });
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

  public toggleCollapsed() {
    this.setState({ isCollapsed: !this.state.isCollapsed });
  }

  public static Component = ({ model }: SceneComponentProps<TimeSeekerScene>) => {
    const { isCollapsed } = model.useState();
    const styles = useStyles2(getStyles);
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    const traceExploration = getTraceExplorationScene(model);
    const metricVar = traceExploration.getMetricVariable();
    const { value: metricValue } = metricVar.useState();
    const sceneTimeRange = traceExploration.state.$timeRange;
    const sceneTimeRangeState = sceneTimeRange?.useState();
    const selectionTimeRange = sceneTimeRangeState?.value;

    const data = sceneGraph.getData(model);
    const dataState = data.useState();
    const loadingState = dataState.data?.state ?? LoadingState.NotStarted;

    const controlHandlersRef = useRef<{
      onPanLeft: () => void;
      onPanRight: () => void;
      onZoomIn: () => void;
      onZoomOut: () => void;
      onReset: () => void;
      onOpenContextSelector: (e: React.MouseEvent<HTMLButtonElement>) => void;
    } | null>(null);

    React.useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setWidth(entry.contentRect.width);
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

    // Build seeker data with proper time range
    const seekerData = React.useMemo(() => {
      if (!dataState.data || !dataState.data.series.length) {
        return null;
      }

      const contextRange = model.buildContextRange(selectionTimeRange);
      const timeRange = selectionTimeRange ?? {
        from: dateTime(contextRange.from),
        to: dateTime(contextRange.to),
        raw: {
          from: dateTime(contextRange.from),
          to: dateTime(contextRange.to),
        },
      };

      return {
        ...dataState.data,
        timeRange,
      };
    }, [dataState.data, selectionTimeRange, model]);

    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <IconButton
              name={isCollapsed ? 'angle-right' : 'angle-down'}
              tooltip={isCollapsed ? 'Expand time range seeker' : 'Collapse time range seeker'}
              onClick={() => model.toggleCollapsed()}
              size="sm"
              variant="secondary"
            />
            <Text weight="medium">Time range seeker</Text>
            <StreamingIndicator
              isStreaming={loadingState === LoadingState.Loading || loadingState === LoadingState.Streaming}
              iconSize={10}
            />
          </div>
          {!isCollapsed && seekerData && controlHandlersRef.current && (
            <div className={styles.headerRight}>
              <IconButton
                tooltip="Pan left"
                name="arrow-left"
                onClick={controlHandlersRef.current.onPanLeft}
                size="sm"
                variant="secondary"
              />
              <IconButton
                tooltip="Zoom out context"
                name="search-minus"
                onClick={controlHandlersRef.current.onZoomOut}
                size="sm"
                variant="secondary"
              />
              <IconButton
                tooltip="Zoom in context"
                name="search-plus"
                onClick={controlHandlersRef.current.onZoomIn}
                size="sm"
                variant="secondary"
              />
              <IconButton
                tooltip="Pan right"
                name="arrow-right"
                onClick={controlHandlersRef.current.onPanRight}
                size="sm"
                variant="secondary"
              />
              <IconButton
                tooltip="Reset context window"
                name="crosshair"
                onClick={controlHandlersRef.current.onReset}
                size="sm"
                variant="secondary"
              />
              <IconButton
                name="calendar-alt"
                tooltip="Set context window"
                onClick={controlHandlersRef.current.onOpenContextSelector}
                size="sm"
                variant="secondary"
              />
            </div>
          )}
        </div>
        {!isCollapsed && (
          <>
            {loadingState === LoadingState.Error && (
              <Alert severity="error" title="Unable to load context data">
                Check your data source configuration or adjust your filters.
              </Alert>
            )}
            {loadingState !== LoadingState.Error && (!seekerData || width === 0) && (
              <div className={styles.placeholder}>
                <Spinner size={16} />
                <Text variant="bodySmall" color="secondary">
                  Loading sparkline…
                </Text>
              </div>
            )}
            {loadingState !== LoadingState.Error && seekerData && width > 0 && (
              <TimeSeeker
                data={seekerData}
                width={width}
                metric={metricValue as MetricFunction}
                onChangeTimeRange={onRangeChange}
                renderControls={(handlers) => {
                  controlHandlersRef.current = handlers;
                  return null;
                }}
              />
            )}
          </>
        )}
      </div>
    );
  };
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    width: '100%',
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: 4,
    padding: `${theme.spacing(1)} ${theme.spacing(1.5)} ${theme.spacing(1)}`,
    background: theme.colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  headerLeft: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  }),
  headerRight: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  placeholder: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.colors.text.secondary,
  }),
});
