import React from 'react';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { useTimeSeeker } from './TimeSeekerContext';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

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
            key={`loading-${idx}`}
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

const getLoadingOverlayStyles = (theme: GrafanaTheme2) => ({
  loadingOverlay: css({
    position: 'absolute',
    top: 0,
    height: '29px',
    background: `repeating-linear-gradient(
      -45deg,
      ${theme.colors.primary.shade},
      ${theme.colors.primary.shade} 4px,
      transparent 4px,
      transparent 8px
    )`,
    opacity: 0.6,
    pointerEvents: 'none',
    zIndex: 5,
    animation: 'loading-pulse 1.5s ease-in-out infinite',
    '@keyframes loading-pulse': {
      '0%, 100%': {
        opacity: 0.4,
      },
      '50%': {
        opacity: 0.7,
      },
    },
  }),
});
