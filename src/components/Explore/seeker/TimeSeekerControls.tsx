import React, { useRef } from 'react';
import { AbsoluteTimeRange, TimeRange, dateTime } from '@grafana/data';
import { IconButton, TimeRangeInput, useStyles2, useTheme2 } from '@grafana/ui';
import { getControlStyles } from './styles';
import { useTimeSeeker } from './TimeSeekerContext';

export const TimeSeekerControls: React.FC = () => {
  const theme = useTheme2();
  const styles = useStyles2(() => getControlStyles(theme));
  const timeRangeInputContainerRef = useRef<HTMLDivElement>(null);

  const {
    uplotRef,
    timelineRange,
    visibleRange,
    setVisibleRange,
    setTimelineRange,
    suppressNextDashboardUpdate,
    zoomContextWindow,
    panContextWindow,
    resetContextWindow,
  } = useTimeSeeker();

  const handleSetVisibleRange = (r: AbsoluteTimeRange) => {
    const oldVisibleFrom = visibleRange.from;
    const oldVisibleTo = visibleRange.to;
    const visibleSpan = oldVisibleTo - oldVisibleFrom;

    const relFrom = (timelineRange.from - oldVisibleFrom) / visibleSpan;
    const relTo = (timelineRange.to - oldVisibleFrom) / visibleSpan;

    const newVisibleFrom = r.from;
    const newVisibleTo = r.to;

    const newTimelineFrom = newVisibleFrom + relFrom * (newVisibleTo - newVisibleFrom);
    const newTimelineTo = newVisibleFrom + relTo * (newVisibleTo - newVisibleFrom);

    setVisibleRange(r, true);
    requestAnimationFrame(() => {
      suppressNextDashboardUpdate.current = true;
      setTimelineRange({ from: newTimelineFrom, to: newTimelineTo });

      const u = uplotRef.current;
      if (u) {
        u.setSelect({ left: 0, top: 0, width: 0, height: 0 });
      }
    });
  };

  // Convert AbsoluteTimeRange to TimeRange
  const timeRangeValue: TimeRange = {
    from: dateTime(visibleRange.from),
    to: dateTime(visibleRange.to),
    raw: {
      from: dateTime(visibleRange.from),
      to: dateTime(visibleRange.to),
    },
  };

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    const newAbsoluteRange: AbsoluteTimeRange = {
      from: newTimeRange.from.valueOf(),
      to: newTimeRange.to.valueOf(),
    };
    handleSetVisibleRange(newAbsoluteRange);
  };

  const handleButtonClick = () => {
    // Trigger the TimeRangeInput popup by clicking its input
    if (!timeRangeInputContainerRef.current) {
      return;
    }

    const container = timeRangeInputContainerRef.current;

    // Use requestAnimationFrame and setTimeout to ensure the component is ready
    requestAnimationFrame(() => {
      setTimeout(() => {
        const button = container.querySelector('button') as HTMLButtonElement;
        if (button) {
          button.focus();
          button.click();
          return;
        }
      }, 100);
    });
  };

  return (
    <div className={styles.floatingControls}>
      <div className={styles.floatingControlsContent}>
        <IconButton
          tooltip="Pan left"
          name="arrow-left"
          onClick={() => panContextWindow('left')}
          size="sm"
          variant="secondary"
        />
        <IconButton
          tooltip="Zoom out context"
          name="search-minus"
          onClick={() => zoomContextWindow(2)}
          size="sm"
          variant="secondary"
        />
        <IconButton
          tooltip="Zoom in context"
          name="search-plus"
          onClick={() => zoomContextWindow(0.5)}
          size="sm"
          variant="secondary"
        />
        <IconButton
          tooltip="Pan right"
          name="arrow-right"
          onClick={() => panContextWindow('right')}
          size="sm"
          variant="secondary"
        />
        <IconButton
          tooltip="Reset context window"
          name="crosshair"
          onClick={resetContextWindow}
          size="sm"
          variant="secondary"
        />
        <IconButton
          name="calendar-alt"
          tooltip="Set context window"
          onClick={handleButtonClick}
          size="sm"
          variant="secondary"
        />
        <div ref={timeRangeInputContainerRef} className={styles.timeRangeInputContainer}>
          <TimeRangeInput
            value={timeRangeValue}
            onChange={handleTimeRangeChange}
            hideQuickRanges={false}
            showIcon={false}
          />
        </div>
      </div>
    </div>
  );
};
