import React from 'react';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { PanelDataErrorView } from '@grafana/runtime';

import { TimeSeekerProps } from './types';
import { TimeSeekerProvider } from './TimeSeekerContext';
import { TimeSeekerControls } from './TimeSeekerControls';
import { TimeSeekerChart } from './TimeSeekerChart';
import { GrafanaTheme2 } from '@grafana/data';

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
  hasLargeBatchWarning,
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
      hasLargeBatchWarning={hasLargeBatchWarning}
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

const getTimeSeekerStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    fontFamily: 'Open Sans',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: theme.spacing(2),
    height: theme.spacing(8),
  }),
  chartContainer: css({
    position: 'relative',
    width: '100%',
    height: 42,
  }),
});
