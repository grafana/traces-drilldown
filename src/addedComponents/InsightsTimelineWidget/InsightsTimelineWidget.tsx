import React, { ReactElement } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { usePluginComponent } from '@grafana/runtime';
import { sceneGraph, SceneObject } from '@grafana/scenes';
import { InsightsTimelineWidgetProps } from "@grafana/plugin-types/grafana-asserts-app/"
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { getMetricVariable } from 'utils/utils';
import { MetricFunction } from 'utils/shared';

export type AssertionSeverity = 'warning' | 'critical' | 'info';

export type InsightsTimelineWidgetExternal = (props: InsightsTimelineWidgetProps) => ReactElement | null;

interface Props {
  serviceName: string;
  model: SceneObject;
}

export function InsightsTimelineWidget({ serviceName, model }: Props) {
  const { isLoading, component: InsightsTimelineWidgetExternal } = usePluginComponent<InsightsTimelineWidgetProps>(
    'grafana-asserts-app/insights-timeline-widget/v1'
  );
  const styles = useStyles2(getStyles);
  const sceneTimeRange = sceneGraph.getTimeRange(model).useState();

  const metric = getMetricVariable(model).state.value as MetricFunction;
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

  if (isLoading || !InsightsTimelineWidgetExternal || !sceneTimeRange || !serviceName) {
    return null;
  }

  return (
    <InsightsTimelineWidgetExternal
      serviceName={serviceName}
      start={sceneTimeRange.from.valueOf()}
      end={sceneTimeRange.to.valueOf()}
      filterBySeverity={filterBySeverity}
      filterBySummaryKeywords={filterBySummaryKeywords}
      label={<div className={styles.label}>Insights</div>}
    />
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    label: css({
      fontSize: '12px',
      color: theme.colors.text.secondary,
      marginLeft: '35px', // we are also passing an axisWidth of 70 to barsPanelConfig()
      marginTop: '-3px',
    }),
  };
}
