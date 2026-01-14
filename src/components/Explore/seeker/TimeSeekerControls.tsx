import React, { useRef } from 'react';
import { AbsoluteTimeRange, GrafanaTheme2, TimeRange, dateTime } from '@grafana/data';
import { Icon, IconButton, TimeRangeInput, Tooltip, useStyles2, useTheme2 } from '@grafana/ui';
import { useTimeSeeker } from './TimeSeekerContext';
import { css } from '@emotion/css';

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
    suppressNextTimeRangeUpdate,
    zoomContextWindow,
    panContextWindow,
    resetContextWindow,
    hasLargeBatchWarning,
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
      suppressNextTimeRangeUpdate.current = true;
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

    const button = container.querySelector('button') as HTMLButtonElement;
    if (button) {
      button.focus();
      button.click();
      return;
    }
  };

  return (
    <div className={styles.floatingControls}>
      <div className={styles.floatingControlsContent}>
        {hasLargeBatchWarning && (
          <Tooltip
            content="The time seeker needs to load a large amount of data. Performance may be impacted."
            placement="bottom"
          >
            <Icon name="exclamation-triangle" size="sm" style={{ color: theme.colors.warning.main }} />
          </Tooltip>
        )}
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
          tooltip="Focus selection"
          name="crosshair"
          onClick={resetContextWindow}
          size="sm"
          variant="secondary"
        />
        <IconButton name="calendar-alt" tooltip="Set range" onClick={handleButtonClick} size="sm" variant="secondary" />
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

const getControlStyles = (theme: GrafanaTheme2) => ({
  floatingControls: css({
    position: 'absolute',
    top: 0,
    right: 0,
  }),
  floatingControlsContent: css({
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    gap: 4,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: 4,
    padding: 2,
    zIndex: 3,
    opacity: 0.3,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    },
    button: {
      margin: 0,
    },
  }),
  popoverContent: css({
    backgroundColor: theme.colors.background.primary,
    padding: 8,
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  }),
  buttonWrapper: css({
    position: 'relative',
    display: 'inline-block',
  }),
  timeRangeInputContainer: css({
    // Position the input container at the right side of the controls
    position: 'absolute',
    top: 0,
    right: 0,
    width: 1,
    height: '100%',
    // Don't block pointer events on the container itself - clicks pass through to button
    pointerEvents: 'none',
    overflow: 'visible',
    // Lower z-index so button is on top, but allow popup to show above
    zIndex: -1,
    // Hide the wrapper visually but keep functional
    '& > div': {
      position: 'relative',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      // Hide the trigger button but allow popup to show
      '& > button': {
        opacity: 0,
        pointerEvents: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      },
      // Ensure the popup section is visible and interactive
      '& > section, & section[data-floating-ui-focusable]': {
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto',
        zIndex: 10000,
        // Reset font styling to default Grafana styles
        fontFamily: theme.typography.fontFamily,
        '& *': {
          // Ensure all children have proper font styling
          fontFamily: 'inherit',
          fontSize: 'inherit',
        },
      },
      // Also ensure popup content is visible
      '& #TimePickerContent, & [id*="TimePicker"]': {
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto',
        fontFamily: theme.typography.fontFamily,
      },
    },
  }),
});
