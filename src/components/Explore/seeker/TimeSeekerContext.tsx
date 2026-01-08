import React, { createContext, useContext, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { AbsoluteTimeRange, durationToMilliseconds, GrafanaTheme2, parseDuration, PanelData } from '@grafana/data';
import { AxisPlacement, DrawStyle, UPlotConfigBuilder, useTheme2 } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';
import { DragStyles } from './types';

// ============================================================================
// Context Types
// ============================================================================

interface TimeSeekerContextValue {
  // State
  visibleRange: AbsoluteTimeRange;
  timelineRange: { from: number; to: number };
  dashboardFrom: number;
  dashboardTo: number;
  now: number;
  dragStyles: DragStyles;
  loadingRanges?: Array<{ from: number; to: number }>;
  hasLargeBatchWarning?: boolean;

  // Chart data
  timeValues: number[];
  valueValues: number[];
  width: number;
  chartHeight: number;
  chartConfig: UPlotConfigBuilder;

  // Refs
  uplotRef: React.MutableRefObject<uPlot | null>;
  wheelListenerRef: React.MutableRefObject<((e: WheelEvent) => void) | null>;
  suppressNextDashboardUpdate: React.MutableRefObject<boolean>;
  applyRelativeContextWindow: React.MutableRefObject<string | null>;

  // Actions
  setVisibleRange: (range: AbsoluteTimeRange, suppressDashboardUpdate?: boolean) => void;
  setTimelineRange: React.Dispatch<React.SetStateAction<{ from: number; to: number }>>;
  updateOverlay: () => void;
  handleDrag: (e: React.MouseEvent, kind: 'move' | 'left' | 'right') => void;
  handlePanStart: (e: MouseEvent | React.MouseEvent) => void;
  zoomContextWindow: (factor: number) => void;
  panContextWindow: (direction: 'left' | 'right') => void;
  resetContextWindow: () => void;
  onChangeTimeRange: (range: AbsoluteTimeRange) => void;
}

const TimeSeekerContext = createContext<TimeSeekerContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface TimeSeekerProviderProps {
  data: PanelData;
  width: number;
  chartHeight: number;
  metric?: MetricFunction;
  initialVisibleRange?: AbsoluteTimeRange;
  loadingRanges?: Array<{ from: number; to: number }>;
  hasLargeBatchWarning?: boolean;
  onChangeTimeRange: (range: AbsoluteTimeRange) => void;
  onVisibleRangeChange?: (range: AbsoluteTimeRange) => void;
  children: React.ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

export const TimeSeekerProvider: React.FC<TimeSeekerProviderProps> = ({
  data,
  width,
  chartHeight,
  metric,
  initialVisibleRange,
  loadingRanges,
  hasLargeBatchWarning,
  onChangeTimeRange,
  onVisibleRangeChange,
  children,
}) => {
  const theme = useTheme2();
  const now = Date.now();

  const dashboardFrom = data.timeRange.from.valueOf();
  const dashboardTo = data.timeRange.to.valueOf();

  // -------------------------------------------------------------------------
  // Compute context window from selection
  // -------------------------------------------------------------------------
  const computeContextWindowFromSelection = useCallback(
    (from: number, to: number): AbsoluteTimeRange => {
      const mid = (from + to) / 2;
      const span = to - from;
      const zoomSpan = span * 8;

      let newFrom = mid - zoomSpan / 2;
      let newTo = mid + zoomSpan / 2;

      if (newTo > now) {
        const shift = newTo - now;
        newFrom -= shift;
        newTo = now;
      }

      return { from: newFrom, to: newTo };
    },
    [now]
  );

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [timelineRange, setTimelineRange] = useState({ from: dashboardFrom, to: dashboardTo });
  const [visibleRange, setVisibleRangeState] = useState<AbsoluteTimeRange>(
    initialVisibleRange ?? computeContextWindowFromSelection(dashboardFrom, dashboardTo)
  );
  const [dragStyles, setDragStyles] = useState<DragStyles>({});

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  const suppressNextDashboardUpdate = useRef(false);
  const isProgrammaticSelect = useRef(false);
  const skipNextSelectUpdate = useRef(false);
  const uplotRef = useRef<uPlot | null>(null);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const wheelListenerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const applyRelativeContextWindow = useRef<string | null>(null);
  const lastDashboardRange = useRef<AbsoluteTimeRange>({
    from: dashboardFrom,
    to: dashboardTo,
  });

  // -------------------------------------------------------------------------
  // Set visible range with optional dashboard update suppression
  // -------------------------------------------------------------------------
  const setVisibleRange = useCallback(
    (range: AbsoluteTimeRange, suppressDashboardUpdate = false) => {
      setVisibleRangeState(range);
      onVisibleRangeChange?.(range);
      if (suppressDashboardUpdate) {
        suppressNextDashboardUpdate.current = true;
        skipNextSelectUpdate.current = true;
        isProgrammaticSelect.current = true;
      }
    },
    [onVisibleRangeChange]
  );

  // -------------------------------------------------------------------------
  // Handle relative time ranges (e.g., "now-1h")
  // -------------------------------------------------------------------------
  useEffect(() => {
    const raw = data.timeRange.raw;

    if (typeof raw.from === 'string' && typeof raw.to === 'string' && raw.to === 'now') {
      const fromStr = raw.from as string;
      const match = fromStr.match(/^now-(\d+[smhdw])$/);
      if (match) {
        applyRelativeContextWindow.current = match[1];
      }
    }
  }, [data.timeRange.raw]);

  // -------------------------------------------------------------------------
  // Sync dashboard range changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const dashboardChanged =
      lastDashboardRange.current.from !== dashboardFrom || lastDashboardRange.current.to !== dashboardTo;

    const timelineMatchesDashboard =
      Math.abs(timelineRange.from - dashboardFrom) < 1000 && Math.abs(timelineRange.to - dashboardTo) < 1000;

    if (dashboardChanged && !timelineMatchesDashboard) {
      setTimelineRange({ from: dashboardFrom, to: dashboardTo });
    }

    lastDashboardRange.current = { from: dashboardFrom, to: dashboardTo };
  }, [dashboardFrom, dashboardTo, timelineRange.from, timelineRange.to]);

  // -------------------------------------------------------------------------
  // Apply relative context window
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!applyRelativeContextWindow.current) {
      return;
    }

    try {
      const durMs = durationToMilliseconds(parseDuration(applyRelativeContextWindow.current));
      const brushTo = dashboardTo;
      const brushFrom = dashboardTo - durMs;

      suppressNextDashboardUpdate.current = true;
      setTimelineRange({ from: brushFrom, to: brushTo });

      const sameRange = Math.abs(visibleRange.from - brushFrom) < 10 && Math.abs(visibleRange.to - brushTo) < 10;

      if (sameRange) {
        const context = computeContextWindowFromSelection(brushFrom, brushTo);
        setVisibleRange(context, true);
      }
    } catch (err) {
      console.error('Failed to apply relative context window', err);
    } finally {
      applyRelativeContextWindow.current = null;
    }
  }, [
    dashboardTo,
    dashboardFrom,
    visibleRange.from,
    visibleRange.to,
    setVisibleRange,
    computeContextWindowFromSelection,
  ]);

  // -------------------------------------------------------------------------
  // Update overlay positions
  // -------------------------------------------------------------------------
  const updateOverlay = useCallback(() => {
    const u = uplotRef.current;
    if (!u) {
      return;
    }

    const left = u.valToPos(timelineRange.from, 'x') + u.bbox.left;
    const right = u.valToPos(timelineRange.to, 'x') + u.bbox.left;

    const handleWidth = 6;
    const handleHeight = u.bbox.height * 0.6;
    const topOffset = (u.bbox.height - handleHeight) / 2;

    setDragStyles({
      dragOverlayStyle: {
        position: 'absolute',
        top: 0,
        left,
        width: right - left,
        height: u.bbox.height,
        cursor: 'grab',
        background: 'rgba(0, 123, 255, 0.1)',
        zIndex: 1,
      },
      leftHandleStyle: {
        position: 'absolute',
        top: topOffset,
        left: left - handleWidth,
        width: handleWidth,
        height: handleHeight,
        cursor: 'ew-resize',
        background: 'rgba(0, 123, 255, 0.6)',
        borderRadius: 2,
        zIndex: 2,
      },
      rightHandleStyle: {
        position: 'absolute',
        top: topOffset,
        left: right,
        width: handleWidth,
        height: handleHeight,
        cursor: 'ew-resize',
        background: 'rgba(0, 123, 255, 0.6)',
        borderRadius: 2,
        zIndex: 2,
      },
    });
  }, [timelineRange.from, timelineRange.to]);

  // -------------------------------------------------------------------------
  // Pan start handler
  // -------------------------------------------------------------------------
  const handlePanStart = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const u = uplotRef.current;
      if (!u || isDragging.current) {
        return;
      }

      const startX = e instanceof MouseEvent ? e.clientX : e.nativeEvent.clientX;
      const startFrom = visibleRange.from;
      const startTo = visibleRange.to;
      const pixelsToMs = (startTo - startFrom) / u.bbox.width;

      isPanning.current = true;
      suppressNextDashboardUpdate.current = true;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaPx = moveEvent.clientX - startX;
        const deltaMs = -deltaPx * pixelsToMs;
        const newFrom = startFrom + deltaMs;
        const newTo = startTo + deltaMs;
        setVisibleRange({ from: newFrom, to: newTo }, true);
      };

      const onMouseUp = () => {
        isPanning.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [setVisibleRange, visibleRange.from, visibleRange.to]
  );

  // -------------------------------------------------------------------------
  // Drag handler for selection overlay
  // -------------------------------------------------------------------------
  const handleDrag = useCallback(
    (e: React.MouseEvent, kind: 'move' | 'left' | 'right') => {
      const u = uplotRef.current;
      if (!u) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;

      const startX = e.clientX;
      const origFrom = timelineRange.from;
      const origTo = timelineRange.to;
      let newFrom = origFrom;
      let newTo = origTo;

      const MIN_WIDTH_PX = 10;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaPx = moveEvent.clientX - startX;

        const origFromPx = u.valToPos(origFrom, 'x');
        const origToPx = u.valToPos(origTo, 'x');

        let fromPx = origFromPx;
        let toPx = origToPx;

        if (kind === 'move') {
          fromPx += deltaPx;
          toPx += deltaPx;
        } else if (kind === 'left') {
          fromPx = origFromPx + deltaPx;
          if (toPx - fromPx < MIN_WIDTH_PX) {
            fromPx = toPx - MIN_WIDTH_PX;
          }
        } else if (kind === 'right') {
          toPx = origToPx + deltaPx;
          if (toPx - fromPx < MIN_WIDTH_PX) {
            toPx = fromPx + MIN_WIDTH_PX;
          }
        }

        newFrom = u.posToVal(fromPx, 'x');
        newTo = u.posToVal(toPx, 'x');

        u.setSelect({
          left: fromPx,
          top: 0,
          width: toPx - fromPx,
          height: u.bbox.height,
        });
        updateOverlay();
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        isDragging.current = false;

        u.setSelect({ left: 0, width: 0, top: 0, height: 0 });
        if (u.cursor?.drag) {
          u.cursor.drag.x = false;
        }

        const newRange = { from: newFrom, to: newTo };
        setTimelineRange(newRange);
        if (!suppressNextDashboardUpdate.current) {
          onChangeTimeRange(newRange);
        }
        suppressNextDashboardUpdate.current = false;
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [timelineRange.from, timelineRange.to, onChangeTimeRange, updateOverlay]
  );

  // -------------------------------------------------------------------------
  // Control actions
  // -------------------------------------------------------------------------
  const zoomContextWindow = useCallback(
    (factor: number) => {
      const mid = (visibleRange.from + visibleRange.to) / 2;
      const span = ((visibleRange.to - visibleRange.from) * factor) / 2;
      const newFrom = mid - span;
      const newTo = mid + span;
      setVisibleRange({ from: newFrom, to: newTo }, true);
    },
    [visibleRange.from, visibleRange.to, setVisibleRange]
  );

  const panContextWindow = useCallback(
    (direction: 'left' | 'right') => {
      const span = visibleRange.to - visibleRange.from;
      const shift = span * 0.25;
      const delta = direction === 'left' ? -shift : shift;
      setVisibleRange({ from: visibleRange.from + delta, to: visibleRange.to + delta }, true);
    },
    [visibleRange.from, visibleRange.to, setVisibleRange]
  );

  const resetContextWindow = useCallback(() => {
    const newRange = computeContextWindowFromSelection(timelineRange.from, timelineRange.to);
    suppressNextDashboardUpdate.current = true;
    setVisibleRange(newRange, true);
  }, [computeContextWindowFromSelection, timelineRange.from, timelineRange.to, setVisibleRange]);

  // -------------------------------------------------------------------------
  // Build UPlot configuration
  // -------------------------------------------------------------------------
  const chartConfig = useMemo(() => {
    const b = new UPlotConfigBuilder();

    b.setCursor({ y: false });

    b.addAxis({
      placement: AxisPlacement.Bottom,
      scaleKey: 'x',
      isTime: true,
      theme,
    });

    b.addAxis({
      placement: AxisPlacement.Left,
      scaleKey: 'y',
      theme,
      show: false,
      size: 0,
    });

    // Add series with metric-specific style and color
    const isErrorsMetric = metric === 'errors';
    const isDurationMetric = metric === 'duration';

    b.addSeries({
      scaleKey: 'y',
      lineWidth: isDurationMetric ? 1 : 0,
      show: true,
      theme,
      drawStyle: isDurationMetric ? DrawStyle.Line : DrawStyle.Bars,
      fillOpacity: isDurationMetric ? 30 : 50,
    });

    // Apply color override for the series
    const internalConfig = b.getConfig();
    if (internalConfig.series && internalConfig.series[1]) {
      let seriesColor: string;
      if (isDurationMetric) {
        seriesColor = theme.visualization.getColorByName('blue');
      } else if (isErrorsMetric) {
        seriesColor = theme.visualization.getColorByName('semi-dark-red');
      } else {
        seriesColor = theme.visualization.getColorByName('green');
      }

      internalConfig.series[1].stroke = seriesColor;
      internalConfig.series[1].fill = seriesColor;
    }

    b.addHook('setSelect', (u: uPlot) => {
      if (isProgrammaticSelect.current || skipNextSelectUpdate.current) {
        isProgrammaticSelect.current = false;
        skipNextSelectUpdate.current = false;
        return;
      }

      if (isPanning.current) {
        return;
      }

      if (isDragging.current) {
        return;
      }

      const xDrag = Boolean(u.cursor?.drag?.x);
      if (xDrag && u.select.left != null && u.select.width != null) {
        const from = u.posToVal(u.select.left, 'x');
        const to = u.posToVal(u.select.left + u.select.width, 'x');
        const newRange: AbsoluteTimeRange = { from, to };
        setTimelineRange(newRange);

        if (!suppressNextDashboardUpdate.current) {
          onChangeTimeRange(newRange);
        }

        suppressNextDashboardUpdate.current = false;
      }
    });

    b.addHook('ready', (u: uPlot) => {
      uplotRef.current = u;

      // Store the wheel listener so it can be reused in the overlay div
      wheelListenerRef.current = (e: WheelEvent) => {
        e.preventDefault();
        const zoomBase = 0.8;
        const zoomFactor = e.deltaY < 0 ? zoomBase : 1 / zoomBase;

        const rect = u.root.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - u.bbox.left;
        const cursorVal = u.posToVal(cursorX, 'x');

        const span = visibleRange.to - visibleRange.from;
        const newSpan = span * zoomFactor;
        const newFrom = cursorVal - ((cursorVal - visibleRange.from) / span) * newSpan;
        const newTo = newFrom + newSpan;

        setVisibleRange({ from: newFrom, to: newTo }, true);
      };

      // Attach wheel zoom to uPlot overlay
      const over = u.root.querySelector('.u-over') as HTMLElement;
      if (over && wheelListenerRef.current) {
        over.addEventListener('wheel', wheelListenerRef.current, { passive: false });

        (u as any)._cleanupWheelZoom = () => {
          over.removeEventListener('wheel', wheelListenerRef.current!);
        };
      }

      // Draw selection brush
      requestAnimationFrame(() => {
        const left = u.valToPos(timelineRange.from, 'x');
        const right = u.valToPos(timelineRange.to, 'x');
        u.setSelect({
          left,
          top: 0,
          width: right - left,
          height: u.bbox.height,
        });
        updateOverlay();
      });

      // Enable pan drag on bottom axis
      const bottomAxis = u.root.querySelector('.u-axis') as HTMLElement;
      if (bottomAxis) {
        bottomAxis.style.cursor = 'grab';
        const listener = (e: MouseEvent) => handlePanStart(e);
        bottomAxis.addEventListener('mousedown', listener);
        (u as any)._cleanupBottomAxisPan = () => {
          bottomAxis.removeEventListener('mousedown', listener);
        };
      }
    });

    b.addHook('destroy', (u: uPlot) => {
      if ((u as any)._cleanupBottomAxisPan) {
        (u as any)._cleanupBottomAxisPan();
      }
      if ((u as any)._cleanupWheelZoom) {
        (u as any)._cleanupWheelZoom();
      }
    });

    const finalConfig = b.getConfig();
    finalConfig.scales = finalConfig.scales ?? {};
    finalConfig.scales.x = {
      ...finalConfig.scales.x,
      range: [visibleRange.from, visibleRange.to],
    };

    return b;
  }, [
    theme,
    metric,
    visibleRange.from,
    visibleRange.to,
    timelineRange.from,
    timelineRange.to,
    setVisibleRange,
    handlePanStart,
    onChangeTimeRange,
    updateOverlay,
  ]);

  // -------------------------------------------------------------------------
  // Update overlay when dependencies change
  // -------------------------------------------------------------------------
  useEffect(() => {
    updateOverlay();
  }, [updateOverlay, visibleRange, timelineRange.from, timelineRange.to]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      updateOverlay();
    });
    return () => cancelAnimationFrame(frameId);
  }, [width, updateOverlay]);

  // -------------------------------------------------------------------------
  // Extract data for chart
  // -------------------------------------------------------------------------
  const timeField = data.series[0]?.fields.find((f) => f.type === 'time');
  const valueField = data.series[0]?.fields.find((f) => f.type === 'number');
  const timeValues = timeField?.values ?? [];
  const valueValues = valueField?.values ?? [];

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value = useMemo<TimeSeekerContextValue>(
    () => ({
      // State
      visibleRange,
      timelineRange,
      dashboardFrom,
      dashboardTo,
      now,
      dragStyles,
      loadingRanges,
      hasLargeBatchWarning,

      // Chart data
      timeValues,
      valueValues,
      width,
      chartHeight,
      chartConfig,

      // Refs
      uplotRef,
      wheelListenerRef,
      suppressNextDashboardUpdate,
      applyRelativeContextWindow,

      // Actions
      setVisibleRange,
      setTimelineRange,
      updateOverlay,
      handleDrag,
      handlePanStart,
      zoomContextWindow,
      panContextWindow,
      resetContextWindow,
      onChangeTimeRange,
    }),
    [
      visibleRange,
      timelineRange,
      dashboardFrom,
      dashboardTo,
      now,
      dragStyles,
      loadingRanges,
      hasLargeBatchWarning,
      timeValues,
      valueValues,
      width,
      chartHeight,
      chartConfig,
      setVisibleRange,
      updateOverlay,
      handleDrag,
      handlePanStart,
      zoomContextWindow,
      panContextWindow,
      resetContextWindow,
      onChangeTimeRange,
    ]
  );

  return <TimeSeekerContext.Provider value={value}>{children}</TimeSeekerContext.Provider>;
};

// ============================================================================
// Hook to consume the context
// ============================================================================

export function useTimeSeeker(): TimeSeekerContextValue {
  const context = useContext(TimeSeekerContext);
  if (!context) {
    throw new Error('useTimeSeeker must be used within a TimeSeekerProvider');
  }
  return context;
}

// ============================================================================
// Helper function to get theme-based styles (for compatibility)
// ============================================================================

export function getMetricColor(theme: GrafanaTheme2, metric?: MetricFunction): string {
  if (metric === 'duration') {
    return theme.visualization.getColorByName('blue');
  } else if (metric === 'errors') {
    return theme.visualization.getColorByName('semi-dark-red');
  }
  return theme.visualization.getColorByName('green');
}
