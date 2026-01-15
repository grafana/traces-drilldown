import React, { memo, ReactElement } from 'react';

import { usePluginComponent } from '@grafana/runtime';
import { InsightsTimelineWidgetProps } from '@grafana/plugin-types/grafana-asserts-app/';
import { MetricFunction } from 'utils/shared';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

export type AssertionSeverity = 'warning' | 'critical' | 'info';

export type InsightsTimelineWidgetExternal = (props: InsightsTimelineWidgetProps) => ReactElement | null;

interface Props {
  serviceName: string;
  metric: MetricFunction;
  startTime: string;
  endTime: string;
}

export const InsightsTimelineWidget = memo(function InsightsTimelineWidget({
  serviceName,
  metric,
  startTime,
  endTime,
}: Props) {
  const { isLoading, component: InsightsTimelineWidgetExternal } = usePluginComponent<InsightsTimelineWidgetProps>(
    'grafana-asserts-app/insights-timeline-widget/v1'
  );

  const styles = useStyles2(getStyles);

  let filterBySeverity: AssertionSeverity[] = [];
  if (metric === 'errors') {
    filterBySeverity = ['critical', 'warning'];
  } else if (metric === 'rate') {
    filterBySeverity = ['info'];
  }

  let filterBySummaryKeywords: string[] = [];
  if (metric === 'duration') {
    filterBySummaryKeywords = ['latency'];
  }

  if (isLoading || !InsightsTimelineWidgetExternal || !serviceName) {
    return null;
  }

  return (
    <div className={styles.container}>
      <InsightsTimelineWidgetExternal
        serviceName={serviceName}
        start={startTime}
        end={endTime}
        filterBySeverity={filterBySeverity}
        filterBySummaryKeywords={filterBySummaryKeywords}
      />
    </div>
  );
});

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    padding: theme.spacing(1, 0),
    '& > *:first-child': {
      marginBottom: 0,
    },
  }),
});
