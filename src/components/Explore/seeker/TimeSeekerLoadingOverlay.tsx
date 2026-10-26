import React, { useLayoutEffect, useState } from 'react';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { useTimeSeeker } from './TimeSeekerContext';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

interface LoadingOverlayPosition {
  index: number;
  left: number;
  width: number;
}

export const TimeSeekerLoadingOverlay: React.FC = () => {
  const theme = useTheme2();
  const styles = useStyles2(() => getLoadingOverlayStyles(theme));

  const { loadingRanges, uplotRef, chartHeight } = useTimeSeeker();
  const [positions, setPositions] = useState<LoadingOverlayPosition[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- measure after each render: plot geometry can change without the ref changing.
  useLayoutEffect(() => {
    const u = uplotRef.current;
    const nextPositions: LoadingOverlayPosition[] = [];

    if (u && loadingRanges) {
      loadingRanges.forEach((range, index) => {
        const left = u.valToPos(range.from, 'x') + u.bbox.left;
        const right = u.valToPos(range.to, 'x') + u.bbox.left;
        const width = right - left;

        if (width <= 0) {
          return;
        }

        nextPositions.push({ index, left, width });
      });
    }

    setPositions((previous) => {
      const unchanged =
        previous.length === nextPositions.length &&
        nextPositions.every(
          (position, index) =>
            position.index === previous[index]?.index &&
            position.left === previous[index]?.left &&
            position.width === previous[index]?.width
        );

      if (unchanged) {
        return previous;
      }

      return nextPositions;
    });
  });

  return (
    <>
      {positions.map((position) => (
        <div
          key={`loading-${position.index}`}
          data-testid="time-seeker-loading-overlay"
          className={styles.loadingOverlay}
          style={{
            left: position.left,
            width: position.width,
            height: chartHeight,
          }}
        />
      ))}
    </>
  );
};

const getLoadingOverlayStyles = (theme: GrafanaTheme2) => ({
  loadingOverlay: css({
    position: 'absolute',
    top: 0,
    background: `repeating-linear-gradient(
      -45deg,
      ${theme.colors.text.secondary},
      ${theme.colors.text.secondary} 4px,
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
