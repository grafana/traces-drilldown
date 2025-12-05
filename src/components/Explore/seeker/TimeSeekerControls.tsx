import React, { useState } from 'react';
import { AbsoluteTimeRange } from '@grafana/data';
import { IconButton, Popover, useStyles2, useTheme2 } from '@grafana/ui';
import { ContextWindowSelector } from './ContextWindowSelector';
import { getControlStyles } from './styles';
import { useTimeSeeker } from './TimeSeekerContext';

export const TimeSeekerControls: React.FC = () => {
  const theme = useTheme2();
  const styles = useStyles2(() => getControlStyles(theme));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const {
    dashboardFrom,
    dashboardTo,
    now,
    uplotRef,
    timelineRange,
    visibleRange,
    setVisibleRange,
    setTimelineRange,
    suppressNextDashboardUpdate,
    applyRelativeContextWindow,
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

  return (
    <>
      <div className={styles.floatingControls}>
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
          onClick={(e) => setAnchorEl(e.currentTarget)}
          size="sm"
          variant="secondary"
        />
      </div>
      {anchorEl && (
        <Popover
          referenceElement={anchorEl}
          show={true}
          content={
            <div className={styles.popoverContent}>
              <ContextWindowSelector
                dashboardFrom={dashboardFrom}
                dashboardTo={dashboardTo}
                now={now}
                visibleRange={visibleRange}
                setVisibleRange={handleSetVisibleRange}
                setRelativeContextDuration={(d) => {
                  applyRelativeContextWindow.current = d;
                }}
                onClose={() => setAnchorEl(null)}
              />
            </div>
          }
        />
      )}
    </>
  );
};
