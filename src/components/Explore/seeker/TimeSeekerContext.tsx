import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  Dispatch,
  SetStateAction,
} from 'react';
import { AbsoluteTimeRange, durationToMilliseconds, GrafanaTheme2, parseDuration, PanelData } from '@grafana/data';
import { UPlotConfigBuilder, useTheme2 } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';
import { DragStyles } from './types';
import { useTimeSeekerChartConfig } from './useTimeSeekerChartConfig';

// ============================================================================
// Constants
// ============================================================================

/** Factor to expand selection into visible context window (8x the selection span) */
const CONTEXT_WINDOW_ZOOM_FACTOR = 8;
/** Tolerance in ms for detecting same time range */
const TIME_RANGE_TOLERANCE_MS = 1000;
/** Factor for pan operations (25% of visible span) */
const PAN_FACTOR = 0.25;
/** Minimum width in pixels for selection handles */
const MIN_SELECTION_WIDTH_PX = 10;
/** Width in pixels for drag handles */
const HANDLE_WIDTH_PX = 6;
/** Height ratio for drag handles (60% of chart height) */
const HANDLE_HEIGHT_RATIO = 0.6;

// ============================================================================
// Types
// ============================================================================

/** Tracks the current user interaction mode to prevent conflicting operations */
type InteractionMode = 'idle' | 'dragging' | 'panning' | 'programmatic';

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
  uplotRef: React.RefObject<uPlot | null>;
  wheelListenerRef: React.RefObject<((e: WheelEvent) => void) | null>;
  suppressNextDashboardUpdate: React.RefObject<boolean>;
  applyRelativeContextWindow: React.RefObject<string | null>;

  // Actions
  setVisibleRange: (range: AbsoluteTimeRange, suppressDashboardUpdate?: boolean) => void;
  setTimelineRange: Dispatch<SetStateAction<{ from: number; to: number }>>;
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
// Helper Functions
// ============================================================================

/**
 * Computes a zoomed-out context window centered on the given selection.
 * Ensures the result doesn't extend into the future.
 */
function computeContextWindowFromSelection(from: number, to: number, maxTime: number): AbsoluteTimeRange {
  const mid = (from + to) / 2;
  const span = to - from;
  const zoomSpan = span * CONTEXT_WINDOW_ZOOM_FACTOR;

  let newFrom = mid - zoomSpan / 2;
  let newTo = mid + zoomSpan / 2;

  // Clamp to not extend into the future
  if (newTo > maxTime) {
    const shift = newTo - maxTime;
    newFrom -= shift;
    newTo = maxTime;
  }

  return { from: newFrom, to: newTo };
}

function areRangesEqual(
  a: { from: number; to: number },
  b: { from: number; to: number },
  tolerance = TIME_RANGE_TOLERANCE_MS
): boolean {
  return Math.abs(a.from - b.from) < tolerance && Math.abs(a.to - b.to) < tolerance;
}

/**
 * Parses a relative time string like "now-1h" and returns the duration in ms.
 * Returns null if parsing fails or the format doesn't match.
 */
function parseRelativeTimeRange(raw: { from: unknown; to: unknown }): string | null {
  if (typeof raw.from !== 'string' || typeof raw.to !== 'string' || raw.to !== 'now') {
    return null;
  }
  const match = raw.from.match(/^now-(\d+[smhdw])$/);
  return match ? match[1] : null;
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
  // State
  // -------------------------------------------------------------------------
  const [timelineRange, setTimelineRange] = useState({ from: dashboardFrom, to: dashboardTo });
  const [visibleRange, setVisibleRangeState] = useState<AbsoluteTimeRange>(
    initialVisibleRange ?? computeContextWindowFromSelection(dashboardFrom, dashboardTo, now)
  );
  const [dragStyles, setDragStyles] = useState<DragStyles>({});

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  const uplotRef = useRef<uPlot | null>(null);
  const wheelListenerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const applyRelativeContextWindow = useRef<string | null>(null);
  const lastDashboardRange = useRef<AbsoluteTimeRange>({ from: dashboardFrom, to: dashboardTo });

  // Interaction tracking - consolidates multiple boolean flags
  const interactionMode = useRef<InteractionMode>('idle');
  const suppressNextDashboardUpdate = useRef(false);

  // -------------------------------------------------------------------------
  // Set visible range with optional dashboard update suppression
  // -------------------------------------------------------------------------
  const setVisibleRange = useCallback(
    (range: AbsoluteTimeRange, suppressDashboardUpdate = false) => {
      setVisibleRangeState(range);
      onVisibleRangeChange?.(range);

      if (suppressDashboardUpdate) {
        suppressNextDashboardUpdate.current = true;
        interactionMode.current = 'programmatic';
      }
    },
    [onVisibleRangeChange]
  );

  // -------------------------------------------------------------------------
  // Handle relative time ranges (e.g., "now-1h") and sync dashboard changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const relativeDuration = parseRelativeTimeRange(data.timeRange.raw);
    if (relativeDuration) {
      applyRelativeContextWindow.current = relativeDuration;
    }

    // Check if dashboard range changed
    const dashboardChanged = !areRangesEqual(lastDashboardRange.current, { from: dashboardFrom, to: dashboardTo });
    const timelineMatchesDashboard = areRangesEqual(timelineRange, { from: dashboardFrom, to: dashboardTo });

    if (dashboardChanged && !timelineMatchesDashboard) {
      setTimelineRange({ from: dashboardFrom, to: dashboardTo });
    }

    lastDashboardRange.current = { from: dashboardFrom, to: dashboardTo };
  }, [data.timeRange.raw, dashboardFrom, dashboardTo, timelineRange]);

  // -------------------------------------------------------------------------
  // Apply relative context window when set
  // -------------------------------------------------------------------------
  useEffect(() => {
    const duration = applyRelativeContextWindow.current;
    if (!duration) {
      return;
    }

    try {
      const durMs = durationToMilliseconds(parseDuration(duration));
      const brushTo = dashboardTo;
      const brushFrom = dashboardTo - durMs;

      suppressNextDashboardUpdate.current = true;
      setTimelineRange({ from: brushFrom, to: brushTo });

      const sameRange = areRangesEqual(visibleRange, { from: brushFrom, to: brushTo }, 10);
      if (sameRange) {
        const context = computeContextWindowFromSelection(brushFrom, brushTo, now);
        setVisibleRange(context, true);
      }
    } catch (err) {
      console.error('Failed to apply relative context window', err);
    } finally {
      applyRelativeContextWindow.current = null;
    }
  }, [dashboardTo, visibleRange, setVisibleRange, now]);

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
    const handleHeight = u.bbox.height * HANDLE_HEIGHT_RATIO;
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
        left: left - HANDLE_WIDTH_PX,
        width: HANDLE_WIDTH_PX,
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
        width: HANDLE_WIDTH_PX,
        height: handleHeight,
        cursor: 'ew-resize',
        background: 'rgba(0, 123, 255, 0.6)',
        borderRadius: 2,
        zIndex: 2,
      },
    });
  }, [timelineRange.from, timelineRange.to]);

  // -------------------------------------------------------------------------
  // Pan start handler (for axis dragging)
  // -------------------------------------------------------------------------
  const handlePanStart = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const u = uplotRef.current;
      if (!u || interactionMode.current !== 'idle') {
        return;
      }

      const startX = e instanceof MouseEvent ? e.clientX : e.nativeEvent.clientX;
      const startFrom = visibleRange.from;
      const startTo = visibleRange.to;
      const pixelsToMs = (startTo - startFrom) / u.bbox.width;

      interactionMode.current = 'panning';
      suppressNextDashboardUpdate.current = true;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaPx = moveEvent.clientX - startX;
        const deltaMs = -deltaPx * pixelsToMs;
        setVisibleRange({ from: startFrom + deltaMs, to: startTo + deltaMs }, true);
      };

      const onMouseUp = () => {
        interactionMode.current = 'idle';
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

      interactionMode.current = 'dragging';

      const startX = e.clientX;
      const origFrom = timelineRange.from;
      const origTo = timelineRange.to;
      let newFrom = origFrom;
      let newTo = origTo;

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
          if (toPx - fromPx < MIN_SELECTION_WIDTH_PX) {
            fromPx = toPx - MIN_SELECTION_WIDTH_PX;
          }
        } else if (kind === 'right') {
          toPx = origToPx + deltaPx;
          if (toPx - fromPx < MIN_SELECTION_WIDTH_PX) {
            toPx = fromPx + MIN_SELECTION_WIDTH_PX;
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
        interactionMode.current = 'idle';

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
      const halfSpan = ((visibleRange.to - visibleRange.from) * factor) / 2;
      setVisibleRange({ from: mid - halfSpan, to: mid + halfSpan }, true);
    },
    [visibleRange.from, visibleRange.to, setVisibleRange]
  );

  const panContextWindow = useCallback(
    (direction: 'left' | 'right') => {
      const span = visibleRange.to - visibleRange.from;
      const shift = span * PAN_FACTOR;
      const delta = direction === 'left' ? -shift : shift;
      setVisibleRange({ from: visibleRange.from + delta, to: visibleRange.to + delta }, true);
    },
    [visibleRange.from, visibleRange.to, setVisibleRange]
  );

  const resetContextWindow = useCallback(() => {
    const newRange = computeContextWindowFromSelection(timelineRange.from, timelineRange.to, now);
    setVisibleRange(newRange, true);
  }, [timelineRange.from, timelineRange.to, setVisibleRange, now]);

  // -------------------------------------------------------------------------
  // Build UPlot configuration
  // -------------------------------------------------------------------------
  // Create refs for chart config that won't trigger re-renders
  const isProgrammaticSelect = useRef(false);
  const skipNextSelectUpdate = useRef(false);

  // Sync programmatic flags when interaction mode changes
  useEffect(() => {
    if (interactionMode.current === 'programmatic') {
      isProgrammaticSelect.current = true;
      skipNextSelectUpdate.current = true;
      // Reset to idle after a frame
      requestAnimationFrame(() => {
        interactionMode.current = 'idle';
      });
    }
  });

  const chartConfig = useTimeSeekerChartConfig({
    theme,
    metric,
    visibleRange,
    timelineRange,
    uplotRef,
    wheelListenerRef,
    isProgrammaticSelect,
    skipNextSelectUpdate,
    isPanning: { current: interactionMode.current === 'panning' } as React.RefObject<boolean>,
    isDragging: { current: interactionMode.current === 'dragging' } as React.RefObject<boolean>,
    suppressNextDashboardUpdate,
    setVisibleRange,
    setTimelineRange,
    handlePanStart,
    onChangeTimeRange,
    updateOverlay,
  });

  // -------------------------------------------------------------------------
  // Update overlay when dependencies change (consolidated effect)
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Use requestAnimationFrame to batch updates and handle width changes smoothly
    const frameId = requestAnimationFrame(() => {
      updateOverlay();
    });
    return () => cancelAnimationFrame(frameId);
  }, [updateOverlay, visibleRange, timelineRange.from, timelineRange.to, width]);

  // -------------------------------------------------------------------------
  // Extract data for chart (memoized to prevent dependency instability)
  // -------------------------------------------------------------------------
  const { timeValues, valueValues } = useMemo(() => {
    const timeField = data.series[0]?.fields.find((f) => f.type === 'time');
    const valueField = data.series[0]?.fields.find((f) => f.type === 'number');
    return {
      timeValues: timeField?.values ?? [],
      valueValues: valueField?.values ?? [],
    };
  }, [data.series]);

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
