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

// TraceQL combinator between rendered ad-hoc predicates (AND inside `{...}` vs OR group for embedded matchers).
export type TraceQLAdHocJoin = '&&' | '||';

/**
 * Renders complete ad-hoc filters as TraceQL predicates joined with `joinWith`.
 * Returns `'true'` when there are no usable filters (avoids invalid fragments like `{ && ... }`).
 */
export function renderTraceQLAdHocFilters(filters: AdHocVariableFilter[], joinWith: TraceQLAdHocJoin): string {
  const expr = filters
    .filter((f) => f.key && f.operator && f.value)
    .map((filter) => renderFilter(filter))
    .join(joinWith);
  return expr.length ? expr : 'true';
}

export function renderTraceQLLabelFilters(filters: AdHocVariableFilter[]) {
  return renderTraceQLAdHocFilters(filters, '&&');
}

/**
 * Renders static OR filters for embedded mode: each filter is combined with `||`, wrapped in parentheses, then ` && `.
 */
export function renderTraceQLOrFilterPrefix(initialOrFilters?: AdHocVariableFilter[]): string {
  if (!initialOrFilters?.length) {
    return '';
  }
  const inner = renderTraceQLAdHocFilters(initialOrFilters, '||');
  return inner === 'true' ? '' : `(${inner}) && `;
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
