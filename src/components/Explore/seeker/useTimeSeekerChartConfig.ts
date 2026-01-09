import React, { useMemo, RefObject, Dispatch, SetStateAction } from 'react';
import { AbsoluteTimeRange, GrafanaTheme2 } from '@grafana/data';
import { AxisPlacement, DrawStyle, UPlotConfigBuilder } from '@grafana/ui';
import { MetricFunction } from 'utils/shared';

interface UseTimeSeekerChartConfigParams {
  theme: GrafanaTheme2;
  metric?: MetricFunction;
  visibleRange: AbsoluteTimeRange;
  timelineRange: { from: number; to: number };
  uplotRef: RefObject<uPlot | null>;
  wheelListenerRef: RefObject<((e: WheelEvent) => void) | null>;
  isProgrammaticSelect: RefObject<boolean>;
  skipNextSelectUpdate: RefObject<boolean>;
  isPanning: RefObject<boolean>;
  isDragging: RefObject<boolean>;
  suppressNextDashboardUpdate: RefObject<boolean>;
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
  isPanning,
  isDragging,
  suppressNextDashboardUpdate,
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
    uplotRef,
    wheelListenerRef,
    isProgrammaticSelect,
    skipNextSelectUpdate,
    isPanning,
    isDragging,
    suppressNextDashboardUpdate,
    setTimelineRange,
  ]);
}
