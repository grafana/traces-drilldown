import React from 'react';
import { useStyles2 } from '@grafana/ui';
import { useTimeSeeker } from './TimeSeekerContext';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

export const TimeSeekerDragOverlay: React.FC = () => {
  const styles = useStyles2(getDragOverlayStyles);

  const { dragStyles, wheelListenerRef, handleDrag } = useTimeSeeker();

  if (!dragStyles.dragOverlayStyle) {
    return null;
  }

  return (
    <>
      <div
        style={dragStyles.dragOverlayStyle}
        onMouseDown={(e) => handleDrag(e, 'move')}
        onWheel={(e) => wheelListenerRef.current?.(e.nativeEvent)}
      />
      <div
        className={styles.resizeHandle}
        style={dragStyles.leftHandleStyle}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleDrag(e, 'left');
        }}
      />
      <div
        className={styles.resizeHandle}
        style={dragStyles.rightHandleStyle}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleDrag(e, 'right');
        }}
      />
    </>
  );
};

const getDragOverlayStyles = (theme: GrafanaTheme2) => ({
  resizeHandle: css({
    position: 'absolute',
    top: 0,
    width: '4px',
    height: '100%',
    background: theme.colors.text.secondary,
    border: 'none',
    cursor: 'ew-resize',
    zIndex: 2,
    transition: 'background 0.2s',
    '&:hover': {
      background: theme.colors.text.primary,
    },
  }),
});
