import { LogsStrategyId, TraceLogsContext } from './types';

/**
 * Escape a value so it is safe inside a LogQL double quoted label matcher.
 */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escape a value so it is matched literally inside a LogQL regex matcher.
 */
export function escapeRegexValue(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

/** Build a `a|b|c` alternation of literal service names. */
function serviceAlternation(serviceNames: string[]): string {
  return serviceNames.map(escapeRegexValue).join('|');
}

/**
 * Subset of the Tempo data source `tracesToLogsV2` json data that we know how to write.
 * Mirrors `TraceToLogsOptionsV2` in `@grafana/o11y-ds-frontend`, which plugins cannot import.
 */
export interface TraceToLogsConfig {
  datasourceUid?: string;
  tags?: Array<{ key: string; value?: string }>;
  filterByTraceID?: boolean;
  filterBySpanID?: boolean;
  query?: string;
  customQuery: boolean;
}

export interface LogsStrategy {
  id: LogsStrategyId;
  /**
   * Concrete, fully interpolated query for the whole trace. Used both to probe whether this shape
   * returns anything and as the query behind the "Logs for this trace" action.
   */
  buildTraceExpr(ctx: TraceLogsContext): string;
  /**
   * Query for a single span row. Scoped to the span's service and filtered to the trace, which is
   * what https://github.com/grafana/traces-drilldown/issues/779 asks for.
   *
   * `${__data.fields.serviceName}` is interpolated per row by Grafana. Like core's trace-to-logs
   * custom queries, the interpolated value is not escaped, so a service name containing a quote
   * produces a broken query. Service names with quotes are not something we have seen in practice.
   */
  buildSpanExpr(traceId: string): string;
  /**
   * Equivalent configuration to persist on the Tempo data source, so an admin can promote a
   * detected shape into the authoritative, org wide one.
   */
  toTraceToLogsConfig(datasourceUid: string): TraceToLogsConfig;
}

/**
 * Loki data source label that carries the OTel service name. `service.name` is `job` in Mimir and
 * `service_name` in Loki, the same discrepancy metrics-drilldown maps in its logs connector.
 */
const SERVICE_NAME_LABEL = 'service_name';

const otelStructuredMetadata: LogsStrategy = {
  id: 'otel-structured-metadata',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(serviceNames)}"} | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} | trace_id="${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/**
 * Structured logs keyed by `service_name`, with the trace id inside the line rather than promoted
 * to structured metadata. Common wherever an application writes json or logfmt itself and the
 * collector only attaches resource labels, for example:
 *
 *   {"message":"order placed","span_id":"a9ba...","trace_id":"5cfd..."}
 *
 * Both parsers are applied because the encoding varies by service; whichever one fails sets
 * `__error__`, which is dropped before the filter so the other parser's fields still apply.
 */
const serviceParsed: LogsStrategy = {
  id: 'service-parsed',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(
      serviceNames
    )}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(
      traceId
    )}"`,
  // Core's `filterByTraceID` matches the trace id anywhere in the line as well as on a parsed
  // label, so it covers this shape without needing a custom query.
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/**
 * Logs shipped through the Grafana Cloud OTLP gateway in the legacy JSON format, where the trace id
 * lands in a `traceid` json field and the stream is keyed by `exporter` and `job`. `job` is
 * `namespace/name` when the service declares a namespace, hence the optional prefix.
 */
const otlpGatewayJson: LogsStrategy = {
  id: 'otlp-gateway-json',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{exporter="OTLP", job=~"(.*/)?(${serviceAlternation(serviceNames)})"} | json | traceid="${escapeLabelValue(
      traceId
    )}"`,
  buildSpanExpr: (traceId) =>
    `{exporter="OTLP", job=~"(.*/)?\${__data.fields.serviceName}"} | json | traceid="${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: true,
    filterByTraceID: false,
    tags: [{ key: 'service.name', value: 'job' }],
    query: '{exporter="OTLP", ${__tags}} | json | traceid="${__span.traceId}"',
  }),
};

/**
 * Logs keyed by a `job` label with the trace id inside the line, either logfmt or json encoded.
 */
const jobParsed: LogsStrategy = {
  id: 'job-parsed',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{job=~"(.*/)?(${serviceAlternation(
      serviceNames
    )})"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{job=~"(.*/)?\${__data.fields.serviceName}"} | logfmt | json | drop __error__, __error_details__ | trace_id="${escapeLabelValue(
      traceId
    )}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: true,
    filterByTraceID: false,
    tags: [{ key: 'service.name', value: 'job' }],
    query: '{${__tags}} | logfmt | json | drop __error__, __error_details__ | trace_id="${__span.traceId}"',
  }),
};

/**
 * Last resort: the trace id appears somewhere in the log line but is neither structured metadata
 * nor a parseable field. Core's `filterByTraceID` does the same thing via `label_format contains`.
 */
const lineContains: LogsStrategy = {
  id: 'line-contains',
  buildTraceExpr: ({ traceId, serviceNames }) =>
    `{${SERVICE_NAME_LABEL}=~"${serviceAlternation(serviceNames)}"} |= "${escapeLabelValue(traceId)}"`,
  buildSpanExpr: (traceId) =>
    `{${SERVICE_NAME_LABEL}="\${__data.fields.serviceName}"} |= "${escapeLabelValue(traceId)}"`,
  toTraceToLogsConfig: (datasourceUid) => ({
    datasourceUid,
    customQuery: false,
    filterByTraceID: true,
    tags: [{ key: 'service.name', value: SERVICE_NAME_LABEL }],
  }),
};

/**
 * Probed in order. The first shape that returns log lines wins, so cheaper and more specific
 * shapes come first and the broad line scan comes last.
 */
export const LOGS_STRATEGIES: LogsStrategy[] = [
  otelStructuredMetadata,
  serviceParsed,
  otlpGatewayJson,
  jobParsed,
  lineContains,
];

export function getStrategy(id: LogsStrategyId): LogsStrategy | undefined {
  return LOGS_STRATEGIES.find((strategy) => strategy.id === id);
}
