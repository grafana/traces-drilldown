import { AdHocVariableFilter } from '@grafana/data';

export function renderTraceQLLabelFilters(filters: AdHocVariableFilter[]) {
  const expr = filters
    .filter((f) => f.key && f.operator && f.value)
    .map((filter) => renderFilter(filter))
    .join('&&');
  // Return 'true' if there are no filters to help with cases where we want to concatenate additional filters in the expression
  // and avoid invalid queries like '{ && key=value }'
  return expr.length ? expr : 'true';
}

function renderFilter(filter: AdHocVariableFilter) {
  let val = filter.value;
  if (typeof val !== 'number' && !['status', 'kind'].includes(filter.key)) {
    // Add quotes if it's coming from the filter input and it's not already quoted.
    // Adding a filter from a time series graph already has quotes. This should be handled better.
    if (typeof val === 'string' && !val.startsWith('"') && !val.endsWith('"')) {
      val = `"${val}"`;
    }
  }

  return `${filter.key}${filter.operator}${val}`;
}
