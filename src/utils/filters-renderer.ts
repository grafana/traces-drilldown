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
  if (
    ['span.messaging.destination.partition.id', 'span.network.protocol.version'].includes(filter.key) ||
    (!isNumber(val) &&
      ![
        'status',
        'kind',
        'span:status',
        'span:kind',
        'duration',
        'span:duration',
        'trace:duration',
        'event:timeSinceStart',
      ].includes(filter.key) &&
      !['true', 'false'].includes(val)) &&
      !isQuotedNumericString(val)
  ) {
    if (typeof val === 'string') {
      // Escape " and \ to \" and \\ respectively
      val = val.replace(/["\\]/g, (s) => `\\${s}`);
      val = `"${val}"`;
    }
  }

  return `${filter.key}${filter.operator}${val}`;
}

function isNumber(value?: string | number): boolean {
  return value != null && value !== '' && !isNaN(Number(value.toString().trim()));
}

function isQuotedNumericString(value: string): boolean {
  return typeof value === 'string' && value.length >= 2 && isNumber(value.slice(1, -1)) && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
}
