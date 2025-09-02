import React, { ReactElement, useEffect, useState } from 'react';

import { GrafanaTheme2, TimeRange } from '@grafana/data';
import { usePluginComponent } from '@grafana/runtime';
import { sceneGraph, SceneObject } from '@grafana/scenes';
import { css } from '@emotion/css';
import { useStyles2 } from '@grafana/ui';
import { getMetricVariable, getTraceExplorationScene } from 'utils/utils';
import { MetricFunction } from 'utils/shared';

export type AssertionSeverity = 'warning' | 'critical' | 'info';

export interface EntityAssertion {
  severity?: AssertionSeverity;
  amend?: boolean;
  assertions?: Array<{
    assertionName: string;
    severity: AssertionSeverity;
    category: string;
    entityType: string;
  }>;
}

export interface HealthState extends EntityAssertion {
  start: number;
  end: number;
  context: Record<string, string>;
}

export interface Cluster {
  start: number;
  end: number;
  assertionStates: HealthState[];
  assertionSummaries: Array<{
    summary: string;
    category: string;
  }>;
}

interface InsightsTimelineWidgetProps {
  serviceName: string;
  start: string;
  end: string;
  filterBySeverity?: AssertionSeverity[];
  filterBySummaryKeywords?: string[];
  isEmbeddedApp?: boolean;
  dataCallback: (data: Record<string, { healthStates: HealthState[], clusters: Cluster[] }>) => void;
}

export type InsightsTimelineWidgetExternal = (props: InsightsTimelineWidgetProps) => ReactElement | null;

interface Props {
  serviceName: string;
  model: SceneObject;
}

export function InsightsTimelineWidget({ serviceName, model }: Props) {
  const { isLoading, component: InsightsTimelineWidgetExternal } = usePluginComponent<InsightsTimelineWidgetProps>(
    'grafana-asserts-app/insights-timeline-widget/v1'
  );
  const [timeRange, setTimeRange] = useState<TimeRange>();
  const [showTitle, setShowTitle] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const styles = useStyles2(getStyles);
  const traceExploration = getTraceExplorationScene(model);
  const { embedded } = traceExploration.useState();
  const sceneTimeRange = sceneGraph.getTimeRange(model).useState();

  useEffect(() => {
    setTimeRange(sceneTimeRange.value);
    setShowInsights(true);  // reset to true to show insights, which will call checkHasData()
  }, [sceneTimeRange]);

  const checkHasData = (data: Record<string, { healthStates: HealthState[], clusters: Cluster[] }>) => {
    const clustersAndHealthStates = Array.isArray(data) ? data : Object.values(data);
    const hasData = clustersAndHealthStates.some((clustersAndHealthState) => {
      const healthCount = clustersAndHealthState?.healthStates?.length ?? 0;
      return healthCount > 0;
    });
    setShowTitle(hasData);
    setShowInsights(hasData);
  };

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
  
  if (isLoading || !InsightsTimelineWidgetExternal || !timeRange) {
    return null;
  }

  return (
    <div className={styles.insightsContainer}>
      {showTitle && (
        <div className={styles.insightsTitle}>
          Insights
        </div>
      )}
      {showInsights && (
        <div className={styles.insightsTimelineContainer}>
          <InsightsTimelineWidgetExternal
            serviceName={serviceName}
            start={timeRange.from.toISOString()}
            end={timeRange.to.toISOString()}
            filterBySeverity={filterBySeverity}
            filterBySummaryKeywords={filterBySummaryKeywords}
            dataCallback={(data: Record<string, { healthStates: HealthState[], clusters: Cluster[] }>) => checkHasData(data)}
            isEmbeddedApp={embedded}
          />
        </div>
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    insightsContainer: css({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px',
    }),
    insightsTitle: css({
      fontSize: '12px',
      color: theme.colors.text.secondary,
      marginLeft: '35px',
      marginTop: '-3px',
    }),
    insightsTimelineContainer: css({
      marginLeft: '10px',
      marginRight: '15px',
      width: '100%',
    }),
  };
}
