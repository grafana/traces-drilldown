import { AdHocVariableFilter } from '@grafana/data';

/**
 * Escapes a value for use inside TraceQL double-quoted string literals.
 * Raw newlines (and tabs/CR) break parsing with "literal not terminated"; they must be written as \\n etc.
 */
export function escapeTraceQlStringLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

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
      val = `"${escapeTraceQlStringLiteral(val)}"`;
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
