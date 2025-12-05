import React from 'react';
import { cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';

import { TimeSeekerProps } from './types';
import { getTimeSeekerStyles } from './styles';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { TimeSeekerControls } from './TimeSeekerControls';
import { TimeSeekerChart } from './TimeSeekerChart';

const CHART_HEIGHT = 42;

export const TimeSeeker: React.FC<TimeSeekerProps> = ({
  data,
  width,
  fieldConfig,
  id,
  metric,
  initialVisibleRange,
  onChangeTimeRange,
  onVisibleRangeChange,
  loadingRanges,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(() => getTimeSeekerStyles(theme));

  // Error state - show before provider to avoid unnecessary context creation
  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id ?? 0} data={data} needsStringField />;
  }

  return (
    <TimeSeekerProvider
      data={data}
      width={width}
      chartHeight={CHART_HEIGHT}
      metric={metric}
      initialVisibleRange={initialVisibleRange}
      loadingRanges={loadingRanges}
      onChangeTimeRange={onChangeTimeRange}
      onVisibleRangeChange={onVisibleRangeChange}
    >
      <div className={cx(styles.wrapper)}>
        <TimeSeekerControls />
        <TimeSeekerChart />
      </div>
    </TimeSeekerProvider>
  );
};

// Re-export types for convenience
export type { TimeSeekerProps } from './types';
