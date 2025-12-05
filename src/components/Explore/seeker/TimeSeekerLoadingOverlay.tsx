import React from 'react';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { getLoadingOverlayStyles } from './styles';
import { useTimeSeeker } from './TimeSeekerContext';

export const TimeSeekerLoadingOverlay: React.FC = () => {
  const theme = useTheme2();
  const styles = useStyles2(() => getLoadingOverlayStyles(theme));

  const { loadingRanges, uplotRef } = useTimeSeeker();

  if (!loadingRanges || loadingRanges.length === 0) {
    return null;
  }

  return (
    <>
      {loadingRanges.map((range, idx) => {
        const u = uplotRef.current;
        if (!u) {
          return null;
        }
        const left = u.valToPos(range.from, 'x') + u.bbox.left;
        const right = u.valToPos(range.to, 'x') + u.bbox.left;
        const rangeWidth = right - left;
        if (rangeWidth <= 0) {
          return null;
        }
        return (
          <div
            key={idx}
            className={styles.loadingOverlay}
            style={{
              left,
              width: rangeWidth,
            }}
          />
        );
      })}
    </>
  );
};
