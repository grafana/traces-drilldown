import React, { useMemo, RefObject, Dispatch, SetStateAction } from 'react';
import { AbsoluteTimeRange, GrafanaTheme2 } from '@grafana/data';
import { AxisPlacement, DrawStyle, UPlotConfigBuilder } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';
import type uPlot from 'uplot';

type InteractionMode = 'idle' | 'dragging' | 'panning' | 'programmatic';

type UPlotWithCleanupHandlers = uPlot & {
  _cleanupWheelZoom?: () => void;
  _cleanupBottomAxisPan?: () => void;
};

interface UseTimeSeekerChartConfigParams {
  theme: GrafanaTheme2;
  metric?: MetricFunction;
  visibleRange: AbsoluteTimeRange;
  timelineRange: { from: number; to: number };
  uplotRef: RefObject<uPlot | null>;
  wheelListenerRef: RefObject<((e: WheelEvent) => void) | null>;
  isProgrammaticSelect: RefObject<boolean>;
  skipNextSelectUpdate: RefObject<boolean>;
  interactionMode: RefObject<InteractionMode>;
  suppressNextTimeRangeUpdate: RefObject<boolean>;
  setVisibleRange: (range: AbsoluteTimeRange, suppressDashboardUpdate?: boolean) => void;
  setTimelineRange: Dispatch<SetStateAction<{ from: number; to: number }>>;
  handlePanStart: (e: MouseEvent | React.MouseEvent) => void;
  onChangeTimeRange: (range: AbsoluteTimeRange) => void;
  updateOverlay: () => void;
}

export function useTimeSeekerChartConfig({
  theme,
  metric,
  visibleRange,
  timelineRange,
  uplotRef,
  wheelListenerRef,
  isProgrammaticSelect,
  skipNextSelectUpdate,
  interactionMode,
  suppressNextTimeRangeUpdate,
  setVisibleRange,
  setTimelineRange,
  handlePanStart,
  onChangeTimeRange,
  updateOverlay,
}: UseTimeSeekerChartConfigParams): UPlotConfigBuilder {
  return useMemo(() => {
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

      // Skip if user is currently panning or dragging
      if (interactionMode.current === 'panning' || interactionMode.current === 'dragging') {
        return;
      }

      const xDrag = Boolean(u.cursor?.drag?.x);
      if (xDrag && u.select.left != null && u.select.width != null) {
        const from = u.posToVal(u.select.left, 'x');
        const to = u.posToVal(u.select.left + u.select.width, 'x');
        const newRange: AbsoluteTimeRange = { from, to };
        setTimelineRange(newRange);

        if (!suppressNextTimeRangeUpdate.current) {
          onChangeTimeRange(newRange);
        }

        suppressNextTimeRangeUpdate.current = false;
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

        const uPlotWithCleanup: UPlotWithCleanupHandlers = u;

        uPlotWithCleanup._cleanupWheelZoom = () => {
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
        const uPlotWithCleanup: UPlotWithCleanupHandlers = u;

        uPlotWithCleanup._cleanupBottomAxisPan = () => {
          bottomAxis.removeEventListener('mousedown', listener);
        };
      }
    });

    b.addHook('destroy', (u: uPlot) => {
      const uPlotWithCleanup: UPlotWithCleanupHandlers = u;

      if (uPlotWithCleanup._cleanupBottomAxisPan) {
        uPlotWithCleanup._cleanupBottomAxisPan();
      }
      if (uPlotWithCleanup._cleanupWheelZoom) {
        uPlotWithCleanup._cleanupWheelZoom();
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
    uplotRef,
    wheelListenerRef,
    isProgrammaticSelect,
    skipNextSelectUpdate,
    interactionMode,
    suppressNextTimeRangeUpdate,
    setTimelineRange,
  ]);
}
