import { VAR_FILTERS_EXPR } from '../../../utils/shared';

export function buildHistogramQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR}} | histogram_over_time(duration) with(sample=true)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 1000,
    spss: 10,
    filters: [],
  };
}
