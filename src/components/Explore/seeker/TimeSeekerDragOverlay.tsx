import React from 'react';
import { useStyles2 } from '@grafana/ui';
import { useTimeSeeker } from './TimeSeekerContext';
import { css } from '@emotion/css';

export const TimeSeekerDragOverlay: React.FC = () => {
  const styles = useStyles2(() => getDragOverlayStyles());

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

const getDragOverlayStyles = () => ({
  resizeHandle: css({
    position: 'absolute',
    top: 0,
    width: '4px',
    height: '100%',
    background: 'linear-gradient(to right, rgba(0, 123, 255, 0.4), rgba(0, 123, 255, 0.2))',
    border: '1px solid rgba(0, 123, 255, 0.8)',
    cursor: 'ew-resize',
    zIndex: 2,
    boxShadow: '0 0 4px rgba(0, 123, 255, 0.5)',
    transition: 'background 0.2s',
    '&:hover': {
      background: 'rgba(0, 123, 255, 0.6)',
    },
  }),
});
