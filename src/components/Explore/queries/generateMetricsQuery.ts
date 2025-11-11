import { getTraceExplorationScene } from 'utils/utils';
import { ALL, MetricFunction, VAR_FILTERS_EXPR, VAR_DURATION_PERCENTILES_EXPR } from '../../../utils/shared';
import { SceneObject } from '@grafana/scenes';

interface QueryOptions {
  metric: MetricFunction;
  extraFilters?: string;
  groupByKey?: string;
  sample?: string;
}

export function generateMetricsQuery({ metric, groupByKey, extraFilters, sample = '' }: QueryOptions) {
  // Generate span set filters
  let filters = `${VAR_FILTERS_EXPR}`;

  if (metric === 'errors') {
    filters += ' && status=error';
  }

  if (extraFilters) {
    filters += ` && ${extraFilters}`;
  }

  if (groupByKey && groupByKey !== ALL) {
    filters += ` && ${groupByKey} != nil`;
  }

  // Generate metrics function
  let metricFn = 'rate()';
  switch (metric) {
    case 'errors':
      metricFn = 'rate()';
      break;
    case 'duration':
      metricFn = `quantile_over_time(duration, ${VAR_DURATION_PERCENTILES_EXPR})`;
      break;
  }

  // Generate group by section
  let groupByAttrs = [];
  if (groupByKey && groupByKey !== ALL) {
    groupByAttrs.push(groupByKey);
  }

  const groupBy = groupByAttrs.length ? `by(${groupByAttrs.join(', ')})` : '';

  return `{${filters}} | ${metricFn} ${groupBy}${sample}`;
}

export function getQuerySample(model: SceneObject): string {
  const traceExploration = getTraceExplorationScene(model);
  return traceExploration?.state?.embeddedMini ? ' with(span_sample=0.1)' : ' with(sample=true)';
}

export function getMetricsTempoQuery(options: QueryOptions) {
  return {
    refId: 'A',
    query: generateMetricsQuery(options),
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}
