import { ALL, MetricFunction, VAR_FILTERS_EXPR } from '../../../utils/shared';

interface QueryOptions {
  metric: MetricFunction;
  extraFilters?: string;
  groupByKey?: string;
  sample?: boolean;
}

export function generateMetricsQuery({ metric, groupByKey, extraFilters, sample = false}: QueryOptions) {
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
      metricFn = 'quantile_over_time(duration, 0.9)';
      break;
  }

  // Generate group by section
  let groupByAttrs = [];
  if (groupByKey && groupByKey !== ALL) {
    groupByAttrs.push(groupByKey);
  }

  const groupBy = groupByAttrs.length ? `by(${groupByAttrs.join(', ')})` : '';

  const sampleStr = sample ? 'with(sample=true)' : '';

  return `{${filters}} | ${metricFn} ${groupBy} ${sampleStr}`;
}

export function metricByWithStatus(metric: MetricFunction, tagKey?: string, sample = false) {
  return {
    refId: 'A',
    query: generateMetricsQuery({ metric, groupByKey: tagKey, sample}),
    queryType: 'traceql',
    tableType: 'spans',
    limit: 100,
    spss: 10,
    filters: [],
  };
}
