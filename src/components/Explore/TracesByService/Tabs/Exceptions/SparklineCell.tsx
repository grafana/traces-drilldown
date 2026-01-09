import React from 'react';
import { FieldType, GrafanaTheme2 } from '@grafana/data';
import { Sparkline, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GraphDrawStyle, VisibilityMode } from '@grafana/schema';

interface SparklineCellProps {
  seriesData: Array<{ time: number; count: number }>;
  theme: GrafanaTheme2;
}

export const SparklineCell = ({ seriesData, theme }: SparklineCellProps) => {
  const styles = useStyles2(getStyles);
  if (!seriesData || !seriesData.length) {
    return <div className={styles.message}>No data</div>;
  }

  const countValues = seriesData.map((point) => point.count);
  const timeValues = seriesData.map((point) => point.time);

  const validCountValues = countValues.filter((v) => isFinite(v) && !isNaN(v));
  const validTimeValues = timeValues.filter((v) => isFinite(v) && !isNaN(v));

  if (validCountValues.length < 2 || validTimeValues.length < 2) {
    return <div className={styles.message}>Not enough data</div>;
  }

  const minCount = Math.min(...validCountValues);
  const maxCount = Math.max(...validCountValues);
  const minTime = Math.min(...validTimeValues);
  const maxTime = Math.max(...validTimeValues);

  const countDelta = maxCount - minCount;
  const timeDelta = maxTime - minTime;

  const safeCountDelta = countDelta === 0 ? 1 : countDelta;
  const safeTimeDelta = timeDelta === 0 ? 1 : timeDelta;

  const sparklineData = {
    y: {
      name: 'count',
      type: FieldType.number,
      values: validCountValues,
      config: {},
      state: {
        range: {
          min: minCount,
          max: maxCount,
          delta: safeCountDelta,
        },
      },
    },
    x: {
      name: 'time',
      type: FieldType.time,
      values: validTimeValues,
      config: {},
      state: {
        range: {
          min: minTime,
          max: maxTime,
          delta: safeTimeDelta,
        },
      },
    },
  };

  return (
    <div className={styles.sparklineWrapper}>
      <Sparkline
        width={130}
        height={20}
        sparkline={sparklineData}
        theme={theme}
        config={{
          custom: {
            drawStyle: GraphDrawStyle.Line,
            fillOpacity: 5,
            fillColor: theme.colors.background.secondary,
            lineColor: theme.colors.primary.main,
            lineWidth: 1,
            showPoints: VisibilityMode.Never,
          },
        }}
      />
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    sparklineWrapper: css({
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    message: css({
      fontSize: theme.typography.bodySmall.fontSize,
      color: theme.colors.text.secondary,
      padding: theme.spacing(1),
    }),
  };
};

