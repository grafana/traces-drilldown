import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteTimeRange, GrafanaTheme2, LoadingState, PanelData, TimeRange, dateTime } from '@grafana/data';
import { SceneQueryRunner, SceneTimeRange } from '@grafana/scenes';
import { Alert, Spinner, Text, useStyles2, IconButton } from '@grafana/ui';
import { css } from '@emotion/css';

import { TimeSeeker } from './TimeSeeker';
import { TraceExploration } from 'pages/Explore/TraceExploration';
import {
  getDatasourceVariable,
  getFilterSignature,
  getFiltersVariable,
  getPercentilesVariable,
  getPrimarySignalVariable,
} from 'utils/utils';
import { renderTraceQLLabelFilters } from 'utils/filters-renderer';
import { MetricFunction } from 'utils/shared';

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface Props {
  traceExploration: TraceExploration;
}

export const TimeSeekerHeaderSection: React.FC<Props> = ({ traceExploration }) => {
  const styles = useStyles2(getStyles);
  const containerRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<SceneQueryRunner | null>(null);
  const deactivateRef = useRef<(() => void) | null>(null);
  const [panelData, setPanelData] = useState<PanelData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.NotStarted);
  const [width, setWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const controlHandlersRef = useRef<{
    onPanLeft: () => void;
    onPanRight: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    onOpenContextSelector: (e: React.MouseEvent<HTMLButtonElement>) => void;
  } | null>(null);

  const datasourceVar = getDatasourceVariable(traceExploration);
  const { value: datasourceUid } = datasourceVar.useState();
  const filtersVar = getFiltersVariable(traceExploration);
  const { filters } = filtersVar.useState();
  const primarySignalVar = getPrimarySignalVariable(traceExploration);
  const { value: primarySignal } = primarySignalVar.useState();
  const metricVar = traceExploration.getMetricVariable();
  const { value: metricValue } = metricVar.useState();
  const percentilesVar = getPercentilesVariable(traceExploration);
  const { value: percentilesValue } = percentilesVar.useState();
  const sceneTimeRange = traceExploration.state.$timeRange;
  const sceneTimeRangeState = sceneTimeRange?.useState();
  const selectionTimeRange = sceneTimeRangeState?.value;

  useEffect(() => {
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

  useEffect(() => {
    if (runnerRef.current) {
      return;
    }

    const runner = new SceneQueryRunner({
      queries: [],
      runQueriesMode: 'manual',
    });

    runnerRef.current = runner;
    deactivateRef.current = runner.activate();
    const sub = runner.subscribeToState((state) => {
      if (!state.data) {
        setLoadingState(LoadingState.Loading);
        setPanelData(null);
        return;
      }

      setLoadingState(state.data.state ?? LoadingState.Done);
      setPanelData(state.data);
    });

    return () => {
      sub.unsubscribe();
      deactivateRef.current?.();
    };
  }, []);

  const filtersSignature = useMemo(() => {
    return filters
      .map((filter) => getFilterSignature(filter))
      .sort()
      .join('|');
  }, [filters]);

  const percentilesCsv = useMemo(() => {
    if (Array.isArray(percentilesValue)) {
      const sanitized = percentilesValue.filter((val) => typeof val === 'string' && val.trim().length > 0);
      return sanitized.length ? sanitized.join(',') : '0.9';
    }

    return percentilesValue && `${percentilesValue}`.length ? `${percentilesValue}` : '0.9';
  }, [percentilesValue]);

  const selectionKey = selectionTimeRange
    ? `${selectionTimeRange.from.valueOf()}-${selectionTimeRange.to.valueOf()}`
    : 'none';

  const contextRange = useMemo(() => {
    if (!selectionTimeRange) {
      const now = Date.now();
      return {
        from: now - DEFAULT_WINDOW_MS,
        to: now,
      };
    }

    return buildCenteredRange(selectionTimeRange.from.valueOf(), selectionTimeRange.to.valueOf());
  }, [selectionKey]);

  const filterExpression = useMemo(() => {
    const base = primarySignal && primarySignal !== 'true' ? primarySignal : undefined;
    const renderedFilters = renderTraceQLLabelFilters(filters);
    const parts = [];

    if (base) {
      parts.push(base);
    }

    if (renderedFilters && renderedFilters !== 'true') {
      parts.push(renderedFilters);
    }

    return parts.length ? parts.join(' && ') : 'true';
  }, [primarySignal, filtersSignature]);

  const queryKey = useMemo(() => {
    return [metricValue ?? '', filterExpression, percentilesCsv, datasourceUid ?? ''].join('|');
  }, [metricValue, filterExpression, percentilesCsv, datasourceUid]);

  useEffect(() => {
    const runner = runnerRef.current;
    if (!runner || !datasourceUid || !metricValue) {
      return;
    }

    const metric = (metricValue as MetricFunction) ?? 'rate';
    const query = buildTimeSeekerQuery(metric, filterExpression, percentilesCsv);
    const $timeRange = new SceneTimeRange({
      from: dateTime(contextRange.from).toISOString(),
      to: dateTime(contextRange.to).toISOString(),
    });

    runner.setState({
      datasource: { uid: String(datasourceUid) },
      queries: [query],
      $timeRange,
      maxDataPoints: 800,
    });

    runner.runQueries();
  }, [queryKey]);

  const seekerData = useMemo(() => {
    if (!panelData || !panelData.series.length) {
      return null;
    }

    const timeRange = selectionTimeRange ?? absoluteRangeToTimeRange(contextRange);
    return {
      ...panelData,
      timeRange,
    };
  }, [panelData, selectionKey, contextRange]);

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

  if (!datasourceUid) {
    return null;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <IconButton
            name={isCollapsed ? 'angle-right' : 'angle-down'}
            tooltip={isCollapsed ? 'Expand time range seeker' : 'Collapse time range seeker'}
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="sm"
            variant="secondary"
          />
          <Text weight="medium">Time range seeker</Text>
          {loadingState === LoadingState.Loading && <Spinner size={12} inline />}
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

function buildCenteredRange(selectionFrom: number, selectionTo: number): AbsoluteTimeRange {
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

function absoluteRangeToTimeRange(range: AbsoluteTimeRange): TimeRange {
  return {
    from: dateTime(range.from),
    to: dateTime(range.to),
    raw: {
      from: dateTime(range.from),
      to: dateTime(range.to),
    },
  };
}

function buildTimeSeekerQuery(metric: MetricFunction, filterExpression: string, percentilesCsv: string) {
  let metricFn = 'rate()';

  if (metric === 'errors') {
    metricFn = 'rate()';
    filterExpression = filterExpression === 'true' ? 'status=error' : `${filterExpression} && status=error`;
  } else if (metric === 'duration') {
    const percentiles = percentilesCsv || '0.9';
    metricFn = `quantile_over_time(duration, ${percentiles})`;
  }

  return {
    refId: 'TimeSeeker',
    query: `{${filterExpression}} | ${metricFn}`,
    queryType: 'traceql' as const,
    tableType: 'spans' as const,
    limit: 200,
    spss: 10,
    step: '30s',
    filters: [],
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
