import { VAR_FILTERS_EXPR } from 'utils/shared';

export function buildExceptionsQuery() {
  return {
    refId: 'A',
    query: `{${VAR_FILTERS_EXPR} && status = error} | select(resource.service.name, event.exception.message, event.exception.type) with(most_recent=true)`,
    queryType: 'traceql',
    tableType: 'spans',
    limit: 300,
    spss: 10,
    filters: [],
  };
}
