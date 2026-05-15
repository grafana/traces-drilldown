import type { DataFrame } from '@grafana/data';

import { ALL, MetricFunction, VAR_FILTERS_EXPR, VAR_DURATION_PERCENTILES_EXPR } from '../../../utils/shared';
import { formatLabelValue, getLabelValue } from '../../../utils/utils';

interface QueryOptions {
  metric: MetricFunction;
  extraFilters?: string;
  groupByKey?: string;
  sample?: boolean;
  /**
   * When grouping without pinning a value, TraceQL needs `key != nil` so spans missing that attribute are excluded.
   * When extraFilters already fixes the attribute (e.g. `key=value`), that predicate is redundant — set to false.
   */
  appendGroupByNilGuard?: boolean;
}

export function generateMetricsQuery({
  metric,
  groupByKey,
  extraFilters,
  sample = false,
  appendGroupByNilGuard = true,
}: QueryOptions) {
  // Generate span set filters
  let filters = `${VAR_FILTERS_EXPR}`;

  if (metric === 'errors') {
    filters += ' && status=error';
  }

  if (extraFilters) {
    filters += ` && ${extraFilters}`;
  }

  if (groupByKey && groupByKey !== ALL && appendGroupByNilGuard) {
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

  const sampleStr = sample ? ' with(sample=true)' : '';

  return `{${filters}} | ${metricFn} ${groupBy}${sampleStr}`;
}

/** TraceQL metrics query for one breakdown tile (group-by attribute + series value), or aggregate when group-by is unset / All. */
export function generateMetricsQueryForBreakdownTile(
  metric: MetricFunction,
  groupByAttribute: string,
  frame: DataFrame
): string {
  if (groupByAttribute && groupByAttribute !== ALL) {
    return generateMetricsQuery({
      metric,
      groupByKey: groupByAttribute,
      extraFilters: `${groupByAttribute}=${formatLabelValue(getLabelValue(frame, groupByAttribute))}`,
      appendGroupByNilGuard: false,
    });
  }
  return generateMetricsQuery({ metric });
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
