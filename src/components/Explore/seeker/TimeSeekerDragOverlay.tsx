import React from 'react';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { getDragOverlayStyles } from './styles';
import { useTimeSeeker } from './TimeSeekerContext';

export const TimeSeekerDragOverlay: React.FC = () => {
  const theme = useTheme2();
  const styles = useStyles2(() => getDragOverlayStyles(theme));

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
